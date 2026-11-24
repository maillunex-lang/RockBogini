import type {Storage} from './storage.js';
import type {FastifyInstance} from 'fastify';
import {sessionAccount} from './auth.js';
import {getHeroes} from './heroes.js';
import {getProfile} from './profile.js';
import {formations} from './formationConfig.js';
export async function formationRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/formation/config',async()=>({formations}));
 app.get('/v1/formation',async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1],id=token&&await sessionAccount(s,token);
 if(!id)return reply.code(401).send({error:'invalid_session'});
 await getHeroes(s,id);
 await s.pg.query('INSERT INTO player_formations(account_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
 return (await s.pg.query('SELECT formation_type,hero_ids FROM player_formations WHERE account_id=$1',[id])).rows[0];
 });
 app.put<{Body:{formation_type:number;hero_ids:number[]}}>('/v1/formation',{schema:{body:{type:'object',required:['formation_type','hero_ids'],additionalProperties:false,properties:{formation_type:{type:'integer'},hero_ids:{type:'array',minItems:6,maxItems:6,items:{type:'integer',minimum:0,maximum:2147483647}}}}}},async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1],id=token&&await sessionAccount(s,token);
 if(!id)return reply.code(401).send({error:'invalid_session'});
 const {formation_type,hero_ids}=req.body,used=hero_ids.filter(x=>x>0);
 if(!formations.some(f=>f.Id===formation_type)||new Set(used).size!==used.length)return reply.code(400).send({error:'invalid_formation'});
 await getHeroes(s,id);await getProfile(s,id);
 const c=await s.pg.connect();try{await c.query('BEGIN');
 await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
 const owned=await c.query('SELECT sid,power FROM player_heroes WHERE account_id=$1 AND sid=ANY($2::integer[]) FOR UPDATE',[id,used]);
 if(owned.rowCount!==used.length){await c.query('ROLLBACK');return reply.code(400).send({error:'hero_not_owned'})}
 const power=owned.rows.reduce((n,h)=>n+h.power,0);
 await c.query('INSERT INTO player_formations(account_id,formation_type,hero_ids) VALUES($1,$2,$3) ON CONFLICT(account_id) DO UPDATE SET formation_type=EXCLUDED.formation_type,hero_ids=EXCLUDED.hero_ids',[id,formation_type,hero_ids]);
 await c.query('UPDATE player_profiles SET power=$2 WHERE account_id=$1',[id,power]);
 await c.query('COMMIT');return {formation_type,hero_ids,power};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
}
