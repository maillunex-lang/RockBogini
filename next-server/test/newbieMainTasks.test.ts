import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {getProfile} from '../src/profile.js';
import {taskEvent,TASK_QUICK_BATTLE} from '../src/tasks.js';

const MAIN=JSON.parse(readFileSync(new URL('../../data/newbie-main-task-conditions.json',import.meta.url),'utf8')) as
 Record<string,{id:number;type:number;condition:number[];rewards:number[][];newbieSortId:number;totalCount:number}>;

test('all 26 original NewbieMainTask rows resolve to TaskBase Type=1 without invented rewards',()=>{
 assert.equal(Object.keys(MAIN).length,26);
 assert.equal(Object.values(MAIN).filter(t=>t.type===1&&t.totalCount>0).length,26);
 assert.deepEqual(MAIN['11901'].condition,[2001]);
 assert.deepEqual(MAIN['11901'].rewards,[[3,100]]);
 assert.deepEqual(MAIN['11908'].condition,[2004]);
 assert.equal(MAIN['11908'].totalCount,10000);
 assert.deepEqual(MAIN['11920'].condition,[1010]);
});

test('story quest progression reflects authoritative stage, can claim exactly once and does not reset daily',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  await getProfile(s,a.id);
  const first=await app.inject({url:'/v1/tasks',headers});
  assert.equal(first.statusCode,200,first.body);
  const initial=first.json();
  assert.equal(initial.main.length,26);
  assert.equal(initial.daily.length,9);
  assert.ok(initial.main.some((t:{id:number;ready:boolean})=>t.id===11901&&!t.ready));
  assert.equal((await app.inject({method:'POST',url:'/v1/tasks/claim',headers,payload:{taskIds:[11901]}})).statusCode,409);
  await s.pg.query('UPDATE player_profiles SET stage=100102 WHERE account_id=$1',[a.id]);
  const updated=await app.inject({url:'/v1/tasks',headers});
  assert.equal(updated.statusCode,200,updated.body);
  const quest=updated.json().main.find((t:{id:number})=>t.id===11901);
  assert.equal(quest.progress,1);
  assert.equal(quest.ready,true);
  const reward=await app.inject({method:'POST',url:'/v1/tasks/claim',headers,payload:{taskIds:[11901]}});
  assert.equal(reward.statusCode,200,reward.body);
  assert.deepEqual(reward.json().rewards,[[3,100]]);
  const rerun=await app.inject({method:'POST',url:'/v1/tasks/claim',headers,payload:{taskIds:[11901]}});
  assert.equal(rerun.statusCode,409);
  const after=await app.inject({url:'/v1/tasks',headers});
  assert.equal(after.json().main.find((t:{id:number})=>t.id===11901).completed,true);
  assert.equal(after.json().daily.find((t:{id:number})=>t.id===1001).ready,true);
  await s.pg.query('UPDATE player_profiles SET power=11000,level=17 WHERE account_id=$1',[a.id]);
  const advanced=(await app.inject({url:'/v1/tasks',headers})).json().main;
  assert.equal(advanced.find((t:{id:number})=>t.id===11908).ready,true);
  assert.equal(advanced.find((t:{id:number})=>t.id===11916).ready,true);
  const c=await s.pg.connect();
  try{await c.query('BEGIN');await taskEvent(c,a.id,TASK_QUICK_BATTLE,[],5);await c.query('COMMIT')}
  catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  const quick=(await app.inject({url:'/v1/tasks',headers})).json().main.find((t:{id:number})=>t.id===11920);
  assert.equal(quick.progress,5);
  assert.equal(quick.ready,true);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);
  await app.close();
 }
});
