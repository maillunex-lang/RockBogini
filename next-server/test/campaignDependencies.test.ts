import test from 'node:test';
import assert from 'node:assert/strict';
import {accrueIdle,eligibleModules,settleIdle,refreshModules} from '../src/campaignDependencies.js';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {getProfile} from '../src/profile.js';
test('idle fractional points survive split intervals and stage changes',()=>{
 const pick=()=>1;
 const a=accrueIdle(100101,7,{},pick),b=accrueIdle(100101,13,a.points,pick),all=accrueIdle(100101,20,{},pick);
 assert.deepEqual(b.points,all.points);
 const combined={...a.rewards};for(const [k,v] of Object.entries(b.rewards))combined[Number(k)]=(combined[Number(k)]??0)+v;
 assert.deepEqual(combined,all.rewards);
 const c=accrueIdle(100102,0,b.points,pick);assert.deepEqual(c.rewards,{});assert.deepEqual(c.points,b.points);
});
test('module unlock uses strictly passed stage',()=>{
 const p={level:1,stage:100106,days:1,vip:0,power:0};
 assert.ok(!eligibleModules(p).includes(1053));assert.ok(eligibleModules({...p,stage:100107}).includes(1053));
});
test('idle cap and persistent module refresh are idempotent',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);const c=await s.pg.connect();
 try{await c.query('BEGIN');await c.query("UPDATE accounts SET created_at=now()-interval '2 days' WHERE id=$1",[a.id]);
 await settleIdle(c,a.id,100101);const read=async()=>(await c.query('SELECT * FROM campaign_idle WHERE account_id=$1',[a.id])).rows[0];
 const before=await read();assert.equal((+before.settled_at-+before.received_at)/60000,720);
 await settleIdle(c,a.id,100102);assert.deepEqual(await read(),before);
 const first=await refreshModules(c,a.id,1,100107);assert.ok(first.includes(1053));assert.deepEqual(await refreshModules(c,a.id,1,100107),[]);
 await c.query('ROLLBACK');
 }finally{await c.query('ROLLBACK');c.release();await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await s.close()}
});
