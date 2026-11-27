/** NEXT-021.2: server-authoritative daily dungeons with source rewards and atomic sweeps. */
import type {FastifyInstance} from 'fastify';
import type {PoolClient} from 'pg';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {prepareSquad,buildUnit} from './battleUnits.js';
import {reportHeroes} from './battle/reportHeroes.js';
import {simulate,type Fighter} from './battle/simulation.js';
import {battleRandom} from './battle/random.js';
import {randomInt,randomUUID} from 'node:crypto';
import {dailyInstanceTypes,instanceType,instanceStage,dailyInstanceDefenders,dailyRewards,dailyDay,FREE_DAILY,PAID_DAILY} from './dailyInstanceConfig.js';
import {taskEvent} from './tasks.js';

type Progress={instance_type:number;cleared_map_id:number;day:Date|string;free_battle_count:number;paid_battle_count:number};
const uidPattern='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
async function auth(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}
async function progress(c:PoolClient,id:string,type:number):Promise<Progress>{
 await c.query(`INSERT INTO daily_instance_progress(account_id,instance_type,day) VALUES($1,$2,$3)
  ON CONFLICT(account_id,instance_type) DO NOTHING`,[id,type,dailyDay()]);
 let row=(await c.query('SELECT * FROM daily_instance_progress WHERE account_id=$1 AND instance_type=$2 FOR UPDATE',[id,type])).rows[0] as Progress;
 const last=row.day instanceof Date?row.day.toISOString().slice(0,10):String(row.day).slice(0,10);
 if(last!==dailyDay()){
  row=(await c.query(`UPDATE daily_instance_progress
   SET day=$3,free_battle_count=0,paid_battle_count=0 WHERE account_id=$1 AND instance_type=$2 RETURNING *`,
   [id,type,dailyDay()])).rows[0];
 }
 return row;
}
async function grant(c:PoolClient,id:string,rewards:readonly (readonly number[])[]){
 for(const [item,count] of rewards){
  if(!Number.isSafeInteger(item)||!Number.isSafeInteger(count)||item<1||count<=0)continue;
  await c.query(`INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,[id,item,count]);
 }
}
export async function dailyInstanceRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/daily-instance',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const profile=await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const instances=[];
   for(const cfg of Object.values(dailyInstanceTypes).sort((a,b)=>a.id-b.id)){
    const row=await progress(c,id,cfg.id);
    const index=cfg.maps.indexOf(row.cleared_map_id);
    const cleared=index+1;
    const next=cfg.maps[cleared]??null;
    const nextCfg=next?instanceStage(cfg.id,next):null;
    const clearedCfg=row.cleared_map_id?instanceStage(cfg.id,row.cleared_map_id):null;
    instances.push({type:cfg.id,maps:cfg.maps,clearedMapId:row.cleared_map_id,clearedCount:cleared,
     nextMapId:next,nextMap:nextCfg?{requirePower:nextCfg.stage.requirePower,
      battlePower:nextCfg.map.battlePower,bg:nextCfg.map.bg,heroIds:nextCfg.map.heroes.map(x=>x[1]),
      rewards:dailyRewards(cfg.id,next!)}:null,
     freeLeft:Math.max(FREE_DAILY-row.free_battle_count,0),paidLeft:Math.max(PAID_DAILY-row.paid_battle_count,0),
     battlePrice:cfg.battlePrice,clearedRewards:clearedCfg?dailyRewards(cfg.id,row.cleared_map_id):[],
     canChallenge:!!next&&Number(profile.power)>=Number(nextCfg!.stage.requirePower)});
   }
   await c.query('COMMIT');return {instances,day:dailyDay(),freeMax:FREE_DAILY,paidMax:PAID_DAILY};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{type:number;mapId:number}}>('/v1/daily-instance/challenge',{
  schema:{body:{type:'object',required:['type','mapId'],additionalProperties:false,properties:{type:{type:'integer',minimum:1,maximum:5},mapId:{type:'integer',minimum:1}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const {type,mapId}=req.body,cfg=instanceType(type),stage=instanceStage(type,mapId);
  if(!cfg||!stage)return reply.code(404).send({error:'daily_map_not_found'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const profile=(await c.query('SELECT power FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   const row=await progress(c,id,type);
   // Original gate: stage index <= cleared count, so replaying a cleared stage is allowed.
   const cleared=cfg.maps.indexOf(row.cleared_map_id)+1;
   if(stage.index>cleared){await c.query('ROLLBACK');return reply.code(409).send({error:'daily_stage_locked'})}
   if(Number(profile.power)<stage.stage.requirePower){
    await c.query('ROLLBACK');return reply.code(409).send({error:'daily_power_low',required:stage.stage.requirePower});
   }
   let attackers:Awaited<ReturnType<typeof prepareSquad>>;
   try{attackers=await prepareSquad(s,id)}catch(e){
    if(e instanceof Error&&['empty_formation','invalid_formation','hero_attributes_pending','hero_not_owned'].includes(e.message)){
     await c.query('ROLLBACK');return reply.code(409).send({error:e.message});
    }throw e;
   }
   const defenders=dailyInstanceDefenders(type,mapId);
   if(!defenders){await c.query('ROLLBACK');return reply.code(503).send({error:'daily_battle_data_unavailable'})}
   const units:Fighter[]=[...attackers.map((x:ReturnType<typeof buildUnit>)=>({...x,camp:1 as const,is_boss:0,hurt:0,damage:0,cure:0,buffs:[]} as Fighter)),...defenders];
   const seed=randomInt(1,2147483647),battle=simulate(units,battleRandom(seed),15);
   const report={version:1,mode:'daily-instance',type,mapId,battleId:randomUUID(),
    background:stage.map.bg,seed,maxRounds:15,preview:false,progressionApplied:false,
    heroes:reportHeroes(units,battle.units),initialUnits:units,summary:battle.summary,pages:battle.pages,
    finalPage:{dataType:99,round:battle.rounds,battleResult:battle.summary.resultCode,heroStatus:battle.summary.heroes},
    issues:battle.issues,parityReady:battle.parityReady};
   await c.query(`UPDATE daily_instance_battles SET report=jsonb_build_object('archived',true)
    WHERE id=(SELECT battle_id FROM daily_instance_pending WHERE account_id=$1) AND account_id=$1 AND settlement IS NULL`,[id]);
   await c.query('INSERT INTO daily_instance_battles(id,account_id,instance_type,map_id,report) VALUES($1,$2,$3,$4,$5)',
    [report.battleId,id,type,mapId,JSON.stringify(report)]);
   await c.query(`INSERT INTO daily_instance_pending(account_id,battle_id) VALUES($1,$2)
    ON CONFLICT(account_id) DO UPDATE SET battle_id=EXCLUDED.battle_id`,[id,report.battleId]);
   await c.query('COMMIT');return report;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get('/v1/daily-instance/pending',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const row=(await s.pg.query(`SELECT b.report FROM daily_instance_pending p JOIN daily_instance_battles b
   ON b.id=p.battle_id AND b.account_id=p.account_id WHERE p.account_id=$1`,[id])).rows[0];
  return {report:row?.report??null};
 });
 app.post<{Body:{battleId:string}}>('/v1/daily-instance/settle',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uidPattern}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const profile=(await c.query('SELECT level FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   if(!profile){await c.query('ROLLBACK');return reply.code(404).send({error:'profile_not_found'})}
   const b=(await c.query('SELECT * FROM daily_instance_battles WHERE id=$1 AND account_id=$2 FOR UPDATE',[req.body.battleId,id])).rows[0];
   if(!b){await c.query('ROLLBACK');return reply.code(404).send({error:'battle_not_found'})}
   if(b.settlement){await c.query('COMMIT');return b.settlement}
   const pending=(await c.query('SELECT battle_id FROM daily_instance_pending WHERE account_id=$1',[id])).rows[0];
   if(pending?.battle_id!==b.id){await c.query('ROLLBACK');return reply.code(409).send({error:'battle_expired'})}
   const row=await progress(c,id,b.instance_type);
   const cfg=instanceType(b.instance_type),stage=instanceStage(b.instance_type,b.map_id);
   if(!cfg||!stage){await c.query('ROLLBACK');return reply.code(503).send({error:'daily_map_not_found'})}
   const cleared=cfg.maps.indexOf(row.cleared_map_id)+1;
   const win=b.report?.summary?.resultCode===2&&stage.index<=cleared;
   let rewards:[number,number][]=[];
   if(win){
    rewards=dailyRewards(b.instance_type,b.map_id);
    await grant(c,id,rewards);
    if(stage.index===cleared)await c.query('UPDATE daily_instance_progress SET cleared_map_id=$3 WHERE account_id=$1 AND instance_type=$2',
     [id,b.instance_type,b.map_id]);
   }
   const settlement={battleId:b.id,mapId:b.map_id,type:b.instance_type,result:win?1:0,rewards,playerLevel:profile.level};
   await c.query('UPDATE daily_instance_battles SET settlement=$2,report=$3 WHERE id=$1',
    [b.id,JSON.stringify(settlement),JSON.stringify({archived:true})]);
   await c.query('DELETE FROM daily_instance_pending WHERE account_id=$1',[id]);
   await c.query('COMMIT');return settlement;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{battleId:string}}>('/v1/daily-instance/cancel',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uidPattern}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await c.query('DELETE FROM daily_instance_pending WHERE account_id=$1 AND battle_id=$2 RETURNING battle_id',[id,req.body.battleId]);
   if(row.rowCount)await c.query(`UPDATE daily_instance_battles SET report=jsonb_build_object('archived',true)
    WHERE id=$1 AND account_id=$2 AND settlement IS NULL`,[req.body.battleId,id]);
   await c.query('COMMIT');return {cancelled:row.rowCount===1};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{type:number;mapId:number;count:number}}>('/v1/daily-instance/quick',{
  schema:{body:{type:'object',required:['type','mapId','count'],additionalProperties:false,properties:{
   type:{type:'integer',minimum:1,maximum:5},mapId:{type:'integer',minimum:1},count:{type:'integer',minimum:1,maximum:4},
  }}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const {type,mapId,count}=req.body,cfg=instanceType(type),stage=instanceStage(type,mapId);
  if(!cfg||!stage)return reply.code(404).send({error:'daily_map_not_found'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await progress(c,id,type),cleared=cfg.maps.indexOf(row.cleared_map_id)+1;
   // Strictly less than cleared count: the swept stage must already have been won.
   if(cleared===0||stage.index>=cleared){await c.query('ROLLBACK');return reply.code(409).send({error:'daily_stage_locked'})}
   const free=Math.min(count,Math.max(FREE_DAILY-row.free_battle_count,0)),paid=count-free;
   if(paid>Math.max(PAID_DAILY-row.paid_battle_count,0)){
    await c.query('ROLLBACK');return reply.code(409).send({error:'daily_attempt_limit'});
   }
   if(paid>0){
    const charged=await c.query(`UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3`,
     [id,3,paid*cfg.battlePrice]);
    if(!charged.rowCount){await c.query('ROLLBACK');return reply.code(409).send({error:'insufficient_diamond',cost:paid*cfg.battlePrice})}
   }
   const rewards=dailyRewards(type,mapId,count);
   await grant(c,id,rewards);
   await c.query(`UPDATE daily_instance_progress SET free_battle_count=free_battle_count+$3,
    paid_battle_count=paid_battle_count+$4 WHERE account_id=$1 AND instance_type=$2`,[id,type,free,paid]);
   await taskEvent(c,id,1009,[],count);
   await c.query('COMMIT');return {type,mapId,count,free,paid,diamonds:paid*cfg.battlePrice,rewards};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
}
