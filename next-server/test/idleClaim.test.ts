import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {getProfile} from '../src/profile.js';
import {accrueIdle,claimIdle,IDLE_LIMIT_MINUTES,idleStageRates,orderedIdleRewards} from '../src/campaignDependencies.js';

test('idle stage rates and ordered rewards',()=>{
 const rates=idleStageRates(100101);
 assert.ok(rates.common.some(r=>r.itemId===1&&r.perMinute>0));
 assert.equal(IDLE_LIMIT_MINUTES,720);
 const pending=orderedIdleRewards(100101,{1:10,5:2,99999:1});
 assert.deepEqual(pending[0],[1,10]);
 assert.ok(pending.some(([id,n])=>id===5&&n===2));
 assert.ok(pending.some(([id,n])=>id===99999&&n===1));
});

test('GET idle + POST claim grants and clears',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  // Backdate receive so accrual produces whole coins.
  await s.pg.query(
   `INSERT INTO campaign_idle(account_id,received_at,settled_at,points,rewards)
    SELECT id,now()-interval '30 minutes',now()-interval '30 minutes','{}'::jsonb,'{}'::jsonb FROM accounts WHERE id=$1
    ON CONFLICT(account_id) DO UPDATE SET received_at=EXCLUDED.received_at,settled_at=EXCLUDED.settled_at,rewards='{}'::jsonb,points='{}'::jsonb`,
   [a.id],
  );
  const preview=await app.inject({url:'/v1/campaign/idle',headers});
  assert.equal(preview.statusCode,200,preview.body);
  const body=preview.json() as {minutes:number;rewards:number[][];limitMinutes:number;capped:boolean};
  assert.ok(body.minutes>=29);
  assert.equal(body.limitMinutes,720);
  assert.equal(body.capped,false);
  assert.ok(body.rewards.length>0,JSON.stringify(body));
  const coinBefore=Number((await s.pg.query(
   'SELECT amount FROM player_items WHERE account_id=$1 AND item_id=1',[a.id],
  )).rows[0]?.amount??0);
  const claim=await app.inject({method:'POST',url:'/v1/campaign/idle/claim',headers});
  assert.equal(claim.statusCode,200,claim.body);
  const claimed=claim.json() as {rewards:number[][]};
  assert.ok(claimed.rewards.length>0);
  const coinGain=claimed.rewards.find(([id])=>id===1)?.[1]??0;
  const coinAfter=Number((await s.pg.query(
   'SELECT amount FROM player_items WHERE account_id=$1 AND item_id=1',[a.id],
  )).rows[0]?.amount??0);
  assert.equal(coinAfter,coinBefore+coinGain);
  const empty=await app.inject({method:'POST',url:'/v1/campaign/idle/claim',headers});
  assert.equal(empty.statusCode,409);
  assert.equal(empty.json().error,'nothing_to_claim');
  const again=await app.inject({url:'/v1/campaign/idle',headers});
  assert.equal(again.statusCode,200);
  assert.deepEqual(again.json().rewards,[]);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('claimIdle keeps fractional points across claim',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const c=await s.pg.connect();
 try{
  await c.query('BEGIN');
  const partial=accrueIdle(100101,1,{},()=>1);
  await c.query(
   `INSERT INTO campaign_idle(account_id,received_at,settled_at,points,rewards)
    VALUES($1,now(),now(),$2::jsonb,'{}'::jsonb)
    ON CONFLICT(account_id) DO UPDATE SET points=EXCLUDED.points,rewards='{}'::jsonb,received_at=now(),settled_at=now()`,
   [a.id,JSON.stringify(partial.points)],
  );
  await claimIdle(c,a.id,100101);
  const row=(await c.query('SELECT points,rewards FROM campaign_idle WHERE account_id=$1',[a.id])).rows[0];
  assert.deepEqual(row.points,partial.points);
  assert.deepEqual(row.rewards,{});
  await c.query('ROLLBACK');
 }finally{c.release();await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await s.close()}
});
