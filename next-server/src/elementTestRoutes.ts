/** NEXT-021.13 original two elemental trials: event-specific server-authoritative PvE. */
import type {FastifyInstance} from 'fastify';
import type {PoolClient} from 'pg';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {getHeroes} from './heroes.js';
import {formations} from './formationConfig.js';
import {prepareSquad,buildUnit} from './battleUnits.js';
import {reportHeroes} from './battle/reportHeroes.js';
import {simulate,type Fighter} from './battle/simulation.js';
import {battleRandom} from './battle/random.js';
import {randomUUID,randomInt} from 'node:crypto';
import {elementEvents,elementEvent,elementStage,elementMap,elementDefenders,elementWindow,
 elementSid,elementRewards,elementWeaken,elementQuickPower,elementQuickEnd,type ElementEvent} from './elementTestConfig.js';
const uuidPattern='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
async function auth(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}
async function progress(c:PoolClient,id:string,event:ElementEvent){
 await c.query('INSERT INTO element_test_progress(account_id,event_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,event.id]);
 return Number((await c.query('SELECT cleared_stage FROM element_test_progress WHERE account_id=$1 AND event_id=$2 FOR UPDATE',[id,event.id])).rows[0].cleared_stage);
}
async function roster(s:Storage,id:string,event:ElementEvent){
 await getHeroes(s,id);
 await s.pg.query('INSERT INTO player_formations(account_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
 const r=(await s.pg.query('SELECT hero_ids,formation_type FROM element_test_formations WHERE account_id=$1 AND event_id=$2',[id,event.id])).rows[0];
 if(r)return {heroIds:r.hero_ids as number[],formationType:Number(r.formation_type),sid:elementSid(event),usesMainFallback:false};
 const main=(await s.pg.query('SELECT hero_ids,formation_type FROM player_formations WHERE account_id=$1',[id])).rows[0];
 return {heroIds:main.hero_ids as number[],formationType:Number(main.formation_type),sid:elementSid(event),usesMainFallback:true};
}
async function attackers(s:Storage,id:string,event:ElementEvent):Promise<Fighter[]>{
 const r=await roster(s,id,event);
 const layout=formations.find(f=>f.Id===r.formationType);
 if(!layout)throw Error('invalid_element_formation');
 const used=r.heroIds.filter(x=>x>0);
 if(!used.length)throw Error('empty_element_formation');
 if(new Set(used).size!==used.length)throw Error('invalid_element_formation');
 const owned=await getHeroes(s,id);
 const heroes=new Map(owned.map(h=>[h.Sid,h]));
 return r.heroIds.flatMap((sid,index)=>{
  if(sid===0)return [];
  const hero=heroes.get(sid);
  if(!hero)throw Error('hero_not_owned');
  return [buildUnit(hero,layout.Data[index]-1) as unknown as Fighter];
 });
}
async function selectedPower(c:PoolClient,id:string,event:ElementEvent){
 const form=(await c.query('SELECT hero_ids FROM element_test_formations WHERE account_id=$1 AND event_id=$2',[id,event.id])).rows[0];
 const fallback=form?form.hero_ids:(await c.query('SELECT hero_ids FROM player_formations WHERE account_id=$1',[id])).rows[0]?.hero_ids;
 const ids=(fallback??[] as number[]).filter((x:number)=>x>0);
 const rows=(await c.query('SELECT sid,hero_id,power FROM player_heroes WHERE account_id=$1 AND sid=ANY($2::integer[])',[id,ids])).rows;
 if(rows.length!==ids.length)throw Error('hero_not_owned');
 return elementQuickPower(rows.map(h=>({heroId:Number(h.hero_id),power:Number(h.power)})),event);
}
async function grant(c:PoolClient,id:string,rewards:number[][]){
 for(const [item,count] of rewards){
  if(!Number.isSafeInteger(item)||!Number.isSafeInteger(count)||item<1||count<=0)throw Error('invalid_element_reward');
  await c.query(`INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,[id,item,count]);
 }
}
export async function elementTestRoutes(app:FastifyInstance,s:Storage,clock:()=>Date=()=>new Date()){
 app.get('/v1/element-test',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);await getHeroes(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const events=[];
   for(const event of Object.values(elementEvents).sort((a,b)=>a.id-b.id)){
    const clearedStage=await progress(c,id,event);
    const win=elementWindow(event,clock()),next=elementStage(event,clearedStage+1);
    const power=await selectedPower(c,id,event);
    const quickEnd=elementQuickEnd(event,clearedStage,power);
    events.push({id:event.id,name:event.name,element:event.custom.element,sid:elementSid(event),
     window:win,clearedStage,rank:clearedStage,maximumStages:event.stages.length,selectedPower:power,
     nextStage:next?{...next,bg:elementMap(next)?.bg??''}:null,
     canChallenge:win.open&&!!next,quickEnd:win.open?quickEnd:clearedStage,
     canQuick:win.open&&quickEnd>clearedStage});
   }
   await c.query('COMMIT');return {events};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get<{Params:{eventId:string}}>('/v1/element-test/formation/:eventId',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const event=elementEvent(Number(req.params.eventId));
  if(!event)return reply.code(404).send({error:'element_event_not_found'});
  const [form,heroes]=await Promise.all([roster(s,id,event),getHeroes(s,id)]);
  return {...form,layouts:formations.map(f=>({id:f.Id,positions:f.Data})),
   heroOptions:heroes.map(h=>({sid:h.Sid,heroId:h.HeroId,power:h.Power,star:h.StarLevel}))};
 });
 app.put<{Body:{eventId:number;heroIds:number[];formationType:number}}>('/v1/element-test/formation',{
  schema:{body:{type:'object',required:['eventId','heroIds','formationType'],additionalProperties:false,properties:{
   eventId:{type:'integer'},heroIds:{type:'array',minItems:6,maxItems:6,items:{type:'integer',minimum:0,maximum:2147483647}},
   formationType:{type:'integer',enum:[101,102,103,104,105,106]}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const event=elementEvent(req.body.eventId);
  if(!event)return reply.code(404).send({error:'element_event_not_found'});
  const {heroIds,formationType}=req.body;
  const used=heroIds.filter(x=>x>0);
  if(new Set(used).size!==used.length)return reply.code(400).send({error:'invalid_element_formation'});
  await getProfile(s,id);await getHeroes(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const p=(await c.query('SELECT 1 FROM element_test_pending WHERE account_id=$1 AND event_id=$2',[id,event.id])).rowCount;
   if(p){await c.query('ROLLBACK');return reply.code(409).send({error:'element_battle_pending'})}
   const owned=(await c.query('SELECT sid FROM player_heroes WHERE account_id=$1 AND sid=ANY($2::integer[])',[id,used])).rows;
   if(owned.length!==used.length){await c.query('ROLLBACK');return reply.code(409).send({error:'hero_not_owned'})}
   await c.query(`INSERT INTO element_test_formations(account_id,event_id,formation_sid,formation_type,hero_ids)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(account_id,event_id) DO UPDATE
    SET formation_type=EXCLUDED.formation_type,hero_ids=EXCLUDED.hero_ids`,
    [id,event.id,elementSid(event),formationType,heroIds]);
   await c.query('COMMIT');return {eventId:event.id,sid:elementSid(event),heroIds,formationType,usesMainFallback:false};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{eventId:number;stage:number}}>('/v1/element-test/challenge',{
  schema:{body:{type:'object',required:['eventId','stage'],additionalProperties:false,properties:{eventId:{type:'integer'},stage:{type:'integer',minimum:1,maximum:200}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const event=elementEvent(req.body.eventId);
  if(!event)return reply.code(404).send({error:'element_event_not_found'});
  if(!elementWindow(event,clock()).open)return reply.code(409).send({error:'element_event_closed'});
  const stage=elementStage(event,req.body.stage);
  if(!stage)return reply.code(404).send({error:'element_stage_not_found'});
  await getProfile(s,id);
  let units:Fighter[];
  try{units=await attackers(s,id,event)}
  catch(e){if(e instanceof Error&&['empty_element_formation','invalid_element_formation','hero_not_owned','hero_attributes_pending'].includes(e.message))
   return reply.code(409).send({error:e.message});throw e}
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   if(!elementWindow(event,clock()).open){await c.query('ROLLBACK');return reply.code(409).send({error:'element_event_closed'})}
   const cleared=await progress(c,id,event);
   if(stage.id!==cleared+1){await c.query('ROLLBACK');return reply.code(409).send({error:'element_stage_locked'})}
   if((await c.query('SELECT 1 FROM element_test_pending WHERE account_id=$1 AND event_id=$2',[id,event.id])).rowCount){
    await c.query('ROLLBACK');return reply.code(409).send({error:'element_battle_pending'})}
   const defenders=elementDefenders(stage);
   if(!defenders?.length){await c.query('ROLLBACK');return reply.code(503).send({error:'element_enemy_data_missing'})}
   const initialUnits=[...elementWeaken(units,event).map(u=>({...u,camp:1 as const,buffs:[],is_boss:0,hurt:0,damage:0,cure:0} as Fighter)),...defenders];
   const seed=randomInt(1,2147483647),battle=simulate(initialUnits,battleRandom(seed),15);
   const report={version:1,mode:'element-test',eventId:event.id,stage:stage.id,mapId:stage.mapId,
    battleId:randomUUID(),seed,maxRounds:15,preview:false,progressionApplied:false,
    heroes:reportHeroes(initialUnits,battle.units),initialUnits,summary:battle.summary,pages:battle.pages,
    finalPage:{dataType:99,round:battle.rounds,battleResult:battle.summary.resultCode,heroStatus:battle.summary.heroes},
    issues:battle.issues,parityReady:battle.parityReady};
   await c.query('INSERT INTO element_test_battles(id,account_id,event_id,stage,map_id,report) VALUES($1,$2,$3,$4,$5,$6)',
    [report.battleId,id,event.id,stage.id,stage.mapId,JSON.stringify(report)]);
   await c.query('INSERT INTO element_test_pending(account_id,event_id,battle_id) VALUES($1,$2,$3)',[id,event.id,report.battleId]);
   await c.query('COMMIT');return report;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get<{Params:{eventId:string}}>('/v1/element-test/pending/:eventId',async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const event=elementEvent(Number(req.params.eventId));
  if(!event)return reply.code(404).send({error:'element_event_not_found'});
  const row=(await s.pg.query(`SELECT b.report FROM element_test_pending p JOIN element_test_battles b ON b.id=p.battle_id AND b.account_id=p.account_id
   WHERE p.account_id=$1 AND p.event_id=$2`,[id,event.id])).rows[0];
  return {report:row?.report??null};
 });
 app.post<{Body:{battleId:string}}>('/v1/element-test/settle',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const b=(await c.query('SELECT * FROM element_test_battles WHERE id=$1 AND account_id=$2 FOR UPDATE',[req.body.battleId,id])).rows[0];
   if(!b){await c.query('ROLLBACK');return reply.code(404).send({error:'battle_not_found'})}
   if(b.settlement){await c.query('COMMIT');return b.settlement}
   const pending=(await c.query('SELECT battle_id FROM element_test_pending WHERE account_id=$1 AND event_id=$2',[id,b.event_id])).rows[0];
   if(pending?.battle_id!==b.id){await c.query('ROLLBACK');return reply.code(409).send({error:'battle_expired'})}
   const event=elementEvent(b.event_id),stage=event&&elementStage(event,b.stage);
   if(!event||!stage||stage.mapId!==b.map_id){await c.query('ROLLBACK');return reply.code(503).send({error:'element_map_missing'})}
   const cleared=await progress(c,id,event);
   const win=b.report?.summary?.resultCode===2&&b.stage===cleared+1;
   let rewards:[number,number][]=[];
   if(win){
    rewards=elementRewards(event,cleared,b.stage);
    await grant(c,id,rewards);
    await c.query('UPDATE element_test_progress SET cleared_stage=$3 WHERE account_id=$1 AND event_id=$2',[id,event.id,b.stage]);
   }
   const result={battleId:b.id,eventId:event.id,stage:b.stage,mapId:b.map_id,result:win?1:0,rewards};
   await c.query('UPDATE element_test_battles SET settlement=$2,report=$3 WHERE id=$1',
    [b.id,JSON.stringify(result),JSON.stringify({archived:true})]);
   await c.query('DELETE FROM element_test_pending WHERE account_id=$1 AND event_id=$2',[id,event.id]);
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{battleId:string}}>('/v1/element-test/cancel',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const pending=(await c.query('SELECT account_id,event_id FROM element_test_pending WHERE account_id=$1 AND battle_id=$2 FOR UPDATE',[id,req.body.battleId])).rows[0];
   if(pending){
    await c.query('DELETE FROM element_test_pending WHERE account_id=$1 AND event_id=$2',[id,pending.event_id]);
    await c.query("UPDATE element_test_battles SET report=jsonb_build_object('archived',true) WHERE id=$1 AND account_id=$2 AND settlement IS NULL",[req.body.battleId,id]);
   }
   await c.query('COMMIT');return {cancelled:!!pending};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{eventId:number;endStage:number}}>('/v1/element-test/quick',{
  schema:{body:{type:'object',required:['eventId','endStage'],additionalProperties:false,properties:{
   eventId:{type:'integer'},endStage:{type:'integer',minimum:1,maximum:200}}}},
 },async(req,reply)=>{
  const id=await auth(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const event=elementEvent(req.body.eventId);
  if(!event)return reply.code(404).send({error:'element_event_not_found'});
  if(!elementWindow(event,clock()).open)return reply.code(409).send({error:'element_event_closed'});
  await getProfile(s,id);await getHeroes(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   if(!elementWindow(event,clock()).open){await c.query('ROLLBACK');return reply.code(409).send({error:'element_event_closed'})}
   const cleared=await progress(c,id,event);
   if(req.body.endStage<=cleared){await c.query('ROLLBACK');return reply.code(409).send({error:'element_stage_locked'})}
   if((await c.query('SELECT 1 FROM element_test_pending WHERE account_id=$1 AND event_id=$2',[id,event.id])).rowCount){
    await c.query('ROLLBACK');return reply.code(409).send({error:'element_battle_pending'})}
   const power=await selectedPower(c,id,event);
   if(elementQuickEnd(event,cleared,power)<req.body.endStage){
    await c.query('ROLLBACK');return reply.code(409).send({error:'element_quick_power_low'})}
   const rewards=elementRewards(event,cleared,req.body.endStage);
   await grant(c,id,rewards);
   await c.query('UPDATE element_test_progress SET cleared_stage=$3 WHERE account_id=$1 AND event_id=$2',[id,event.id,req.body.endStage]);
   await c.query('COMMIT');return {eventId:event.id,clearedStage:req.body.endStage,rewards};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
}
