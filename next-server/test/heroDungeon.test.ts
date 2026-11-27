import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {getProfile} from '../src/profile.js';
import {heroDungeonRoutes} from '../src/heroDungeonRoutes.js';
import {heroDungeonEvent,heroDungeonStage,heroDungeonDefenders,heroDungeonWindow,
 capturedHeroDungeonWindow,heroDungeonBonus,heroDungeonRewards,heroDungeonRank,HERO_DUNGEON_FORMATION_SID} from '../src/heroDungeonConfig.js';
import {checkDungeonRoster,dungeonRoster,dungeonAttackers} from '../src/heroDungeonFormation.js';

test('source HeroDungeon configuration: 35 stages, exact rewards, bonus, Sid1006 and zone-relative window',()=>{
 assert.equal(heroDungeonEvent.id,578);
 assert.equal(heroDungeonEvent.custom.heroId,15505);
 assert.equal(heroDungeonEvent.custom.count,5);
 assert.equal(heroDungeonEvent.stages.length,35);
 assert.equal(HERO_DUNGEON_FORMATION_SID,1006);
 assert.equal(heroDungeonStage(1)?.mapId,25001);
 assert.deepEqual(heroDungeonRewards(1),[[7018,20],[4905,1],[10001,20],[1,25000]]);
 assert.deepEqual(heroDungeonRewards(1,100),[[7018,22],[4905,1],[10001,22],[1,27500]]);
 assert.deepEqual(heroDungeonRewards(1,200),[[7018,24],[4905,1],[10001,24],[1,30000]]);
 assert.equal(heroDungeonDefenders(heroDungeonStage(1)!)?.length,5);
 assert.equal(heroDungeonStage(36),null);
 assert.deepEqual(heroDungeonBonus(4),{drop:0,attribute:-400});
 assert.deepEqual(heroDungeonBonus(5),{drop:100,attribute:400});
 assert.deepEqual(heroDungeonBonus(11),{drop:600,attribute:800});
 assert.equal(heroDungeonRank(1,4),196);
 assert.equal(heroDungeonRank(0,0),0);
 assert.equal(heroDungeonWindow(new Date('2026-10-24T00:00:00Z')).open,false);
 const open=new Date('2026-10-21T12:00:00Z');
 assert.equal(heroDungeonWindow(open,new Date('2026-10-20T20:20:00Z')).open,true);
 assert.equal(heroDungeonWindow(new Date('2026-11-01T00:00:00Z'),new Date('2026-10-20T20:20:00Z')).open,false);
 assert.equal(capturedHeroDungeonWindow(new Date('2026-11-27T12:00:00Z')).open,true);
 const shifted=capturedHeroDungeonWindow(new Date('2026-11-27T12:00:00Z'));
 assert.equal(shifted.endTime,'2026-11-27T20:20:00.000Z');
 assert.equal(capturedHeroDungeonWindow(new Date('2026-11-27T23:00:00Z')).open,true);
 assert.ok(checkDungeonRoster([1001,1002,0,0,0,0],101));
 assert.equal(checkDungeonRoster([1001,1001,0,0,0,0],101),false);
});
test('HeroDungeon: exact source stage, paid-looking sweeps, idempotency, main fallback and independent roster',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s);
 let day='2026-10-21T12:00:00Z';
 const app=Fastify({logger:false});
 await heroDungeonRoutes(app,s,()=>new Date(day));
 app.addHook('onClose',async()=>s.close());
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const put=(heroIds:number[],formationType=101,headers=ha)=>app.inject({method:'PUT',url:'/v1/hero-dungeon/formation',headers,payload:{heroIds,formationType}});
 const post=(path:string,payload:object,headers=ha)=>app.inject({method:'POST',url:'/v1/hero-dungeon/'+path,headers,payload});
 try{
  await getProfile(s,a.id);await getProfile(s,b.id);
  const closed=(await app.inject({url:'/v1/hero-dungeon',headers:ha})).json();
  assert.equal(closed.id,578);assert.equal(closed.window.open,true);assert.equal(closed.maxAttempts,5);
  assert.equal(closed.nextStage.mapId,25001);assert.equal(closed.canChallenge,true);
  assert.equal((await app.inject('/v1/hero-dungeon')).statusCode,401);
  assert.equal((await post('quick',{stage:1})).json().error,'dungeon_stage_locked');
  const first=(await app.inject({url:'/v1/hero-dungeon/formation',headers:ha})).json();
  assert.equal(first.sid,1006);assert.equal(first.usesMainFallback,true);
  assert.deepEqual((await dungeonAttackers(s,a.id)).map(x=>(x as typeof x&{sid:number}).sid),[1001,1002]);
  assert.equal((await put([1001,1001,0,0,0,0])).statusCode,400);
  assert.equal((await put([9999,0,0,0,0,0])).statusCode,409);
  assert.equal((await put([1002,1001,0,0,0,0],102)).statusCode,200);
  assert.deepEqual((await dungeonAttackers(s,a.id)).map(x=>(x as typeof x&{sid:number}).sid),[1002,1001]);
  assert.equal((await app.inject({url:'/v1/hero-dungeon/formation',headers:hb})).json().usesMainFallback,true);
  assert.equal((await post('challenge',{stage:2})).json().error,'dungeon_stage_locked');
  const fight=await post('challenge',{stage:1});
  assert.equal(fight.statusCode,200,fight.body);
  assert.equal(fight.json().mode,'hero-dungeon');
  assert.equal(fight.json().mapId,25001);
  assert.equal(fight.json().maxRounds,15);
  assert.equal((await post('challenge',{stage:1})).json().error,'dungeon_battle_pending');
  assert.equal((await put([1001,0,0,0,0,0])).json().error,'dungeon_battle_pending');
  assert.equal((await app.inject({url:'/v1/hero-dungeon/pending',headers:ha})).json().report.battleId,fight.json().battleId);
  assert.equal((await post('settle',{battleId:fight.json().battleId},hb)).statusCode,404);
  const settle=()=>post('settle',{battleId:fight.json().battleId});
  const [one,two]=await Promise.all([settle(),settle()]);
  assert.equal(one.statusCode,200,one.body);
  assert.deepEqual(one.json(),two.json());
  const win=one.json().result===1;
  if(win){
   assert.deepEqual(one.json().rewards,heroDungeonRewards(1));
   assert.equal((await app.inject({url:'/v1/hero-dungeon',headers:ha})).json().clearedStage,1);
   const sweep=await post('quick',{stage:1});
   assert.equal(sweep.statusCode,200,sweep.body);
   assert.deepEqual(sweep.json().rewards,heroDungeonRewards(1));
  }else{
   assert.deepEqual(one.json().rewards,[]);
   assert.equal((await app.inject({url:'/v1/hero-dungeon',headers:ha})).json().clearedStage,0);
  }
  assert.equal((await settle()).statusCode,200);
  assert.equal((await post('cancel',{battleId:fight.json().battleId})).json().cancelled,false);
  const second=(await app.inject({url:'/v1/hero-dungeon',headers:hb})).json();
  assert.equal(second.clearedStage,0);
  assert.equal((await put([0,0,0,0,0,0])).statusCode,200);
  assert.deepEqual((await dungeonAttackers(s,a.id)).map(x=>(x as typeof x&{sid:number}).sid),[1001,1002]);
  await s.pg.query('INSERT INTO hero_dungeon_progress(account_id,event_id,cleared_stage,daily_count,day) VALUES($1,578,1,5,$2) ON CONFLICT(account_id) DO UPDATE SET cleared_stage=1,daily_count=5,day=$2',[a.id,'2026-10-21']);
  assert.equal((await post('quick',{stage:1})).json().error,'dungeon_attempt_limit');
  day='2026-10-22T12:00:00Z';
  assert.equal((await app.inject({url:'/v1/hero-dungeon',headers:ha})).json().remainingAttempts,5);
  day='2026-11-27T23:00:00Z';
  const unavailable=(await app.inject({url:'/v1/hero-dungeon',headers:ha})).json();
  assert.equal(unavailable.window.open,true);
  // All windows move with zone-open day shifts; close gate with a deterministic raw window.
  assert.equal(heroDungeonWindow(new Date('2026-11-27T23:00:00Z'),new Date('2026-10-20T20:20:00Z')).open,false);
  assert.equal((await post('quick',{stage:2})).json().error,'dungeon_stage_locked');
  assert.equal((await post('challenge',{stage:1})).json().error,'dungeon_stage_locked');
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
  await app.close();
 }
});
