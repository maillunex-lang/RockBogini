import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {getProfile} from '../src/profile.js';
import {
 accrueIdle,
 QUICK_BATTLE_MINUTES,
 QUICK_DIAMOND_COSTS,
 QUICK_FREE_DAILY,
 QUICK_PAID_DAILY,
 quickBattleCost,
} from '../src/campaignDependencies.js';

test('quick battle constants match elixir economy_test',()=>{
 assert.equal(QUICK_BATTLE_MINUTES,120);
 assert.equal(QUICK_FREE_DAILY,1);
 assert.equal(QUICK_PAID_DAILY,3);
 assert.deepEqual([...QUICK_DIAMOND_COSTS],[50,100,150]);
 assert.equal(quickBattleCost(0),50);
 assert.equal(quickBattleCost(2),150);
 assert.equal(quickBattleCost(99),150);
 const a=accrueIdle(100101,120,{},()=>1);
 assert.ok((a.rewards[1]??0)>=20000);
});

test('POST quick: free then diamond then limit',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,3,1000)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=1000`,
   [a.id],
  );
  const info=await app.inject({url:'/v1/campaign/idle',headers});
  assert.equal(info.statusCode,200,info.body);
  assert.equal(info.json().quick.freeLeft,1);
  assert.equal(info.json().quick.nextCost,0);

  const free=await app.inject({method:'POST',url:'/v1/campaign/idle/quick',headers});
  assert.equal(free.statusCode,200,free.body);
  assert.equal(free.json().paid,0);
  assert.equal(free.json().durationMinutes,120);
  assert.ok(free.json().rewards.length>0);
  assert.equal(free.json().freeLeft,0);
  assert.equal(free.json().nextCost,50);

  for(const cost of [50,100,150]){
   const before=Number((await s.pg.query(
    'SELECT amount FROM player_items WHERE account_id=$1 AND item_id=3',[a.id],
   )).rows[0].amount);
   const paid=await app.inject({method:'POST',url:'/v1/campaign/idle/quick',headers});
   assert.equal(paid.statusCode,200,paid.body);
   assert.equal(paid.json().paid,cost);
   const diamondGain=paid.json().rewards.find((r:number[])=>r[0]===3)?.[1]??0;
   const after=Number((await s.pg.query(
    'SELECT amount FROM player_items WHERE account_id=$1 AND item_id=3',[a.id],
   )).rows[0].amount);
   assert.equal(after,before-cost+diamondGain);
  }

  const limited=await app.inject({method:'POST',url:'/v1/campaign/idle/quick',headers});
  assert.equal(limited.statusCode,409);
  assert.equal(limited.json().error,'quick_limit');
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
