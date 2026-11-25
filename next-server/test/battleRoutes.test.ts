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

test('pending battle recovery, replacement, cancellation and account isolation',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s),b=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token},other={authorization:'Bearer '+b.token};
 const pending=(h=headers)=>app.inject({url:'/v1/battle/pending',headers:h});
 const post=(route:string,payload:object,h=headers)=>app.inject({method:'POST',url:'/v1/battle/'+route,headers:h,payload});
 try{
 assert.equal((await pending()).json().report,null);
 const first=await post('challenge',{mapId:100101});assert.equal(first.statusCode,200,first.body);
 const report=first.json();assert.deepEqual((await pending()).json().report,report);
 assert.equal((await pending(other)).json().report,null);
 assert.equal((await post('cancel',{battleId:report.battleId},other)).json().cancelled,false);
 assert.equal((await post('settle',{battleId:report.battleId},other)).statusCode,404);
 const next=await post('challenge',{mapId:100101});assert.equal(next.statusCode,200);const id=next.json().battleId;
 assert.equal((await post('cancel',{battleId:report.battleId})).json().cancelled,false);
 assert.equal((await post('settle',{battleId:report.battleId})).statusCode,409);
 assert.equal((await pending()).json().report.battleId,id);
 const before=await getProfile(s,a.id);
 assert.equal((await post('cancel',{battleId:id})).json().cancelled,true);
 assert.equal((await post('cancel',{battleId:id})).json().cancelled,false);
 assert.equal((await pending()).json().report,null);
 assert.equal((await post('settle',{battleId:id})).statusCode,409);
 assert.deepEqual(await getProfile(s,a.id),before);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await s.redis.del(['battle-preview:'+a.id,'battle-preview:'+b.id]);await app.close()}
});
