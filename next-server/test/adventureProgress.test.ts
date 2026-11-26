import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {getProfile} from '../src/profile.js';
import {pendingAdventure,pendingOnline} from '../src/adventureProgress.js';

test('pendingAdventure matches elixir economy_test gates',()=>{
 assert.deepEqual(pendingAdventure(0,100101),[]);
 const first=pendingAdventure(0,100102);
 assert.equal(first.length,1);
 assert.equal(first[0]!.id,1);
 assert.deepEqual(first[0]!.rewards,[[40122,1],[40222,1],[40322,1],[40422,1]]);
 const mid=pendingAdventure(1,100121);
 assert.deepEqual(mid.map(r=>r.id),[2,3]);
 assert.deepEqual(mid.flatMap(r=>r.rewards.map(([i])=>i)),[1012403,10403]);
});

test('pendingOnline matches 5m/10m tiers',()=>{
 assert.deepEqual(pendingOnline(0,4*60_000),[]);
 const two=pendingOnline(0,12*60_000);
 assert.equal(two.length,2);
 assert.deepEqual(two.map(t=>[t.itemId,t.count]),[[3,50],[1,50000]]);
 assert.equal(pendingOnline(2,12*60_000).length,0);
});

test('POST adventure + online claim',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  await s.pg.query('UPDATE player_profiles SET stage=100102 WHERE account_id=$1',[a.id]);
  const empty=await app.inject({method:'POST',url:'/v1/campaign/progress-rewards/adventure',headers});
  // stage 100102 should allow reward 1
  assert.equal(empty.statusCode,200,empty.body);
  assert.deepEqual(empty.json().rows,[1]);
  assert.ok(empty.json().rewards.some((r:number[])=>r[0]===40122));
  const bag=(await s.pg.query(
   'SELECT item_id FROM player_items WHERE account_id=$1 AND item_id IN (40122,40222,40322,40422)',[a.id],
  )).rows;
  assert.equal(bag.length,4);

  await s.pg.query('UPDATE player_profiles SET stage=100121 WHERE account_id=$1',[a.id]);
  const more=await app.inject({method:'POST',url:'/v1/campaign/progress-rewards/adventure',headers});
  assert.equal(more.statusCode,200,more.body);
  assert.deepEqual(more.json().rows,[2,3]);
  assert.equal(more.json().claimed,3);

  const again=await app.inject({method:'POST',url:'/v1/campaign/progress-rewards/adventure',headers});
  assert.equal(again.statusCode,409);

  await s.pg.query(
   `UPDATE player_profiles SET last_login_at=now()-interval '12 minutes',online_reward_index=0 WHERE account_id=$1`,
   [a.id],
  );
  const online=await app.inject({method:'POST',url:'/v1/campaign/progress-rewards/online',headers});
  assert.equal(online.statusCode,200,online.body);
  assert.deepEqual(online.json().rewards,[[3,50],[1,50000]]);
  assert.equal(online.json().index,2);

  const preview=await app.inject({url:'/v1/campaign/progress-rewards',headers});
  assert.equal(preview.statusCode,200);
  assert.equal(preview.json().adventure.claimed,3);
  assert.equal(preview.json().online.index,2);
  assert.equal(preview.json().online.claimable,false);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
