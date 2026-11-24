import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {randomBytes,randomUUID} from 'node:crypto';
import {hashPassword,verifyPassword,tokenHash,createGuest,sessionAccount} from './auth.js';
import {issueRecoveryCodes,recoverWithCode} from './recovery.js';
export async function authRoutes(app:FastifyInstance,s:Storage){
 const dummy=await hashPassword(randomBytes(32).toString('hex'));
 const credentials={type:'object',additionalProperties:false,required:['email','password'],properties:{email:{type:'string',maxLength:254,pattern:'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'},password:{type:'string',minLength:10,maxLength:128}}} as const;
 type Cred={email:string;password:string};
 const bearer=(h:string|undefined)=>/^Bearer ([A-Za-z0-9_-]{43})$/.exec(h??'')?.[1];
 app.addHook('preHandler',async(req,reply)=>{
  if(!req.url.startsWith('/v1/auth/'))return;
  const key='auth:rate:'+req.ip;
  const n=Number(await s.redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",{keys:[key],arguments:[]}));
  if(n>30)return reply.code(429).send({error:'rate_limit'});
 });
 app.post('/v1/auth/guest',async()=>createGuest(s));
 app.post<{Body:Cred}>('/v1/auth/register',{schema:{body:credentials}},async(req,reply)=>{
  const id=randomUUID(),token=randomBytes(32).toString('base64url'),hash=await hashPassword(req.body.password);const c=await s.pg.connect();
  try{await c.query('BEGIN');await c.query('INSERT INTO accounts(id,email,password_hash) VALUES($1,$2,$3)',[id,req.body.email.trim().toLowerCase(),hash]);await c.query("INSERT INTO sessions VALUES($1,$2,now()+interval '365 days')",[tokenHash(token),id]);await c.query('COMMIT');return reply.code(201).send({id,token})}
  catch(e){await c.query('ROLLBACK');if((e as {code?:string}).code==='23505')return reply.code(409).send({error:'account_exists'});throw e}
  finally{c.release()}
 });
 app.post<{Body:Cred}>('/v1/auth/login',{schema:{body:credentials}},async(req,reply)=>{
  const r=await s.pg.query('SELECT id,password_hash FROM accounts WHERE email=$1',[req.body.email.trim().toLowerCase()]);const a=r.rows[0];
  const valid=await verifyPassword(req.body.password,a?.password_hash??dummy);
  if(!a||!valid)return reply.code(401).send({error:'invalid_credentials'});
  const token=randomBytes(32).toString('base64url');
  await s.pg.query("INSERT INTO sessions VALUES($1,$2,now()+interval '365 days')",[tokenHash(token),a.id]);
  return {id:a.id,token};
 });
 // Account linking does not create a second account: the UUID stays stable for future game progress.
 // Session rotation invalidates the previous guest bearer after a successful link.
 app.post<{Body:Cred}>('/v1/auth/link',{schema:{body:credentials}},async(req,reply)=>{
  const t=bearer(req.headers.authorization);
  if(!t)return reply.code(401).send({error:'invalid_session'});
  const hash=await hashPassword(req.body.password),email=req.body.email.trim().toLowerCase();
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const locked=await c.query('SELECT account_id FROM sessions WHERE token_hash=$1 AND expires_at>now() FOR UPDATE',[tokenHash(t)]);
   if(!locked.rowCount){await c.query('ROLLBACK');return reply.code(401).send({error:'invalid_session'})}
   const id=locked.rows[0].account_id as string;
   const account=await c.query('UPDATE accounts SET email=$1,password_hash=$2 WHERE id=$3 AND email IS NULL RETURNING id',[email,hash,id]);
   if(!account.rowCount){await c.query('ROLLBACK');return reply.code(409).send({error:'not_guest'})}
   const token=randomBytes(32).toString('base64url');
   await c.query('DELETE FROM sessions WHERE account_id=$1',[id]);
   await c.query("INSERT INTO sessions VALUES($1,$2,now()+interval '365 days')",[tokenHash(token),id]);
   await c.query('COMMIT');
   return {id,token};
  }catch(e){
   await c.query('ROLLBACK');
   if((e as {code?:string}).code==='23505')return reply.code(409).send({error:'account_exists'});
   throw e;
  }finally{c.release()}
 });
 const codeSchema={type:'object',additionalProperties:false,required:['email','password','code'],properties:{email:{type:'string',maxLength:254},password:{type:'string',minLength:10,maxLength:128},code:{type:'string',minLength:24,maxLength:27,pattern:'^[A-Fa-f0-9-]+$'}}} as const;
 app.post('/v1/auth/recovery-codes',async(req,reply)=>{
  const t=bearer(req.headers.authorization);const id=t&&await sessionAccount(s,t);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const account=await s.pg.query('SELECT email FROM accounts WHERE id=$1',[id]);
  if(!account.rows[0]?.email)return reply.code(409).send({error:'link_email_first'});
  return {codes:await issueRecoveryCodes(s,id)};
 });
 app.post<{Body:{email:string;password:string;code:string}}>('/v1/auth/recover',{schema:{body:codeSchema}},async(req,reply)=>{
  const result=await recoverWithCode(s,req.body.email,req.body.code,req.body.password);
  if(!result)return reply.code(401).send({error:'invalid_recovery'});
  return result;
 });
 app.get('/v1/auth/session',async(req,reply)=>{
  const t=bearer(req.headers.authorization);
  const id=t&&await sessionAccount(s,t);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  return {id};
 });
 app.post('/v1/auth/logout',async(req,reply)=>{
  const t=bearer(req.headers.authorization);
  if(t)await s.pg.query('DELETE FROM sessions WHERE token_hash=$1',[tokenHash(t)]);
  return reply.code(204).send();
 });
}
