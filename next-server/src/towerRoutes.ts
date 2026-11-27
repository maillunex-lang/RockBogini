/** NEXT-021.1 tower: source-driven, server-settled PvE with idempotent rewards. */
import type {FastifyInstance} from 'fastify';
import type {PoolClient} from 'pg';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {buildUnit} from './battleUnits.js';
import {towerAttackers,savedTowerFormations,towerFormationSid,towerElementRoot,checkTowerRoster} from './towerFormation.js';
import {getHeroes} from './heroes.js';
import {formations} from './formationConfig.js';
import {reportHeroes} from './battle/reportHeroes.js';
import {simulate,type Fighter} from './battle/simulation.js';
import {battleRandom} from './battle/random.js';
import {randomInt,randomUUID} from 'node:crypto';
import {towerTypes,towerType,towerFloor,towerDefenders,towerOpen,towerWeekday,towerRewards,normalTower,hardTower,TOWER_MAX_DAILY_BATTLES} from './towerConfig.js';

async function auth(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}
type TowerRow={tower_type:number;map_index:number;extra_reward_index:number;daily_reward_index:number;daily_claimed:boolean;day:string|Date;battle_count:number;extra_count:number};
const tokyoDay=(now=new Date())=>new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
async function towerRow(c:PoolClient,id:string,type:number):Promise<TowerRow>{
 await c.query(`INSERT INTO tower_progress(account_id,tower_type,day) VALUES($1,$2,$3)
  ON CONFLICT(account_id,tower_type) DO NOTHING`,[id,type,tokyoDay()]);
 const row=(await c.query('SELECT * FROM tower_progress WHERE account_id=$1 AND tower_type=$2 FOR UPDATE',[id,type])).rows[0] as TowerRow;
 if((row.day instanceof Date?row.day.toISOString().slice(0,10):String(row.day).slice(0,10))!==tokyoDay()){
  const reset=(await c.query(`UPDATE tower_progress
   SET daily_reward_index=map_index,daily_claimed=false,battle_count=0,day=$3
   WHERE account_id=$1 AND tower_type=$2 RETURNING *`,[id,type,tokyoDay()])).rows[0];
  return reset;
 }
 return row;
}
async function grant(c:PoolClient,id:string,rows:readonly (readonly number[])[]){
 for(const [item,count] of towerRewards(rows as number[][])){
  await c.query(`INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,[id,item,count]);
 }
}
const uuidPattern='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
export async function towerRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/tower',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const towers=[];
   for(const cfg of Object.values(towerTypes).sort((a,b)=>a.id-b.id)){
    const row=await towerRow(c,id,cfg.id);
    const next=towerFloor(cfg.id,row.map_index+1);
    towers.push({type:cfg.id,mapIndex:row.map_index,maxCount:cfg.maxCount,open:towerOpen(cfg.id),
     nextMapId:next?.mapId??null,nextFloor:next?.floor??null,nextMap:next?{bg:next.map.bg,battlePower:next.map.battlePower,heroIds:next.map.heroes.map(x=>x[1])}:null,
     extraRewardIndex:row.extra_reward_index,dailyRewardIndex:row.daily_reward_index,
     dailyClaimed:row.daily_claimed,battleCount:row.battle_count,extraCount:row.extra_count,
     maxDailyBattles:TOWER_MAX_DAILY_BATTLES,available:!cfg.openTime.length||row.battle_count<TOWER_MAX_DAILY_BATTLES+row.extra_count});
   }
   await c.query('COMMIT');
   return {towers,weekday:towerWeekday()};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get('/v1/tower/formations',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const [rosters,heroes]=await Promise.all([savedTowerFormations(s,id),getHeroes(s,id)]);
  return {rosters,sids:[141,142,143,144,145],formations,
   heroOptions:heroes.map(h=>({sid:h.Sid,heroId:h.HeroId,power:h.Power}))};
 });
 app.put<{Body:{type:number;formationType:number;heroIds:number[]}}>('/v1/tower/formation',{
  schema:{body:{type:'object',required:['type','formationType','heroIds'],additionalProperties:false,
   properties:{type:{type:'integer',enum:[1,2,3,4,5,101,102,103,104,105]},
    formationType:{type:'integer',enum:[101,102,103,104,105,106]},
    heroIds:{type:'array',minItems:6,maxItems:6,items:{type:'integer',minimum:0,maximum:2147483647}}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const {type,formationType,heroIds}=req.body;
  if(!checkTowerRoster(heroIds,formationType))return reply.code(400).send({error:'invalid_tower_formation'});
  const root=towerElementRoot(type),sid=towerFormationSid(type);
  if(sid===null||sid===1)return reply.code(400).send({error:'invalid_tower_type'});
  await getHeroes(s,id);await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const pending=(await c.query('SELECT battle_id FROM tower_pending WHERE account_id=$1',[id])).rows[0];
   if(pending){await c.query('ROLLBACK');return reply.code(409).send({error:'tower_battle_pending'})}
   const used=heroIds.filter(x=>x>0);
   const owned=(await c.query('SELECT sid FROM player_heroes WHERE account_id=$1 AND sid=ANY($2::integer[])',[id,used])).rows;
   if(owned.length!==used.length){await c.query('ROLLBACK');return reply.code(409).send({error:'hero_not_owned'})}
   await c.query(`INSERT INTO tower_formations(account_id,tower_type,formation_type,hero_ids)
    VALUES($1,$2,$3,$4) ON CONFLICT(account_id,tower_type)
    DO UPDATE SET formation_type=EXCLUDED.formation_type,hero_ids=EXCLUDED.hero_ids`,
    [id,root,formationType,heroIds]);
   await c.query('COMMIT');
   return {type:root,sid,formationType,heroIds};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{type:number;mapIndex:number}}>('/v1/tower/challenge',{
  schema:{body:{type:'object',required:['type','mapIndex'],additionalProperties:false,properties:{
   type:{type:'integer'},mapIndex:{type:'integer',minimum:1},
  }}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const {type,mapIndex}=req.body,cfg=towerType(type),floor=towerFloor(type,mapIndex);
  if(!cfg||!floor)return reply.code(404).send({error:'tower_floor_not_found'});
  await getProfile(s,id);
  let attackers:Awaited<ReturnType<typeof towerAttackers>>;
  try{attackers=await towerAttackers(s,id,type)}catch(e){
   if(e instanceof Error&&['empty_formation','empty_tower_formation','invalid_formation','invalid_tower_formation','hero_not_owned','hero_attributes_pending'].includes(e.message))
    return reply.code(409).send({error:e.message});
   throw e;
  }
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await towerRow(c,id,type);
   if(mapIndex!==row.map_index+1){await c.query('ROLLBACK');return reply.code(409).send({error:'not_next_floor'})}
   if(!towerOpen(type)){await c.query('ROLLBACK');return reply.code(409).send({error:'tower_closed'})}
   if(cfg.openTime.length&&row.battle_count>=TOWER_MAX_DAILY_BATTLES+row.extra_count){
    await c.query('ROLLBACK');return reply.code(409).send({error:'tower_daily_limit'});
   }
   const defenders=towerDefenders(type,mapIndex);
   if(!defenders){await c.query('ROLLBACK');return reply.code(503).send({error:'tower_battle_data_unavailable'})}
   const units:Fighter[]=[...attackers.map(x=>({...x,camp:1 as const,is_boss:0,hurt:0,damage:0,cure:0,buffs:[]} as Fighter)),...defenders];
   const seed=randomInt(1,2147483647),battle=simulate(units,battleRandom(seed),15);
   const report={version:1,mode:'tower',type,mapIndex,battleId:randomUUID(),mapId:floor.mapId,background:floor.map.bg,
    heroes:reportHeroes(units,battle.units),seed,maxRounds:15,preview:false,progressionApplied:false,
    initialUnits:units,summary:battle.summary,pages:battle.pages,
    finalPage:{dataType:99,round:battle.rounds,battleResult:battle.summary.resultCode,heroStatus:battle.summary.heroes},
    issues:battle.issues,parityReady:battle.parityReady};
   await c.query(`UPDATE tower_battles SET report=jsonb_build_object('archived',true)
    WHERE id=(SELECT battle_id FROM tower_pending WHERE account_id=$1) AND account_id=$1 AND settlement IS NULL`,[id]);
   await c.query('INSERT INTO tower_battles(id,account_id,tower_type,map_index,map_id,report) VALUES($1,$2,$3,$4,$5,$6)',
    [report.battleId,id,type,mapIndex,floor.mapId,JSON.stringify(report)]);
   await c.query(`INSERT INTO tower_pending(account_id,battle_id) VALUES($1,$2)
    ON CONFLICT(account_id) DO UPDATE SET battle_id=EXCLUDED.battle_id`,[id,report.battleId]);
   await c.query('COMMIT');
   return report;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get('/v1/tower/pending',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const row=(await s.pg.query(`SELECT b.report FROM tower_pending p
   JOIN tower_battles b ON b.id=p.battle_id AND b.account_id=p.account_id WHERE p.account_id=$1`,[id])).rows[0];
  return {report:row?.report??null};
 });
 app.post<{Body:{battleId:string}}>('/v1/tower/settle',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const profile=(await c.query('SELECT level FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   if(!profile){await c.query('ROLLBACK');return reply.code(404).send({error:'profile_not_found'})}
   const b=(await c.query('SELECT * FROM tower_battles WHERE id=$1 AND account_id=$2 FOR UPDATE',[req.body.battleId,id])).rows[0];
   if(!b){await c.query('ROLLBACK');return reply.code(404).send({error:'battle_not_found'})}
   if(b.settlement){await c.query('COMMIT');return b.settlement}
   const pending=(await c.query('SELECT battle_id FROM tower_pending WHERE account_id=$1',[id])).rows[0];
   if(pending?.battle_id!==b.id){await c.query('ROLLBACK');return reply.code(409).send({error:'battle_expired'})}
   const row=await towerRow(c,id,b.tower_type);
   const win=b.report?.summary?.resultCode===2&&b.map_index===row.map_index+1;
   const floor=towerFloor(b.tower_type,b.map_index);
   if(!floor){await c.query('ROLLBACK');return reply.code(503).send({error:'tower_floor_not_found'})}
   let rewards:[number,number][]=[];
   if(win){
    rewards=towerRewards(floor.floor.firstClearRewards);
    await grant(c,id,rewards);
    await c.query(`UPDATE tower_progress SET map_index=$3,
     battle_count=battle_count+$4 WHERE account_id=$1 AND tower_type=$2`,
     [id,b.tower_type,b.map_index,towerType(b.tower_type)!.openTime.length?1:0]);
   }
   const result={battleId:b.id,mapId:b.map_id,type:b.tower_type,mapIndex:b.map_index,
    result:win?1:0,rewards,playerLevel:profile.level};
   await c.query('UPDATE tower_battles SET settlement=$2,report=$3 WHERE id=$1',[b.id,JSON.stringify(result),JSON.stringify({archived:true})]);
   await c.query('DELETE FROM tower_pending WHERE account_id=$1',[id]);
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{battleId:string}}>('/v1/tower/cancel',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await c.query('DELETE FROM tower_pending WHERE account_id=$1 AND battle_id=$2 RETURNING battle_id',[id,req.body.battleId]);
   if(row.rowCount)await c.query(`UPDATE tower_battles SET report=jsonb_build_object('archived',true)
    WHERE id=$1 AND account_id=$2 AND settlement IS NULL`,[req.body.battleId,id]);
   await c.query('COMMIT');return {cancelled:row.rowCount===1};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{type:number}}>('/v1/tower/daily',{
  schema:{body:{type:'object',required:['type'],additionalProperties:false,properties:{type:{type:'integer',enum:[99,199]}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await towerRow(c,id,req.body.type);
   if(row.daily_claimed){await c.query('ROLLBACK');return reply.code(409).send({error:'daily_already_claimed'})}
   const floor=towerFloor(req.body.type,Math.max(1,row.daily_reward_index));
   if(!floor){await c.query('ROLLBACK');return reply.code(404).send({error:'tower_floor_not_found'})}
   const rewards=towerRewards(floor.floor.dailyRewards);
   await grant(c,id,rewards);
   await c.query('UPDATE tower_progress SET daily_claimed=true WHERE account_id=$1 AND tower_type=$2',[id,req.body.type]);
   await c.query('COMMIT');return {type:req.body.type,index:Math.max(1,row.daily_reward_index),rewards};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{type:number;mapIndex:number}}>('/v1/tower/extra',{
  schema:{body:{type:'object',required:['type','mapIndex'],additionalProperties:false,properties:{type:{type:'integer'},mapIndex:{type:'integer',minimum:1}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const cfg=towerType(req.body.type);
  if(!cfg)return reply.code(404).send({error:'tower_not_found'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await towerRow(c,id,req.body.type);
   const upto=Math.min(req.body.mapIndex,row.map_index);
   if(upto<=row.extra_reward_index){await c.query('ROLLBACK');return reply.code(409).send({error:'extra_already_claimed'})}
   const rewards=towerRewards(Array.from({length:Math.max(0,Math.min(upto,cfg.maxRewardCount)-row.extra_reward_index)},
    (_,i)=>towerFloor(cfg.id,row.extra_reward_index+i+1)?.floor.extraRewards??[]).flat());
   await grant(c,id,rewards);
   await c.query('UPDATE tower_progress SET extra_reward_index=$3 WHERE account_id=$1 AND tower_type=$2',[id,req.body.type,upto]);
   await c.query('COMMIT');return {type:req.body.type,mapIndex:upto,rewards};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{type:number;from:number;to:number}}>('/v1/tower/quick',{
  schema:{body:{type:'object',required:['type','from','to'],additionalProperties:false,properties:{
   type:{type:'integer',enum:[99,199]},from:{type:'integer',minimum:1},to:{type:'integer',minimum:1},
  }}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const cfg=towerType(req.body.type),target=towerFloor(req.body.type,req.body.to);
  if(!cfg||!target)return reply.code(404).send({error:'tower_floor_not_found'});
  if(req.body.to<req.body.from||req.body.to-req.body.from>99)return reply.code(400).send({error:'invalid_quick_range'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const profile=(await c.query('SELECT power FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   if(!profile){await c.query('ROLLBACK');return reply.code(404).send({error:'profile_not_found'})}
   const row=await towerRow(c,id,req.body.type);
   if(req.body.from!==row.map_index+1){await c.query('ROLLBACK');return reply.code(409).send({error:'not_next_floor'})}
   if(Number(profile.power)<=target.floor.quickBattlePower){
    await c.query('ROLLBACK');return reply.code(409).send({error:'quick_power_low',required:target.floor.quickBattlePower});
   }
   const floors=Array.from({length:req.body.to-req.body.from+1},(_,i)=>towerFloor(cfg.id,req.body.from+i));
   if(floors.some(x=>!x)){await c.query('ROLLBACK');return reply.code(404).send({error:'tower_floor_not_found'})}
   const rewards=towerRewards(floors.flatMap(x=>x!.floor.firstClearRewards));
   await grant(c,id,rewards);
   await c.query('UPDATE tower_progress SET map_index=$3 WHERE account_id=$1 AND tower_type=$2',
    [id,cfg.id,req.body.to]);
   await c.query('COMMIT');return {type:cfg.id,from:req.body.from,to:req.body.to,rewards};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
}
