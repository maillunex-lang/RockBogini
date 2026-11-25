import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {prepareSquad} from './battleUnits.js';
import {getProfile} from './profile.js';
import {campaignUnits} from './campaignUnits.js';
import {simulate,type Fighter} from './battle/simulation.js';
import {battleRandom} from './battle/random.js';
import {randomInt,randomUUID} from 'node:crypto';
export async function battleRoutes(app:FastifyInstance,s:Storage){
 app.post<{Body:{mapId:number}}>('/v1/battle/preview',{schema:{body:{type:'object',required:['mapId'],additionalProperties:false,properties:{mapId:{type:'integer',minimum:100101,maximum:199999}}}}},async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1],id=token&&await sessionAccount(s,token);
 if(!id)return reply.code(401).send({error:'invalid_session'});
 const key='battle-preview:'+id;
 const n=await s.redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",{keys:[key],arguments:[]});
 if(Number(n)>12)return reply.code(429).send({error:'rate_limit'});
 const map=campaignUnits[req.body.mapId];if(!map)return reply.code(404).send({error:'map_not_found'});
 const profile=await getProfile(s,id);if(req.body.mapId>profile.stage)return reply.code(403).send({error:'stage_locked'});
 let squad:Awaited<ReturnType<typeof prepareSquad>>;try{squad=await prepareSquad(s,id)}catch(e){if(e instanceof Error&&['empty_formation','invalid_formation','hero_attributes_pending','hero_not_owned'].includes(e.message))return reply.code(409).send({error:e.message});throw e}
 const units:Fighter[]=[...squad.map((u:ReturnType<typeof import("./battleUnits.js").buildUnit>)=>({...u,camp:1 as const,is_boss:0,hurt:0,damage:0,cure:0,buffs:[]})),...map.units.map(u=>({...u,buffs:[]}))];
 const seed=randomInt(1,2147483647),r=simulate(units,battleRandom(seed),map.maxRounds);
 return {version:1,battleId:randomUUID(),mapId:req.body.mapId,background:map.bg,seed,maxRounds:map.maxRounds,preview:true,progressionApplied:false,initialUnits:units,summary:r.summary,pages:r.pages,issues:r.issues,parityReady:r.parityReady};
 });
}
