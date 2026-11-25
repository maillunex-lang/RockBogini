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
 const challenge=await app.inject({method:'POST',url:'/v1/battle/challenge',headers,payload:{mapId:100101}});
 assert.equal(challenge.statusCode,200,challenge.body);const battle=challenge.json();assert.equal(battle.summary.resultCode,2);
 const settle=()=>app.inject({method:'POST',url:'/v1/battle/settle',headers,payload:{battleId:battle.battleId}});
 const [a,b]=await Promise.all([settle(),settle()]);assert.equal(a.statusCode,200,a.body);assert.equal(b.statusCode,200,b.body);assert.deepEqual(a.json(),b.json());
 const after=await getProfile(s,guest.id);assert.equal(after.stage,100102);assert.equal(after.experience,'200');assert.equal(after.level,2);assert.equal(after.currencies.coin,'4000');assert.equal(after.currencies.diamond,'10');
 const replay=await app.inject({method:'POST',url:'/v1/battle/challenge',headers,payload:{mapId:100101}});assert.equal(replay.statusCode,200);
 const settled=await app.inject({method:'POST',url:'/v1/battle/settle',headers,payload:{battleId:replay.json().battleId}});assert.equal(settled.statusCode,200);assert.deepEqual(settled.json().rewards,[]);assert.deepEqual(await getProfile(s,guest.id),after);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[guest.id]);await s.redis.del('battle-preview:'+guest.id);await app.close()}
});
