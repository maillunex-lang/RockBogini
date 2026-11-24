import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openStorage,migrate} from '../src/storage.js';
import {buildApp} from '../src/app.js';

test('guest links email, retains UUID, rotates bearer; duplicate email stays unattached',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const app=await buildApp(s);
 const email=randomUUID()+'@example.test',password='sample-password-123';
 const ip='192.0.2.64';
 const request=(path:string,body:object,token?:string)=>app.inject({method:'POST',url:'/v1/auth/'+path,payload:body,remoteAddress:ip,headers:token?{authorization:'Bearer '+token}:{}});
 const ids:string[]=[];
 try{
  const reg=await request('register',{email,password});assert.equal(reg.statusCode,201);ids.push(reg.json().id);
  const g=await request('guest',{});assert.equal(g.statusCode,200);ids.push(g.json().id);
  assert.equal((await request('link',{email,password},g.json().token)).statusCode,409);
  assert.equal((await app.inject({url:'/v1/auth/session',headers:{authorization:'Bearer '+g.json().token},remoteAddress:ip})).statusCode,200);
  const newEmail=randomUUID()+'@example.test';
  const invalid=await request('link',{email:newEmail,password});assert.equal(invalid.statusCode,401);
  const linked=await request('link',{email:newEmail,password},g.json().token);
  assert.equal(linked.statusCode,200);assert.equal(linked.json().id,g.json().id);
  assert.notEqual(linked.json().token,g.json().token);
  const old=await app.inject({url:'/v1/auth/session',headers:{authorization:'Bearer '+g.json().token},remoteAddress:ip});
  assert.equal(old.statusCode,401);
  assert.equal((await request('link',{email:newEmail,password},linked.json().token)).statusCode,409);
  const login=await request('login',{email:newEmail,password});
  assert.equal(login.statusCode,200);assert.equal(login.json().id,g.json().id);
  const accounts=await s.pg.query('SELECT COUNT(*)::integer AS count FROM accounts WHERE id=ANY($1::uuid[])',[ids]);
  assert.equal(accounts.rows[0].count,2);
 }finally{
  for(const id of ids)await s.pg.query('DELETE FROM accounts WHERE id=$1',[id]);
  await s.redis.del('auth:rate:'+ip);
  await app.close();
 }
});
test('auth rate limit rejects the 31st request for same remote address',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();const app=await buildApp(s),ip='192.0.2.65';
 try{
  await s.redis.del('auth:rate:'+ip);
  for(let i=0;i<30;i++)assert.equal((await app.inject({url:'/v1/auth/session',remoteAddress:ip})).statusCode,401);
  assert.equal((await app.inject({url:'/v1/auth/session',remoteAddress:ip})).statusCode,429);
 }finally{await s.redis.del('auth:rate:'+ip);await app.close()}
});
