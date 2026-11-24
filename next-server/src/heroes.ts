import {calculateHero,skillSlots} from './heroAttrs.js';
import type {Storage} from './storage.js';
import type {FastifyInstance} from 'fastify';
import {sessionAccount} from './auth.js';
import {starterHeroes} from './starterHeroes.js';
export async function getHeroes(s:Storage,id:string){
 const c=await s.pg.connect();
 try{
 await c.query('BEGIN');
 const created=await c.query('INSERT INTO hero_collections(account_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING account_id',[id]);
 if(created.rowCount)for(const h of starterHeroes)await c.query('INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,h.Sid,h.HeroId,h.Level,h.StarLevel,h.Power,h.Locked,JSON.stringify(h)]);
 const rows=(await c.query('SELECT sid,hero_id,level,star,power,locked,state FROM player_heroes WHERE account_id=$1 ORDER BY sid',[id])).rows;
 await c.query('COMMIT');
 return rows.map(r=>({...r.state,Sid:r.sid,HeroId:r.hero_id,Level:r.level,StarLevel:r.star,Power:r.power,Locked:r.locked}));
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
export async function heroRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/heroes',async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 const id=token&&await sessionAccount(s,token);
 if(!id)return reply.code(401).send({error:'invalid_session'});
 return {heroes:(await getHeroes(s,id)).map(h=>({...h,base:calculateHero(h.HeroId,h.Level,h.StarLevel),skillSlots:skillSlots(h.HeroId,h.Level,h.StarLevel)}))};
 });
}
