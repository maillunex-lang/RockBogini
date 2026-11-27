import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {worldBossRoutes} from '../src/worldBossRoutes.js';
import {worldBossEvents,worldBossEvent,worldBossOpen,worldBossDefenders,worldBossHp,worldBossRewards,worldBossRounds} from '../src/worldBossConfig.js';

test('captured source world boss event metadata and original date restrictions',()=>{
 assert.equal(Object.keys(worldBossEvents).length,2);
 const server=worldBossEvent(15802),guild=worldBossEvent(15803);
 assert.equal(server.kind,1);assert.equal(guild.kind,2);
 assert.equal(server.mapId,1102);assert.equal(guild.mapId,1302);
 assert.equal(server.attempts,1);assert.equal(guild.attempts,1);
 assert.equal(server.startTime,Date.parse('2026-10-25T15:00:00Z'));
 assert.equal(server.durationDays,7);
 assert.equal(worldBossOpen(server,new Date('2026-10-27T12:00:00Z')),true);
 assert.equal(worldBossOpen(server,new Date('2026-11-27T12:00:00Z')),false);
 assert.equal(worldBossOpen(guild,new Date('2026-11-27T12:00:00Z')),false);
 assert.equal(worldBossRounds(server),8);
 assert.equal(worldBossHp(server),81391000000);
 assert.deepEqual(worldBossRewards(server),[[10403,3]]);
 assert.equal(worldBossDefenders(server)?.length,1);
 assert.equal(worldBossDefenders(server)?.[0].hp_max,81391000000);
 assert.equal(worldBossDefenders(guild)?.[0].hp_max,81391000000);
});
test('world boss current expired event safely refuses challenge',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 try{
  assert.equal((await app.inject('/v1/world-boss')).statusCode,401);
  const r=await app.inject({url:'/v1/world-boss',headers});
  assert.equal(r.statusCode,200,r.body);
  assert.equal(r.json().events.length,2);
  assert.ok(r.json().events.every((e:{open:boolean})=>!e.open));
  assert.ok(r.json().events.every((e:{unavailableReason:string})=>e.unavailableReason==='event_closed'));
  const ch=await app.inject({method:'POST',url:'/v1/world-boss/challenge',headers,payload:{eventId:15802}});
  assert.equal(ch.statusCode,409,ch.body);assert.equal(ch.json().error,'world_boss_closed');
  assert.equal((await app.inject({method:'POST',url:'/v1/world-boss/challenge',headers,payload:{eventId:777}})).statusCode,404);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
test('historical fixture: server boss is transactional with idempotent rewards, per-day limit and owner isolation',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s);
 const app=Fastify({logger:false});
 await worldBossRoutes(app,s,()=>new Date('2026-10-27T12:00:00Z'));
 app.addHook('onClose',async()=>s.close());
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const post=(path:string,payload:object,headers=ha)=>app.inject({method:'POST',url:'/v1/world-boss/'+path,headers,payload});
 try{
  const open=await app.inject({url:'/v1/world-boss',headers:ha});
  assert.equal(open.statusCode,200,open.body);
  assert.equal(open.json().events[0].open,true);
  assert.equal(open.json().events[0].canChallenge,true);
  assert.equal(open.json().events[1].canChallenge,false);
  assert.equal(open.json().events[1].unavailableReason,'guild_not_implemented');
  assert.equal((await post('challenge',{eventId:15803})).statusCode,409);
  const first=await post('challenge',{eventId:15802});
  assert.equal(first.statusCode,200,first.body);
  assert.equal(first.json().mode,'world-boss');
  assert.equal(first.json().maxRounds,8);
  assert.equal(first.json().mapId,1102);
  assert.ok(Number.isSafeInteger(first.json().damage));
  assert.equal((await post('challenge',{eventId:15802})).statusCode,409);
  assert.equal((await post('settle',{battleId:first.json().battleId},hb)).statusCode,404);
  assert.equal((await app.inject({url:'/v1/world-boss/pending',headers:ha})).json().report.battleId,first.json().battleId);
  const settle=()=>post('settle',{battleId:first.json().battleId});
  const [one,two]=await Promise.all([settle(),settle()]);
  assert.equal(one.statusCode,200,one.body);
  assert.deepEqual(one.json(),two.json());
  assert.deepEqual(one.json().rewards,[[10403,3]]);
  assert.deepEqual((await settle()).json(),one.json());
  const row=(await s.pg.query('SELECT attempts,best_damage::text,total_damage::text FROM world_boss_progress WHERE account_id=$1 AND event_id=15802',[a.id])).rows[0];
  assert.equal(row.attempts,1);
  assert.equal(row.best_damage,String(one.json().damage));
  assert.equal(row.total_damage,String(one.json().damage));
  const balance=(await s.pg.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=10403',[a.id])).rows[0].amount;
  assert.equal(Number(balance),3);
  assert.equal((await post('challenge',{eventId:15802})).statusCode,409);
  assert.equal((await app.inject({url:'/v1/world-boss/pending',headers:ha})).json().report,null);
  assert.equal((await post('cancel',{battleId:first.json().battleId})).json().cancelled,false);
  const rank=await app.inject({url:'/v1/world-boss/rank/15802',headers:ha});
  assert.equal(rank.statusCode,200,rank.body);
  assert.equal((await app.inject({url:'/v1/world-boss/rank/15802',headers:hb})).statusCode,200);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
  await app.close();
 }
});
