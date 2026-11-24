import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
test('studio routes deny guest and non-admin; persist versions and restore only for active admin',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const guest=await createGuest(s),admin=await createGuest(s);
 const app=await buildApp(s);const url='/v1/studio/drafts/test_'+randomUUID().replaceAll('-','')+'/skill/1';
 const headers=(token:string)=>({authorization:'Bearer '+token});
 const put=(token:string,expectedRevision:number,payload:object)=>app.inject({method:'PUT',url,headers:headers(token),payload:{expectedRevision,payload}});
 try{
  assert.equal((await app.inject({url:'/v1/studio/me'})).statusCode,401);
  assert.equal((await app.inject({url,headers:headers(guest.token)})).statusCode,403);
  assert.equal((await put(guest.token,0,{start:1})).statusCode,403);
  assert.equal((await app.inject({url,headers:headers(admin.token)})).statusCode,403);
  await s.pg.query("UPDATE accounts SET email=$2,password_hash='test' WHERE id=$1",[admin.id,'studio_admin_'+randomUUID().replaceAll('-','')+'@example.test']);
  await s.pg.query('INSERT INTO studio_admins(account_id) VALUES($1)',[admin.id]);
  assert.equal((await app.inject({url:'/v1/studio/me',headers:headers(admin.token)})).statusCode,200);
  assert.equal((await put(admin.token,0,{start:1})).statusCode,200);
  assert.equal((await put(admin.token,0,{start:2})).statusCode,409);
  assert.equal((await put(admin.token,1,{start:2})).json().revision,2);
  const get=await app.inject({url,headers:headers(admin.token)});assert.equal(get.statusCode,200);
  assert.equal(get.json().history.length,2);
  const restore=await app.inject({method:'POST',url:url+'/restore',headers:headers(admin.token),payload:{expectedRevision:2,restoreRevision:1}});
  assert.equal(restore.statusCode,200);assert.deepEqual(restore.json().payload,{start:1});
  assert.equal((await app.inject({url,headers:headers(guest.token)})).statusCode,403);
  await s.pg.query('DELETE FROM studio_admins WHERE account_id=$1',[admin.id]);
  assert.equal((await app.inject({url,headers:headers(admin.token)})).statusCode,403);
  assert.equal((await app.inject({url:'/v1/studio/drafts/x/skill/1001',headers:headers(admin.token)})).statusCode,403);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[guest.id,admin.id]]);await app.close()}
});
