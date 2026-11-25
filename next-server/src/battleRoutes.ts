import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {prepareSquad} from './battleUnits.js';
import {getProfile} from './profile.js';
import {campaignUnits} from './campaignUnits.js';
import {simulate,type Fighter} from './battle/simulation.js';
import {battleRandom} from './battle/random.js';
import {readFileSync} from 'node:fs';
import {playerLevels} from './playerLevels.js';
const rewards=JSON.parse(readFileSync(new URL('../../data/campaign-rewards.json',import.meta.url),'utf8')) as Record<string,{level:number;next:number;rewards:number[][]}>;
import {randomInt,randomUUID} from 'node:crypto';
export async function battleRoutes(app:FastifyInstance,s:Storage){
 for(const mode of ['preview','challenge'])app.post<{Body:{mapId:number}}>('/v1/battle/'+mode,{schema:{body:{type:'object',required:['mapId'],additionalProperties:false,properties:{mapId:{type:'integer',minimum:100101,maximum:199999}}}}},async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1],id=token&&await sessionAccount(s,token);
 if(!id)return reply.code(401).send({error:'invalid_session'});
 const key='battle-preview:'+id;
 const n=await s.redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",{keys:[key],arguments:[]});
 if(Number(n)>12)return reply.code(429).send({error:'rate_limit'});
 const map=campaignUnits[req.body.mapId];if(!map)return reply.code(404).send({error:'map_not_found'});
 const profile=await getProfile(s,id);if(req.body.mapId>profile.stage)return reply.code(403).send({error:'stage_locked'});
 const cfg=rewards[req.body.mapId];if(!cfg||profile.level<cfg.level)return reply.code(403).send({error:'level_locked'});
 let squad:Awaited<ReturnType<typeof prepareSquad>>;try{squad=await prepareSquad(s,id)}catch(e){if(e instanceof Error&&['empty_formation','invalid_formation','hero_attributes_pending','hero_not_owned'].includes(e.message))return reply.code(409).send({error:e.message});throw e}
 const units:Fighter[]=[...squad.map((u:ReturnType<typeof import("./battleUnits.js").buildUnit>)=>({...u,camp:1 as const,is_boss:0,hurt:0,damage:0,cure:0,buffs:[]})),...map.units.map(u=>({...u,buffs:[]}))];
 const seed=randomInt(1,2147483647),r=simulate(units,battleRandom(seed),map.maxRounds);
 const report={version:1,battleId:randomUUID(),mapId:req.body.mapId,background:map.bg,seed,maxRounds:map.maxRounds,preview:mode==='preview',progressionApplied:false,initialUnits:units,summary:r.summary,pages:r.pages,issues:r.issues,parityReady:r.parityReady};
 if(mode==='challenge'){
 const c=await s.pg.connect();try{await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
 await c.query('INSERT INTO campaign_battles(id,account_id,map_id,report) VALUES($1,$2,$3,$4)',[report.battleId,id,report.mapId,JSON.stringify(report)]);
 await c.query('INSERT INTO campaign_pending(account_id,battle_id) VALUES($1,$2) ON CONFLICT(account_id) DO UPDATE SET battle_id=EXCLUDED.battle_id',[id,report.battleId]);await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 }return report;
 });

 app.post<{Body:{battleId:string}}>('/v1/battle/settle',{schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'}}}}},async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1],id=token&&await sessionAccount(s,token);if(!id)return reply.code(401).send({error:'invalid_session'});
 const c=await s.pg.connect();try{await c.query('BEGIN');
 const profile=(await c.query('SELECT level,stage FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
 const b=(await c.query('SELECT * FROM campaign_battles WHERE id=$1 AND account_id=$2',[req.body.battleId,id])).rows[0];
 if(!b){await c.query('ROLLBACK');return reply.code(404).send({error:'battle_not_found'})}
 if(b.settlement){await c.query('COMMIT');return b.settlement}
 const pending=(await c.query('SELECT battle_id FROM campaign_pending WHERE account_id=$1',[id])).rows[0];
 if(pending?.battle_id!==b.id){await c.query('ROLLBACK');return reply.code(409).send({error:'battle_expired'})}
 const win=b.report.summary.resultCode===2,cfg=rewards[b.map_id];let granted:number[][]=[],stage=profile.stage,level=profile.level;
 if(win&&b.map_id===stage&&cfg){
 const clear=await c.query('INSERT INTO campaign_clears(account_id,map_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING map_id',[id,b.map_id]);
 if(clear.rowCount){
 const grant=async(item:number,amount:number)=>{await c.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=CASE WHEN EXCLUDED.item_id=7 THEN LEAST(30000,player_items.amount+EXCLUDED.amount) ELSE player_items.amount+EXCLUDED.amount END',[id,item,amount])};
 granted=cfg.rewards;for(const [item,amount] of granted)await grant(item,amount);
 const xp=BigInt((await c.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=5',[id])).rows[0]?.amount??0);
 for(const row of playerLevels)if(row.id>level&&BigInt(row.xp)<=xp){level=row.id;for(const [item,amount] of row.rewards)await grant(item,amount)}
 stage=cfg.next>0?cfg.next:stage;await c.query('UPDATE player_profiles SET stage=$2,level=$3 WHERE account_id=$1',[id,stage,level]);
 }}
 const result={battleId:b.id,mapId:b.map_id,result:win?1:0,rewards:granted,playerLevel:profile.level,level,stage};
 await c.query('UPDATE campaign_battles SET settlement=$2 WHERE id=$1',[b.id,JSON.stringify(result)]);await c.query('DELETE FROM campaign_pending WHERE account_id=$1',[id]);await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });

 app.get('/v1/battle/pending',async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1],id=token&&await sessionAccount(s,token);
 if(!id)return reply.code(401).send({error:'invalid_session'});
 const row=(await s.pg.query('SELECT b.report FROM campaign_pending p JOIN campaign_battles b ON b.id=p.battle_id AND b.account_id=p.account_id WHERE p.account_id=$1',[id])).rows[0];
 return {report:row?.report??null};
 });
 app.post<{Body:{battleId:string}}>('/v1/battle/cancel',{schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'}}}}},async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1],id=token&&await sessionAccount(s,token);
 if(!id)return reply.code(401).send({error:'invalid_session'});
 const c=await s.pg.connect();try{await c.query('BEGIN');
 await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
 const r=await c.query('DELETE FROM campaign_pending WHERE account_id=$1 AND battle_id=$2 RETURNING battle_id',[id,req.body.battleId]);
 await c.query('COMMIT');return {cancelled:r.rowCount===1};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
}
