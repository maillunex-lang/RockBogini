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
 for(const r of rs){assert.equal(r.statusCode,200);assert.deepEqual(r.json().heroes.map(({base,skillSlots,maxLevel,...h}:any)=>h),starterHeroes);assert.equal(r.json().heroes[0].skillSlots[1].unlockLevel,31);assert.equal(r.json().heroes[0].skillSlots[1].unlocked,false);assert.equal(r.json().heroes[0].maxLevel,60)}
 await s.pg.query('UPDATE player_heroes SET locked=true WHERE account_id=$1 AND sid=1001',[a.id]);
 assert.equal((await get(a.token)).json().heroes[0].Locked,true);
 assert.deepEqual((await get(b.token)).json().heroes.map(({base,skillSlots,maxLevel,...h}:any)=>h),starterHeroes);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await app.close()}
});

test('POST /v1/heroes/:sid/level spends HeroLevel materials',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,22,100),($1,1,200)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const r=await app.inject({method:'POST',url:'/v1/heroes/1001/level',headers:{authorization:'Bearer '+a.token},payload:{newLevel:2}});
  assert.equal(r.statusCode,200);
  const body=r.json();
  assert.equal(body.hero.Level,2);
  assert.ok(body.cost.some((c:[number,number])=>c[0]===22&&c[1]===12));
  const cap=await app.inject({method:'POST',url:'/v1/heroes/1001/level',headers:{authorization:'Bearer '+a.token},payload:{newLevel:999}});
  assert.equal(cap.statusCode,409);
  assert.equal(cap.json().error,'level_cap');
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/heroes/:sid/star free path while ItemMaterials empty',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  // starters are ★3; ★4 has empty materials → free
  const r=await app.inject({method:'POST',url:'/v1/heroes/1001/star',headers:{authorization:'Bearer '+a.token}});
  assert.equal(r.statusCode,200);
  assert.equal(r.json().hero.StarLevel,4);
  assert.deepEqual(r.json().cost,[]);
  // ★5 needs fodder heroes
  const blocked=await app.inject({method:'POST',url:'/v1/heroes/1001/star',headers:{authorization:'Bearer '+a.token}});
  assert.equal(blocked.statusCode,409);
  assert.equal(blocked.json().error,'star_needs_fodder');
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
