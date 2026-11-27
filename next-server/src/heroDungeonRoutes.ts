/** NEXT-021.12: server-authoritative original Hero Dungeon challenge, settlement, sweep. */
import type {FastifyInstance} from 'fastify';
import type {PoolClient} from 'pg';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {getHeroes} from './heroes.js';
import {formations} from './formationConfig.js';
import {dungeonAttackers,dungeonRoster,checkDungeonRoster} from './heroDungeonFormation.js';
import {reportHeroes} from './battle/reportHeroes.js';
import {simulate,type Fighter} from './battle/simulation.js';
import {battleRandom} from './battle/random.js';
import {randomUUID,randomInt} from 'node:crypto';
import {dailyDay} from './dailyInstanceConfig.js';
import {heroDungeonEvent,heroDungeonStage,heroDungeonMap,heroDungeonDefenders,
 heroDungeonWindow,capturedHeroDungeonWindow,heroDungeonBonus,heroDungeonRewards,
 heroDungeonRank,heroDungeonUnitsBonus,HERO_DUNGEON_FORMATION_SID} from './heroDungeonConfig.js';
const uuidPattern='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
async function auth(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}
type Progress={event_id:number;cleared_stage:number;daily_count:number;last_rounds:number;day:Date|string};
async function progress(c:PoolClient,id:string,now:Date):Promise<Progress>{
 const day=dailyDay(now);
 await c.query('INSERT INTO hero_dungeon_progress(account_id,event_id,day) VALUES($1,$2,$3) ON CONFLICT(account_id) DO NOTHING',[id,heroDungeonEvent.id,day]);
 let row=(await c.query('SELECT event_id,cleared_stage,daily_count,last_rounds,day FROM hero_dungeon_progress WHERE account_id=$1 FOR UPDATE',[id])).rows[0] as Progress;
 const last=row.day instanceof Date?row.day.toISOString().slice(0,10):String(row.day).slice(0,10);
 if(last!==day)row=(await c.query('UPDATE hero_dungeon_progress SET day=$2,daily_count=0 WHERE account_id=$1 RETURNING event_id,cleared_stage,daily_count,last_rounds,day',[id,day])).rows[0];
 return row;
}
async function grant(c:PoolClient,id:string,rewards:readonly (readonly number[])[]){
 for(const [item,count] of rewards){
  if(!Number.isSafeInteger(item)||!Number.isSafeInteger(count)||item<1||count<=0)throw Error('invalid_original_dungeon_reward');
  await c.query(`INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,[id,item,count]);
 }
}
async function bonus(c:PoolClient,id:string,ids:number[]){
 const owned=ids.filter(x=>x>0);
 const heroes=(await c.query('SELECT hero_id,star FROM player_heroes WHERE account_id=$1 AND sid=ANY($2::integer[])',[id,owned])).rows as {hero_id:number;star:number}[];
 return heroDungeonBonus(heroes.filter(h=>h.hero_id===heroDungeonEvent.custom.heroId).reduce((n,h)=>Math.max(n,h.star),0));
}
async function formationIds(c:PoolClient,id:string){
 const row=(await c.query('SELECT hero_ids,dungeon_hero_ids FROM player_formations WHERE account_id=$1',[id])).rows[0];
 if(!row)return [];
 const dedicated=(row.dungeon_hero_ids as number[]);
 return dedicated.some(x=>x>0)?dedicated:row.hero_ids as number[];
}
export async function heroDungeonRoutes(app:FastifyInstance,s:Storage,clock:()=>Date=()=>new Date()){
 const window=()=>capturedHeroDungeonWindow(clock());
 app.get('/v1/hero-dungeon',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await progress(c,id,clock()),win=window();
   const ids=await formationIds(c,id);
   const boost=await bonus(c,id,ids);
   const next=heroDungeonStage(row.cleared_stage+1),map=next&&heroDungeonMap(next);
   await c.query('COMMIT');
   return {id:heroDungeonEvent.id,name:heroDungeonEvent.name,window:win,
    clearedStage:row.cleared_stage,attempts:row.daily_count,maxAttempts:heroDungeonEvent.custom.count,
    remainingAttempts:Math.max(0,heroDungeonEvent.custom.count-row.daily_count),
    rank:heroDungeonRank(row.cleared_stage,row.last_rounds),bonus:boost,
    nextStage:next?{...next,bg:map?.bg??'',battlePower:map?.battlePower??0}:null,
    canChallenge:win.open&&!!next&&row.daily_count<heroDungeonEvent.custom.count,
    canQuick:win.open&&row.cleared_stage>0&&row.daily_count<heroDungeonEvent.custom.count};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get('/v1/hero-dungeon/formation',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const [roster,heroes]=await Promise.all([dungeonRoster(s,id),getHeroes(s,id)]);
  return {...roster,sid:HERO_DUNGEON_FORMATION_SID,usesMainFallback:!roster.heroIds.some(x=>x>0),
   layouts:formations.map(f=>({id:f.Id,positions:f.Data})),
   heroOptions:heroes.map(h=>({sid:h.Sid,heroId:h.HeroId,power:h.Power,star:h.StarLevel}))};
 });
 app.put<{Body:{heroIds:number[];formationType:number}}>('/v1/hero-dungeon/formation',{
  schema:{body:{type:'object',required:['heroIds','formationType'],additionalProperties:false,properties:{
   heroIds:{type:'array',minItems:6,maxItems:6,items:{type:'integer',minimum:0,maximum:2147483647}},
   formationType:{type:'integer',enum:[101,102,103,104,105,106]}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const {heroIds,formationType}=req.body;
  if(!checkDungeonRoster(heroIds,formationType))return reply.code(400).send({error:'invalid_dungeon_formation'});
  await getHeroes(s,id);await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const pending=(await c.query('SELECT battle_id FROM hero_dungeon_pending WHERE account_id=$1',[id])).rows[0];
   if(pending){await c.query('ROLLBACK');return reply.code(409).send({error:'dungeon_battle_pending'})}
   const used=heroIds.filter(x=>x>0);
   const own=(await c.query('SELECT sid FROM player_heroes WHERE account_id=$1 AND sid=ANY($2::integer[])',[id,used])).rows;
   if(own.length!==used.length){await c.query('ROLLBACK');return reply.code(409).send({error:'hero_not_owned'})}
   await c.query('INSERT INTO player_formations(account_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
   await c.query('UPDATE player_formations SET dungeon_hero_ids=$2,dungeon_formation_type=$3 WHERE account_id=$1',[id,heroIds,formationType]);
   await c.query('COMMIT');return {heroIds,formationType,sid:HERO_DUNGEON_FORMATION_SID,usesMainFallback:!used.length};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{stage:number}}>('/v1/hero-dungeon/challenge',{
  schema:{body:{type:'object',required:['stage'],additionalProperties:false,properties:{stage:{type:'integer',minimum:1,maximum:35}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const stage=heroDungeonStage(req.body.stage);
  if(!stage)return reply.code(404).send({error:'dungeon_stage_not_found'});
  if(!window().open)return reply.code(409).send({error:'dungeon_event_closed'});
  await getProfile(s,id);
  let attackers:Fighter[];
  try{attackers=await dungeonAttackers(s,id)}
  catch(e){if(e instanceof Error&&['empty_formation','invalid_formation','invalid_dungeon_formation','hero_not_owned','hero_attributes_pending'].includes(e.message))
   return reply.code(409).send({error:e.message});throw e}
  if(!attackers.length)return reply.code(409).send({error:'empty_dungeon_formation'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await progress(c,id,clock());
   if(stage.id!==row.cleared_stage+1){await c.query('ROLLBACK');return reply.code(409).send({error:'dungeon_stage_locked'})}
   if(row.daily_count>=heroDungeonEvent.custom.count){await c.query('ROLLBACK');return reply.code(409).send({error:'dungeon_attempt_limit'})}
   if((await c.query('SELECT 1 FROM hero_dungeon_pending WHERE account_id=$1',[id])).rowCount){await c.query('ROLLBACK');return reply.code(409).send({error:'dungeon_battle_pending'})}
   const ids=await formationIds(c,id),boost=await bonus(c,id,ids);
   const defenders=heroDungeonDefenders(stage);
   if(!defenders?.length){await c.query('ROLLBACK');return reply.code(503).send({error:'dungeon_enemy_data_missing'})}
   const units:Fighter[]=[...heroDungeonUnitsBonus(attackers,boost.attribute).map(u=>({...u,camp:1 as const,buffs:[],is_boss:0,hurt:0,damage:0,cure:0} as Fighter)),...defenders];
   const seed=randomInt(1,2147483647),battle=simulate(units,battleRandom(seed),15);
   const report={version:1,mode:'hero-dungeon',eventId:heroDungeonEvent.id,stage:stage.id,mapId:stage.mapId,
    battleId:randomUUID(),seed,maxRounds:15,preview:false,progressionApplied:false,
    heroes:reportHeroes(units,battle.units),initialUnits:units,summary:battle.summary,pages:battle.pages,
    finalPage:{dataType:99,round:battle.rounds,battleResult:battle.summary.resultCode,heroStatus:battle.summary.heroes},
    issues:battle.issues,parityReady:battle.parityReady};
   await c.query('INSERT INTO hero_dungeon_battles(id,account_id,event_id,stage,map_id,drop_bonus,report) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [report.battleId,id,heroDungeonEvent.id,stage.id,stage.mapId,boost.drop,JSON.stringify(report)]);
   await c.query('INSERT INTO hero_dungeon_pending(account_id,battle_id) VALUES($1,$2)',[id,report.battleId]);
   await c.query('COMMIT');return report;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get('/v1/hero-dungeon/pending',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const row=(await s.pg.query('SELECT b.report FROM hero_dungeon_pending p JOIN hero_dungeon_battles b ON b.id=p.battle_id AND b.account_id=p.account_id WHERE p.account_id=$1',[id])).rows[0];
  return {report:row?.report??null};
 });
 app.post<{Body:{battleId:string}}>('/v1/hero-dungeon/settle',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const b=(await c.query('SELECT * FROM hero_dungeon_battles WHERE id=$1 AND account_id=$2 FOR UPDATE',[req.body.battleId,id])).rows[0];
   if(!b){await c.query('ROLLBACK');return reply.code(404).send({error:'battle_not_found'})}
   if(b.settlement){await c.query('COMMIT');return b.settlement}
   const pending=(await c.query('SELECT battle_id FROM hero_dungeon_pending WHERE account_id=$1',[id])).rows[0];
   if(pending?.battle_id!==b.id){await c.query('ROLLBACK');return reply.code(409).send({error:'battle_expired'})}
   const row=await progress(c,id,clock());
   const stage=heroDungeonStage(b.stage);
   if(!stage||stage.mapId!==b.map_id){await c.query('ROLLBACK');return reply.code(503).send({error:'dungeon_map_missing'})}
   const win=b.report?.summary?.resultCode===2&&b.stage===row.cleared_stage+1;
   let rewards:[number,number][]=[];
   if(win){
    rewards=heroDungeonRewards(b.stage,b.drop_bonus);
    await grant(c,id,rewards);
    await c.query('UPDATE hero_dungeon_progress SET cleared_stage=$2,daily_count=daily_count+1,last_rounds=$3 WHERE account_id=$1',[id,b.stage,Math.max(1,Number(b.report.summary.rounds??1))]);
   }
   const settlement={battleId:b.id,eventId:b.event_id,stage:b.stage,mapId:b.map_id,result:win?1:0,rewards};
   await c.query('UPDATE hero_dungeon_battles SET settlement=$2,report=$3 WHERE id=$1',[b.id,JSON.stringify(settlement),JSON.stringify({archived:true})]);
   await c.query('DELETE FROM hero_dungeon_pending WHERE account_id=$1',[id]);
   await c.query('COMMIT');return settlement;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{battleId:string}}>('/v1/hero-dungeon/cancel',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const pending=await c.query('DELETE FROM hero_dungeon_pending WHERE account_id=$1 AND battle_id=$2 RETURNING battle_id',[id,req.body.battleId]);
   if(pending.rowCount)await c.query("UPDATE hero_dungeon_battles SET report=jsonb_build_object('archived',true) WHERE id=$1 AND account_id=$2 AND settlement IS NULL",[req.body.battleId,id]);
   await c.query('COMMIT');return {cancelled:pending.rowCount===1};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{stage:number}}>('/v1/hero-dungeon/quick',{
  schema:{body:{type:'object',required:['stage'],additionalProperties:false,properties:{stage:{type:'integer',minimum:1,maximum:35}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const stage=heroDungeonStage(req.body.stage);
  if(!stage)return reply.code(404).send({error:'dungeon_stage_not_found'});
  if(!window().open)return reply.code(409).send({error:'dungeon_event_closed'});
  await getProfile(s,id);await dungeonRoster(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await progress(c,id,clock());
   if(stage.id>row.cleared_stage){await c.query('ROLLBACK');return reply.code(409).send({error:'dungeon_stage_locked'})}
   if(row.daily_count>=heroDungeonEvent.custom.count){await c.query('ROLLBACK');return reply.code(409).send({error:'dungeon_attempt_limit'})}
   if((await c.query('SELECT 1 FROM hero_dungeon_pending WHERE account_id=$1',[id])).rowCount){await c.query('ROLLBACK');return reply.code(409).send({error:'dungeon_battle_pending'})}
   const ids=await formationIds(c,id),boost=await bonus(c,id,ids);
   const rewards=heroDungeonRewards(stage.id,boost.drop);
   await grant(c,id,rewards);
   await c.query('UPDATE hero_dungeon_progress SET daily_count=daily_count+1 WHERE account_id=$1',[id]);
   await c.query('COMMIT');return {stage:stage.id,eventId:heroDungeonEvent.id,rewards,
    remainingAttempts:Math.max(0,heroDungeonEvent.custom.count-row.daily_count-1)};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
}
