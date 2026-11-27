/** NEXT-021.3: source-backed Endless Abyss, sequential waves and durable reward ledger. */
import type {FastifyInstance} from 'fastify';
import type {PoolClient} from 'pg';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {prepareSquad} from './battleUnits.js';
import {reportHeroes} from './battle/reportHeroes.js';
import {simulate,type Fighter} from './battle/simulation.js';
import {battleRandom} from './battle/random.js';
import {randomInt,randomUUID} from 'node:crypto';
import {abyssTypes,abyssStage,abyssWave,abyssDefenders,abyssOpen,abyssParams,abyssBuffs,abyssBuff,abyssPointRewards} from './abyssConfig.js';
import {taskEvent} from './tasks.js';
import {skillConfig} from './unitConfig.js';
const uuidPattern='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
type State={abyss_type:number;map_index:number;reward_index:number;completed_index:number;in_battle:boolean;hp:Record<string,number>;buff_ids:number[];options:number[];point_rewards:number[]};
async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}
async function state(c:PoolClient,id:string,type:number):Promise<State>{
 await c.query('INSERT INTO abyss_progress(account_id,abyss_type) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,type]);
 const r=(await c.query('SELECT * FROM abyss_progress WHERE account_id=$1 AND abyss_type=$2 FOR UPDATE',[id,type])).rows[0] as State;
 return {...r,hp:r.hp??{},buff_ids:r.buff_ids??[],options:r.options??[],point_rewards:r.point_rewards??[]};
}
async function grant(c:PoolClient,id:string,rewards:readonly (readonly number[])[]){
 for(const [item,n] of rewards){
  if(!Number.isSafeInteger(item)||!Number.isSafeInteger(n)||item<=0||n<=0)continue;
  await c.query(`INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,[id,item,n]);
 }
}
function applyBuff(unit:Fighter,buffIds:number[]){
 const u={...unit,attrs:{...unit.attrs},actives:[...unit.actives],passives:[...unit.passives??[]],cd:{...unit.cd}};
 const known=new Set([...u.actives,...u.passives]);
 for(const id of buffIds){
  const cfg=abyssBuff(id);
  if(!cfg)continue;
  if(cfg.type===3)for(const [key,value] of cfg.attrs){
   // Original PveAbyss.buffed: a<100 direct; 100+a is additive to attr a.
   const n=key<100?key:key<200?key-100:-1;
   if(n>=0)u.attrs[n]=(u.attrs[n]??0)+value;
  }
  if(cfg.type===2)for(const [sid] of cfg.attrs){
   if(!skillConfig[sid]||known.has(sid))continue;
   known.add(sid);
   if(skillConfig[sid].active){u.actives.push(sid);u.cd[sid]=skillConfig[sid].start;}
   if(skillConfig[sid].passive)u.passives.push(sid);
  }
 }
 return u;
}
function rollOptions(owned:number[]):number[]{
 const available=Object.values(abyssBuffs).filter(x=>x.count!==1||!owned.includes(x.id));
 // Offer 3 distinct original buffs. Cryptographic RNG avoids predictable reward choice.
 for(let i=available.length-1;i>0;i--){const j=randomInt(i+1);[available[i],available[j]]=[available[j],available[i]];}
 return available.slice(0,3).map(x=>x.id);
}
function rowView(type:number,row:State){
 const stage=abyssStage(type,row.map_index+1),wave=abyssWave(type,row.map_index+1,row.reward_index+1);
 return {type,mapIndex:row.map_index,rewardIndex:row.reward_index,completedIndex:row.completed_index,
  inBattle:row.in_battle,remainingHp:row.hp,buffIds:row.buff_ids,options:row.options,
  pointRewardCount:row.point_rewards.length,pointRewardKeys:row.point_rewards,
  open:abyssOpen(type),nextStage:stage?.stage??null,nextWaveId:wave?.mapId??null,
  nextWavePower:wave?.map.battlePower??null,available:!!wave&&abyssOpen(type)};
}
export async function abyssRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/abyss',async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const modes=[];
   for(const type of [1,2])modes.push(rowView(type,await state(c,id,type)));
   await c.query('COMMIT');return {modes,pointWaves:abyssParams.pointWaves,buffWaves:abyssParams.buffWaves};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{type:number;buffIndex?:number}}>('/v1/abyss/challenge',{
  schema:{body:{type:'object',required:['type'],additionalProperties:false,properties:{
   type:{type:'integer',enum:[1,2]},buffIndex:{type:'integer',minimum:0,maximum:2},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const type=req.body.type;
  // Build units before locking profile so the dedicated squad connection doesn't deadlock.
  await getProfile(s,id);
  let attackers:Awaited<ReturnType<typeof prepareSquad>>;
  try{attackers=await prepareSquad(s,id)}catch(e){
   if(e instanceof Error&&['empty_formation','invalid_formation','hero_attributes_pending','hero_not_owned'].includes(e.message))
    return reply.code(409).send({error:e.message});
   throw e;
  }
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const p=(await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   if(!p){await c.query('ROLLBACK');return reply.code(404).send({error:'profile_not_found'})}
   const row=await state(c,id,type);
   if(!abyssOpen(type)){await c.query('ROLLBACK');return reply.code(409).send({error:'abyss_closed'})}
   // Enforce stage order and one in-flight challenge; the previous fight must be settled or cancelled.
   const pending=(await c.query('SELECT battle_id FROM abyss_pending WHERE account_id=$1',[id])).rows[0];
   if(pending){await c.query('ROLLBACK');return reply.code(409).send({error:'abyss_battle_pending'})}
   const index=row.map_index+1,wave=row.reward_index+1,cfg=abyssWave(type,index,wave);
   if(!cfg){await c.query('ROLLBACK');return reply.code(404).send({error:'abyss_wave_not_found'})}
   // Mode 1 is the original single-hero trial; one hero per wave, deterministically cycling selected heroes.
   const singleUnits=attackers.slice(0,3);
   let fighters:Fighter[]=type===1?[singleUnits[(wave-1)%singleUnits.length]]:attackers;
   // An original ChallengeType=1 starts a fresh run after defeat or stage completion:
   // restore the heroes and discard run buffs, but preserve completed wave progress.
   const startingRun=!row.in_battle;
   let options=startingRun?[]:row.options,buffs=startingRun?[]:row.buff_ids;

   if(options.length){
    if(req.body.buffIndex===undefined||req.body.buffIndex>=options.length){
     await c.query('ROLLBACK');return reply.code(409).send({error:'abyss_buff_choice_required',options});
    }
    const selected=options[req.body.buffIndex],buff=abyssBuff(selected);
    if(!buff){await c.query('ROLLBACK');return reply.code(409).send({error:'abyss_buff_invalid'})}
    buffs=[...buffs,selected];options=[];
   }else if(req.body.buffIndex!==undefined){
    await c.query('ROLLBACK');return reply.code(409).send({error:'abyss_buff_not_offered'});
   }
   fighters=fighters.map(u=>applyBuff(u,buffs));
   // Explicitly record the original member IDs before any combat mutation.
   const initialHp:Record<string,number>=startingRun?{}:{...row.hp};
   if(req.body.buffIndex!==undefined&&buffs.length>(startingRun?0:row.buff_ids.length)){
    const chosen=abyssBuff(buffs[buffs.length-1]);
    if(chosen?.type===1){
     const per=chosen.attrs[0]?.[0]??0;
     for(const u of attackers){
      const sid=String((u as Fighter&{sid?:number}).sid??0);
      if(!sid||sid==='0')continue;
      const previous=initialHp[sid]??u.hp;
      if(previous>0)initialHp[sid]=Math.min(u.hp_max,previous+Math.floor(u.hp_max*per/1000));
     }
    }
   }
   fighters=fighters.map(u=>({...u,hp:Math.min(u.hp,Math.max(0,initialHp[String((u as Fighter&{sid?:number}).sid??0)]??u.hp))})).filter(u=>u.hp>0);
   if(!fighters.length){await c.query('ROLLBACK');return reply.code(409).send({error:'abyss_no_living_heroes'})}
   const defenders=abyssDefenders(type,index,wave);
   if(!defenders){await c.query('ROLLBACK');return reply.code(503).send({error:'abyss_defenders_unavailable'})}
   const units:Fighter[]=[...fighters.map(u=>({...u,camp:1 as const,buffs:[],is_boss:0,hurt:0,damage:0,cure:0} as Fighter)),...defenders];
   const seed=randomInt(1,2147483647),battle=simulate(units,battleRandom(seed),
    abyssParams.mapTypes[String(type===1?10:11)].maxRound||15);
   const report={version:1,mode:'abyss',type,mapIndex:index,waveIndex:wave,mapId:cfg.mapId,
    battleId:randomUUID(),background:cfg.map.bg,seed,maxRounds:15,preview:false,progressionApplied:false,
    heroes:reportHeroes(units,battle.units),initialUnits:units,summary:battle.summary,pages:battle.pages,
    finalPage:{dataType:99,round:battle.rounds,battleResult:battle.summary.resultCode,heroStatus:battle.summary.heroes},
    issues:battle.issues,parityReady:battle.parityReady};
   await c.query('INSERT INTO abyss_battles(id,account_id,abyss_type,map_index,wave_index,map_id,report) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [report.battleId,id,type,index,wave,cfg.mapId,JSON.stringify(report)]);
   await c.query('INSERT INTO abyss_pending(account_id,battle_id) VALUES($1,$2)',[id,report.battleId]);
   if(startingRun)await taskEvent(c,id,1022,[],1);
   // Persist selected buff only with successful challenge preparation; if battle fails/cancelled, selection stays.
   await c.query('UPDATE abyss_progress SET buff_ids=$3,options=$4,hp=$5 WHERE account_id=$1 AND abyss_type=$2',
    [id,type,JSON.stringify(buffs),JSON.stringify(options),JSON.stringify(initialHp)]);
   await c.query('COMMIT');return report;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get('/v1/abyss/pending',async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const row=(await s.pg.query(`SELECT b.report FROM abyss_pending p JOIN abyss_battles b
   ON b.id=p.battle_id AND b.account_id=p.account_id WHERE p.account_id=$1`,[id])).rows[0];
  return {report:row?.report??null};
 });
 app.post<{Body:{battleId:string}}>('/v1/abyss/settle',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const b=(await c.query('SELECT * FROM abyss_battles WHERE id=$1 AND account_id=$2 FOR UPDATE',[req.body.battleId,id])).rows[0];
   if(!b){await c.query('ROLLBACK');return reply.code(404).send({error:'battle_not_found'})}
   if(b.settlement){await c.query('COMMIT');return b.settlement}
   const pending=(await c.query('SELECT battle_id FROM abyss_pending WHERE account_id=$1',[id])).rows[0];
   if(pending?.battle_id!==b.id){await c.query('ROLLBACK');return reply.code(409).send({error:'battle_expired'})}
   const row=await state(c,id,b.abyss_type);
   const cfg=abyssWave(b.abyss_type,b.map_index,b.wave_index);
   if(!cfg){await c.query('ROLLBACK');return reply.code(503).send({error:'abyss_wave_unavailable'})}
   const won=b.report.summary.resultCode===2&&b.map_index===row.map_index+1&&b.wave_index===row.reward_index+1;
   let index=row.map_index,progress=row.reward_index,options=row.options;
   let points=row.point_rewards,hp=row.hp,buffs=row.buff_ids,complete=false;
   if(won){
    const survivors=Object.fromEntries((b.report.summary.heroes as {id:number;camp:number;hp:number}[])
     .filter(x=>x.camp===1).map(x=>{
      const fighter=(b.report.initialUnits as {id:number;sid:number}[]).find(u=>u.id===x.id);
      return [String(fighter?.sid??0),Math.max(0,x.hp)];
     }).filter(([sid])=>sid!=='0')) as Record<string,number>;
    // Keep HP for heroes not fielded this wave; dead heroes remain dead until stage reset.
    hp={...row.hp,...survivors};
    progress=b.wave_index;
    const slot=abyssParams.pointWaves.indexOf(progress);
    if(slot>=0&&slot<cfg.stage.pointReward.length){
     const key=b.map_index*10+slot;
     if(!points.includes(key))points=[...points,key];
    }
    if(progress>=cfg.stage.monsters.length){
     index=b.map_index;progress=0;hp={};buffs=[];options=[];complete=true;

    }else if(abyssParams.buffWaves.includes(progress)){
     options=rollOptions(buffs);
    }
   }else{
    options=[]; // Failed wave doesn't move progression; next challenge retries current wave.
   }
   await c.query(`UPDATE abyss_progress SET map_index=$3,reward_index=$4,completed_index=GREATEST(completed_index,$3),
    in_battle=$5,hp=$6,buff_ids=$7,options=$8,point_rewards=$9
    WHERE account_id=$1 AND abyss_type=$2`,
    [id,b.abyss_type,index,progress,won&&!complete,JSON.stringify(hp),JSON.stringify(buffs),
     JSON.stringify(options),JSON.stringify(points)]);
   const settlement={battleId:b.id,mapId:b.map_id,type:b.abyss_type,mapIndex:index,waveIndex:b.wave_index,
    result:won?1:0,finished:complete,progress,pointRewardsAvailable:points.length,buffOptions:options};
   await c.query('UPDATE abyss_battles SET settlement=$2,report=$3 WHERE id=$1',
    [b.id,JSON.stringify(settlement),JSON.stringify({archived:true})]);
   await c.query('DELETE FROM abyss_pending WHERE account_id=$1',[id]);
   await c.query('COMMIT');return settlement;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{battleId:string}}>('/v1/abyss/cancel',{
  schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}},
 },async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const res=await c.query('DELETE FROM abyss_pending WHERE account_id=$1 AND battle_id=$2 RETURNING battle_id',[id,req.body.battleId]);
   if(res.rowCount)await c.query(`UPDATE abyss_battles SET report=jsonb_build_object('archived',true)
    WHERE id=$1 AND account_id=$2 AND settlement IS NULL`,[req.body.battleId,id]);
   await c.query('COMMIT');return {cancelled:res.rowCount===1};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{type:number}}>('/v1/abyss/points',{
  schema:{body:{type:'object',required:['type'],additionalProperties:false,properties:{type:{type:'integer',enum:[1,2]}}}},
 },async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await state(c,id,req.body.type);
   if(!row.point_rewards.length){await c.query('ROLLBACK');return reply.code(409).send({error:'no_point_rewards'})}
   const rewards=row.point_rewards.flatMap(key=>{
    const stage=Math.floor(key/10),slot=key%10;
    return abyssPointRewards(req.body.type,stage,slot);
   });
   await grant(c,id,rewards);
   await c.query('UPDATE abyss_progress SET point_rewards=$3 WHERE account_id=$1 AND abyss_type=$2',
    [id,req.body.type,JSON.stringify([])]);
   await c.query('COMMIT');return {type:req.body.type,rewards};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
}
