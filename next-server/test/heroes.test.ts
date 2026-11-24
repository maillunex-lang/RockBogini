import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {starterHeroes} from '../src/starterHeroes.js';
test('starter collection is atomic, persistent and isolated',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s),b=await createGuest(s);const app=await buildApp(s);
 try{
 const get=(token:string)=>app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+token}});
 assert.equal((await app.inject('/v1/heroes')).statusCode,401);
 const rs=await Promise.all([get(a.token),get(a.token)]);
 for(const r of rs){assert.equal(r.statusCode,200);assert.deepEqual(r.json().heroes.map(({base,skillSlots,...h}:any)=>h),starterHeroes);assert.equal(r.json().heroes[0].skillSlots[1].unlockLevel,31);assert.equal(r.json().heroes[0].skillSlots[1].unlocked,false)}
 await s.pg.query('UPDATE player_heroes SET locked=true WHERE account_id=$1 AND sid=1001',[a.id]);
 assert.equal((await get(a.token)).json().heroes[0].Locked,true);
 assert.deepEqual((await get(b.token)).json().heroes.map(({base,skillSlots,...h}:any)=>h),starterHeroes);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await app.close()}
});
