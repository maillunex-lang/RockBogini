/** NEXT-021.3B: original WorldBoss event schedules, participation rewards and damage ledger. */
import type {FastifyInstance} from 'fastify';
import type {PoolClient} from 'pg';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {prepareSquad} from './battleUnits.js';
import {reportHeroes} from './battle/reportHeroes.js';
import {simulate,type Fighter} from './battle/simulation.js';
import {battleRandom} from './battle/random.js';
import {randomUUID,randomInt} from 'node:crypto';
import {dailyDay} from './dailyInstanceConfig.js';
import {worldBossEvents,worldBossEvent,worldBossOpen,worldBossDefenders,worldBossRounds,worldBossRewards,worldBossHp,type BossEvent} from './worldBossConfig.js';
import {bossTaskState,bossTaskSettlement,bossTaskClaim} from './worldBossTasks.js';

const uuidPattern='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
type BossProgress={day:Date|string;attempts:number;best_damage:string;total_damage:string};
async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}
async function progress(c:PoolClient,id:string,eventId:number,now:Date):Promise<BossProgress>{
 const day=dailyDay(now);
 await c.query(`INSERT INTO world_boss_progress(account_id,event_id,day) VALUES($1,$2,$3)
  ON CONFLICT(account_id,event_id) DO NOTHING`,[id,eventId,day]);
 let row=(await c.query('SELECT day,attempts,best_damage::text,total_damage::text FROM world_boss_progress WHERE account_id=$1 AND event_id=$2 FOR UPDATE',[id,eventId])).rows[0] as BossProgress;
 const last=row.day instanceof Date?row.day.toISOString().slice(0,10):String(row.day).slice(0,10);
 if(last!==day){
  row=(await c.query(`UPDATE world_boss_progress SET day=$3,attempts=0
   WHERE account_id=$1 AND event_id=$2 RETURNING day,attempts,best_damage::text,total_damage::text`,
   [id,eventId,day])).rows[0] as BossProgress;
 }
 return row;
}
function scaleHero(u:Fighter,pct:number):Fighter{
 const attrs={...u.attrs};
 for(const attr of [0,1,2])attrs[attr]=Math.max(1,Math.floor((attrs[attr]??1)*(1000+pct)/1000));
 const hp=Math.max(1,attrs[1]??u.hp_max);
 return {...u,attrs,hp,hp_max:hp};
}
export function bossBonus(e:BossEvent,heroes:Fighter[]){
 const [mode,subject,weaken,...starBonuses]=e.bonus;
 if(mode===1){
  const matching=heroes.filter(u=>(u as Fighter&{hero_id:number}).hero_id===subject);
  const maxStar=matching.reduce((n,u)=>Math.max(n,(u as Fighter&{star:number}).star),0);
  const pct=maxStar>=5&&starBonuses.length?
   starBonuses[Math.min(maxStar-5,starBonuses.length-1)]:-weaken;
  return heroes.map(u=>scaleHero(u,pct));
 }
 if(mode===2)return heroes.map(u=>u.element===subject?u:scaleHero(u,-weaken));
 return heroes;
}
async function grant(c:PoolClient,id:string,rewards:readonly (readonly number[])[]){
 for(const [item,count] of rewards){
  if(!Number.isSafeInteger(item)||!Number.isSafeInteger(count)||item<1||count<=0)continue;
  await c.query(`INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,[id,item,count]);
 }
}
export async function worldBossRoutes(app:FastifyInstance,s:Storage,clock:()=>Date=()=>new Date()){
 app.get('/v1/world-boss',async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const now=clock(),c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const events=[];
   for(const e of Object.values(worldBossEvents).sort((a,b)=>a.id-b.id)){
    const row=await progress(c,id,e.id,now),open=worldBossOpen(e,now);
    const tasks=await bossTaskState(c,id,e,dailyDay(now));
    events.push({id:e.id,name:e.name,kind:e.kind,mapId:e.mapId,tasks,
     startTime:new Date(e.startTime).toISOString(),
     endTime:new Date(e.startTime+e.durationDays*86400000).toISOString(),
     open,requiresGuild:e.kind===2,canChallenge:open&&e.kind===1&&row.attempts<e.attempts,
     attempts:row.attempts,attemptMax:e.attempts,bestDamage:row.best_damage,totalDamage:row.total_damage,
     bonus:e.bonus,bossHp:worldBossHp(e),rounds:worldBossRounds(e),
     participationRewards:worldBossRewards(e),
     unavailableReason:!open?'event_closed':e.kind===2?'guild_not_implemented':row.attempts>=e.attempts?'attempt_limit':null});
   }
   await c.query('COMMIT');return {events,day:dailyDay(now)};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{eventId:number}}>('/v1/world-boss/challenge',{
  schema:{body:{type:'object',required:['eventId'],additionalProperties:false,properties:{eventId:{type:'integer',minimum:1}}}},
 },async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const e=worldBossEvent(req.body.eventId),now=clock();
  if(!e)return reply.code(404).send({error:'world_boss_not_found'});
  if(!worldBossOpen(e,now))return reply.code(409).send({error:'world_boss_closed'});
  // Original guild boss requires an actual alliance formation; do not silently substitute main squad.
  if(e.kind===2)return reply.code(409).send({error:'guild_not_implemented'});
  await getProfile(s,id);
  let attackers:Awaited<ReturnType<typeof prepareSquad>>;
  try{attackers=await prepareSquad(s,id)}catch(err){
   if(err instanceof Error&&['empty_formation','invalid_formation','hero_attributes_pending','hero_not_owned'].includes(err.message))
    return reply.code(409).send({error:err.message});
   throw err;
  }
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await progress(c,id,e.id,now);
   if(row.attempts>=e.attempts){await c.query('ROLLBACK');return reply.code(409).send({error:'world_boss_attempt_limit'})}
   const pending=(await c.query('SELECT battle_id FROM world_boss_pending WHERE account_id=$1',[id])).rows[0];
   if(pending){await c.query('ROLLBACK');return reply.code(409).send({error:'world_boss_battle_pending'})}
   const defenders=worldBossDefenders(e);
   if(!defenders?.length){await c.query('ROLLBACK');return reply.code(503).send({error:'world_boss_enemy_missing'})}
   const team=bossBonus(e,attackers as Fighter[]);
   const units:Fighter[]=[...team.map(u=>({...u,camp:1 as const,buffs:[],is_boss:0,hurt:0,damage:0,cure:0} as Fighter)),...defenders];
   const seed=randomInt(1,2147483647),rounds=worldBossRounds(e);
   const battle=simulate(units,battleRandom(seed),rounds);
   const damage=battle.summary.attacker.damage;
   if(!Number.isSafeInteger(damage)||damage<0){await c.query('ROLLBACK');return reply.code(503).send({error:'world_boss_invalid_damage'})}
   const report={version:1,mode:'world-boss',eventId:e.id,kind:e.kind,
    mapId:e.mapId,day:dailyDay(now),battleId:randomUUID(),
    seed,maxRounds:rounds,damage,preview:false,progressionApplied:false,
    heroes:reportHeroes(units,battle.units),initialUnits:units,summary:battle.summary,pages:battle.pages,
    finalPage:{dataType:99,round:battle.rounds,battleResult:battle.summary.resultCode,heroStatus:battle.summary.heroes},
    issues:battle.issues,parityReady:battle.parityReady};
   await c.query('INSERT INTO world_boss_battles(id,account_id,event_id,map_id,report) VALUES($1,$2,$3,$4,$5)',
    [report.battleId,id,e.id,e.mapId,JSON.stringify(report)]);
   await c.query('INSERT INTO world_boss_pending(account_id,battle_id) VALUES($1,$2)',[id,report.battleId]);
   await c.query('COMMIT');return report;
  }catch(err){await c.query('ROLLBACK');throw err}finally{c.release()}
 });
 app.get('/v1/world-boss/pending',async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const row=(await s.pg.query(`SELECT b.report FROM world_boss_pending p JOIN world_boss_battles b
   ON b.id=p.battle_id AND b.account_id=p.account_id WHERE p.account_id=$1`,[id])).rows[0];
  return {report:row?.report??null};
 });
 app.post<{Body:{battleId:string}}>('/v1/world-boss/settle',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const now=clock(),c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const p=(await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   if(!p){await c.query('ROLLBACK');return reply.code(404).send({error:'profile_missing'})}
   const b=(await c.query('SELECT * FROM world_boss_battles WHERE id=$1 AND account_id=$2 FOR UPDATE',[req.body.battleId,id])).rows[0];
   if(!b){await c.query('ROLLBACK');return reply.code(404).send({error:'battle_not_found'})}
   if(b.settlement){await c.query('COMMIT');return b.settlement}
   const pending=(await c.query('SELECT battle_id FROM world_boss_pending WHERE account_id=$1',[id])).rows[0];
   if(pending?.battle_id!==b.id){await c.query('ROLLBACK');return reply.code(409).send({error:'battle_expired'})}
   const e=worldBossEvent(b.event_id);
   if(!e||b.map_id!==e.mapId){await c.query('ROLLBACK');return reply.code(503).send({error:'boss_event_config_missing'})}
   const row=await progress(c,id,e.id,now);
   const damage=b.report.damage as number;
   if(!Number.isSafeInteger(damage)||damage<0){await c.query('ROLLBACK');return reply.code(503).send({error:'world_boss_damage_invalid'})}
   const rewards=worldBossRewards(e);
   await grant(c,id,rewards);
   await bossTaskSettlement(c,id,e,dailyDay(now),damage);
   // Late settlement after JST midnight credits the event lifetime totals but not the new day's attempt.
   const counted=b.report.day===dailyDay(now)?1:0;
   await c.query(`UPDATE world_boss_progress SET attempts=attempts+$3,
    best_damage=GREATEST(best_damage,$4::bigint),total_damage=total_damage+$4::bigint
    WHERE account_id=$1 AND event_id=$2`,[id,e.id,counted,damage]);
   const settlement={battleId:b.id,eventId:e.id,mapId:e.mapId,damage,rewards,countedAttempt:counted===1};
   await c.query('UPDATE world_boss_battles SET settlement=$2,report=$3 WHERE id=$1',
    [b.id,JSON.stringify(settlement),JSON.stringify({archived:true})]);
   await c.query('DELETE FROM world_boss_pending WHERE account_id=$1',[id]);
   await c.query('COMMIT');return settlement;
  }catch(err){await c.query('ROLLBACK');throw err}finally{c.release()}
 });
 app.post<{Body:{battleId:string}}>('/v1/world-boss/cancel',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const r=await c.query('DELETE FROM world_boss_pending WHERE account_id=$1 AND battle_id=$2 RETURNING battle_id',[id,req.body.battleId]);
   if(r.rowCount)await c.query(`UPDATE world_boss_battles SET report=jsonb_build_object('archived',true)
    WHERE id=$1 AND account_id=$2 AND settlement IS NULL`,[req.body.battleId,id]);
   await c.query('COMMIT');return {cancelled:r.rowCount===1};
  }catch(err){await c.query('ROLLBACK');throw err}finally{c.release()}
 });
 app.post<{Body:{eventId:number;taskId:number}}>('/v1/world-boss/task-claim',{
  schema:{body:{type:'object',required:['eventId','taskId'],additionalProperties:false,properties:{
   eventId:{type:'integer',minimum:1},taskId:{type:'integer',minimum:1}
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const event=worldBossEvent(req.body.eventId);
  if(!event)return reply.code(404).send({error:'world_boss_not_found'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const result=await bossTaskClaim(c,id,event,req.body.taskId,dailyDay(clock()));
   if('error' in result){await c.query('ROLLBACK');return reply.code(409).send(result)}
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get<{Params:{eventId:string}}>('/v1/world-boss/rank/:eventId',async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const eventId=Number(req.params.eventId);
  if(!Number.isSafeInteger(eventId)||!worldBossEvent(eventId))return reply.code(404).send({error:'world_boss_not_found'});
  const rows=(await s.pg.query(`SELECT p.nickname,r.best_damage::text AS best_damage
   FROM world_boss_progress r JOIN player_profiles p ON p.account_id=r.account_id
   WHERE r.event_id=$1 AND r.best_damage>0 ORDER BY r.best_damage DESC,r.account_id LIMIT 25`,[eventId])).rows;
  return {eventId,rows:rows.map((r,i)=>({rank:i+1,nickname:r.nickname,bestDamage:r.best_damage}))};
 });
}
