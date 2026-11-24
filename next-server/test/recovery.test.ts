import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openStorage,migrate} from '../src/storage.js';
import {buildApp} from '../src/app.js';
test('one-time recovery and session revocation',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const app=await buildApp(s);
 const email=randomUUID()+'@example.test',password='test-password-123',newPassword='New-password-123';
 const ip='192.0.2.69',post=(path:string,body:object,token?:string)=>app.inject({method:'POST',url:'/v1/auth/'+path,remoteAddress:ip,payload:body,headers:token?{authorization:'Bearer '+token}:{}});
 let id:string|undefined;
 try{
  const registration=await post('register',{email,password});assert.equal(registration.statusCode,201);id=registration.json().id;
  const oldToken=registration.json().token;
  const generated=await post('recovery-codes',{},oldToken);assert.equal(generated.statusCode,200);
  const codes=generated.json().codes as string[];assert.equal(codes.length,8);assert.equal(new Set(codes).size,8);
  const stored=await s.pg.query('SELECT code_hash FROM recovery_codes WHERE account_id=$1',[id]);assert.equal(stored.rowCount,8);assert.ok(stored.rows.every(row=>!codes.includes(row.code_hash)));
  const invalid=await post('recover',{email,password:newPassword,code:'AAAAAA-BBBBBB-CCCCCC-DDDDDD'});assert.equal(invalid.statusCode,401);
  const recovery=await post('recover',{email,password:newPassword,code:codes[0]});assert.equal(recovery.statusCode,200);assert.equal(recovery.json().id,id);
  assert.equal((await app.inject({url:'/v1/auth/session',remoteAddress:ip,headers:{authorization:'Bearer '+oldToken}})).statusCode,401);
  assert.equal((await post('recover',{email,password:newPassword,code:codes[0]})).statusCode,401);
  assert.equal((await post('login',{email,password})).statusCode,401);
  assert.equal((await post('login',{email,password:newPassword})).statusCode,200);
  assert.equal((await s.pg.query('SELECT COUNT(*)::integer AS count FROM recovery_codes WHERE account_id=$1',[id])).rows[0].count,7);
  const rotate=await post('recovery-codes',{},recovery.json().token);assert.equal(rotate.statusCode,200);
  assert.equal((await post('recover',{email,password:newPassword,code:codes[1]})).statusCode,401);
 }finally{if(id)await s.pg.query('DELETE FROM accounts WHERE id=$1',[id]);await s.redis.del('auth:rate:'+ip);await app.close()}
});
