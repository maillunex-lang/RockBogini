import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {getProfile} from '../src/profile.js';
test('authenticated preview does not advance progress',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const guest=await createGuest(s);const app=await buildApp(s);
 const url='/v1/battle/preview',headers={authorization:'Bearer '+guest.token};
 try{
 assert.equal((await app.inject({method:'POST',url,payload:{mapId:100101}})).statusCode,401);
 const before=await getProfile(s,guest.id);
 assert.equal((await app.inject({method:'POST',url,headers,payload:{mapId:100102}})).statusCode,403);
 const res=await app.inject({method:'POST',url,headers,payload:{mapId:100101}});
 assert.equal(res.statusCode,200,res.body);const r=res.json();
 assert.equal(r.preview,true);assert.equal(r.progressionApplied,false);assert.ok(r.pages.length);
 assert.deepEqual(await getProfile(s,guest.id),before);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[guest.id]);await s.redis.del('battle-preview:'+guest.id);await app.close()}
});
