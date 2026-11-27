import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
const cfg=JSON.parse(readFileSync(new URL('../../data/pioneering-achievements.json',import.meta.url),'utf8'));
test('original achievement table preserves 4 exact IDs, goals and prize types',()=>{
 assert.deepEqual(Object.keys(cfg).sort(),['3002','3003','3004','3005']);
 assert.deepEqual(cfg['3003'].params,[2,10000000000]);
 assert.deepEqual(cfg['3003'].uniqueReward,[[3345,1]]);
 assert.deepEqual(cfg['3003'].rewardsForAll,[[3,300]]);
});
test('pioneering reward is server-authoritative, first-win only, atomic and cannot be claimed twice',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s);
 const app=await buildApp(s);const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 try{
  const anonymous=await app.inject({url:'/v1/tasks/pioneering'});
  assert.equal(anonymous.statusCode,401);
  const initial=await app.inject({url:'/v1/tasks/pioneering',headers:ha});
  assert.equal(initial.statusCode,200,initial.body);
  assert.equal(initial.json().achievements.length,4);
  assert.equal(initial.json().achievements.filter((x:{enabled:boolean})=>x.enabled).length,1);
  assert.equal((await app.inject({method:'POST',url:'/v1/tasks/pioneering/claim',headers:ha,payload:{achievementIds:[3003]}})).statusCode,409);
  await s.pg.query('UPDATE player_profiles SET power=10000000000 WHERE account_id=$1',[a.id]);
  const awarded=await app.inject({url:'/v1/tasks/pioneering',headers:ha});
  assert.equal(awarded.statusCode,200,awarded.body);
  assert.equal(awarded.json().achievements.find((x:{id:number})=>x.id===3003).ready,true);
  const claimed=await app.inject({method:'POST',url:'/v1/tasks/pioneering/claim',headers:ha,payload:{achievementIds:[3003]}});
  assert.equal(claimed.statusCode,200,claimed.body);
  assert.deepEqual(claimed.json().rewards,[[3,300],[3345,1]]);
  assert.equal((await app.inject({method:'POST',url:'/v1/tasks/pioneering/claim',headers:ha,payload:{achievementIds:[3003]}})).statusCode,409);
  const item=(await s.pg.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=3345',[a.id])).rows[0];
  assert.equal(Number(item.amount),1);
  const disabled=await app.inject({method:'POST',url:'/v1/tasks/pioneering/claim',headers:ha,payload:{achievementIds:[3004]}});
  assert.equal(disabled.statusCode,409);
  await s.pg.query('UPDATE player_profiles SET power=10000000000 WHERE account_id=$1',[b.id]);
  const second=await app.inject({url:'/v1/tasks/pioneering',headers:hb});
  assert.equal(second.json().achievements.find((x:{id:number})=>x.id===3003).ready,false);
  assert.equal((await app.inject({method:'POST',url:'/v1/tasks/pioneering/claim',headers:hb,payload:{achievementIds:[3003]}})).statusCode,409);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
  await app.close();
 }
});
