import {profileConfig} from './profileConfig.js';
import type {Storage} from './storage.js';
import type {FastifyInstance} from 'fastify';
import {sessionAccount} from './auth.js';
export async function getProfile(s:Storage,id:string){
 const c=await s.pg.connect();
 try{
 await c.query('BEGIN');
 const created=await c.query('INSERT INTO player_profiles(account_id,nickname) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING account_id',[id,'User'+id.replace(/-/g,'').slice(0,12)]);
 if(created.rowCount)await c.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,110010,3)',[id]);
 const profile=(await c.query('SELECT account_id,nickname,level,avatar,frame,power,stage,rename_count,created_at FROM player_profiles WHERE account_id=$1',[id])).rows[0];
 const items=(await c.query('SELECT item_id,amount::text FROM player_items WHERE account_id=$1 ORDER BY item_id',[id])).rows;
 await c.query('COMMIT');
 const balances=Object.fromEntries(items.map(x=>[x.item_id,x.amount]));
 return {...profile,experience:balances[5]??'0',currencies:{coin:balances[1]??'0',diamond:balances[3]??'0',colorDiamond:balances[4]??'0',intelligence:balances[7]??'0',vipPoint:balances[2]??'0',xpWater:balances[22]??'0'}};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
export async function profileRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/profile',async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 const id=token&&await sessionAccount(s,token);
 if(!id)return reply.code(401).send({error:'invalid_session'});
 return getProfile(s,id);
 });
 app.patch<{Body:{nickname?:string;avatar?:number;frame?:number}}>('/v1/profile',{schema:{body:{type:'object',additionalProperties:false,minProperties:1,properties:{nickname:{type:'string',maxLength:64},avatar:{type:'integer'},frame:{type:'integer'}}}}},async(req,reply)=>{
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 const id=token&&await sessionAccount(s,token);
 if(!id)return reply.code(401).send({error:'invalid_session'});
 const {avatar,frame}=req.body,nickname=req.body.nickname?.trim();
 if(nickname!==undefined&&([...nickname].length<profileConfig.min||[...nickname].length>profileConfig.max))return reply.code(400).send({error:'invalid_name'});
 if(avatar!==undefined&&!(profileConfig.icons as readonly number[]).includes(avatar)||frame!==undefined&&!(profileConfig.frames as readonly number[]).includes(frame))return reply.code(400).send({error:'invalid_icon'});
 await getProfile(s,id);
 const c=await s.pg.connect();
 try{
 await c.query('BEGIN');
 const p=(await c.query('SELECT nickname,rename_count FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
 if(nickname!==undefined){
 if(nickname===p.nickname){await c.query('ROLLBACK');return reply.code(400).send({error:'same_name'})}
 const price=profileConfig.rename[Math.min(p.rename_count,profileConfig.rename.length-1)];
 if(price>0){const paid=await c.query('UPDATE player_items SET amount=amount-$2 WHERE account_id=$1 AND item_id=3 AND amount >= $2',[id,price]);if(!paid.rowCount){await c.query('ROLLBACK');return reply.code(409).send({error:'insufficient_diamond'})}}
 await c.query('UPDATE player_profiles SET nickname=$2,rename_count=rename_count+1 WHERE account_id=$1',[id,nickname]);
 }
 await c.query('UPDATE player_profiles SET avatar=COALESCE($2,avatar),frame=COALESCE($3,frame) WHERE account_id=$1',[id,avatar??null,frame??null]);
 await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 return getProfile(s,id);
 });

}
