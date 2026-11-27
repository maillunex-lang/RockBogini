import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {towerTypes,towerFloor,towerDefenders,towerOpen,towerWeekday,towerRewards} from '../src/towerConfig.js';
import {towerFormationSid,towerElementRoot,checkTowerRoster,towerUnits} from '../src/towerFormation.js';
import {starterHeroes} from '../src/starterHeroes.js';
test('exact source tower data has 12 types, 17000 floors, correct daily and opening constraints',()=>{
 assert.equal(Object.keys(towerTypes).length,12);
 assert.deepEqual(towerFloor(99,1)?.floor.firstClearRewards,[[10001,5],[1,5000],[22,2000]]);
 assert.deepEqual(towerFloor(99,1)?.floor.dailyRewards,[[1,3000],[22,1200]]);
 assert.deepEqual(towerFloor(99,5)?.floor.extraRewards,[[10001,200]]);
 assert.deepEqual(towerRewards([[1,500],[22,300],[1,100]]),[[1,600],[22,300]]);
 assert.equal(towerFloor(99,0),null);
 assert.equal(towerFloor(99,3001),null);
 assert.equal(towerWeekday(new Date('2026-11-27T15:00:00Z')),6);
 assert.equal(towerOpen(1,new Date('2026-11-27T15:00:00Z')),false);
 assert.equal(towerOpen(1,new Date('2026-11-28T15:00:00Z')),true);
 assert.equal(towerOpen(99),true);
 assert.equal(towerDefenders(99,1)?.length,5);
 assert.equal(towerDefenders(1,1)?.length,5);
});
test('original MapType elemental towers have shared formation Sid 141–145 and original positions',()=>{
 assert.deepEqual([1,2,3,4,5].map(t=>towerFormationSid(t)),[141,142,143,144,145]);
 assert.deepEqual([101,102,103,104,105].map(t=>towerFormationSid(t)),[141,142,143,144,145]);
 assert.equal(towerFormationSid(99),1);assert.equal(towerFormationSid(199),1);
 assert.equal(towerElementRoot(104),4);
 assert.ok(checkTowerRoster([1001,1002,0,0,0,0],101));
 assert.ok(!checkTowerRoster([1001,1001,0,0,0,0],101));
 assert.ok(!checkTowerRoster([1001,0,0,0,0],101));
 const heroes=starterHeroes.map(x=>({...x,Attrs:x.Attrs,Skills:x.Skills,SkinId:x.SkinId})) as Parameters<typeof towerUnits>[2];
 const units=towerUnits([1001,1002,1003,0,0,0],101,heroes);
 assert.deepEqual(units.map(u=>u.station),[1,3,4]);
 assert.throws(()=>towerUnits([9999,0,0,0,0,0],101,heroes),/hero_not_owned/);
});
test('element tower formation owned by player, persisted for normal+hard, and locked during pending battle',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s),app=await buildApp(s);
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const put=(type:number,heroIds:number[],formationType=101,headers=ha)=>app.inject({method:'PUT',url:'/v1/tower/formation',headers,payload:{type,heroIds,formationType}});
 try{
  assert.equal((await app.inject('/v1/tower/formations')).statusCode,401);
  assert.equal((await put(1,[1001,1002,1003,0,0,0],101)).statusCode,200);
  assert.equal((await put(1,[1001,1001,0,0,0,0],101)).statusCode,400);
  assert.equal((await put(1,[9999,0,0,0,0,0],101)).statusCode,409);
  assert.equal((await put(1,[1001,0,0,0,0],101)).statusCode,400);
  assert.equal((await put(99,[1001,0,0,0,0,0],101)).statusCode,400);
  const own=(await app.inject({url:'/v1/tower/formations',headers:ha})).json();
  assert.equal(own.rosters['1'].formationType,101);
  assert.deepEqual(own.rosters['1'].heroIds,[1001,1002,1003,0,0,0]);
  assert.deepEqual((await app.inject({url:'/v1/tower/formations',headers:hb})).json().rosters,{});
  const main=(await app.inject({url:'/v1/formation',headers:ha})).json();
  const r=await app.inject({method:'POST',url:'/v1/tower/challenge',headers:ha,payload:{type:99,mapIndex:1}});
  assert.equal(r.statusCode,200,r.body);
  assert.equal((await put(101,[1003,1002,1001,0,0,0],102)).statusCode,409);
  const cancel=await app.inject({method:'POST',url:'/v1/tower/cancel',headers:ha,payload:{battleId:r.json().battleId}});
  assert.equal(cancel.statusCode,200,cancel.body);
  assert.equal((await put(101,[1003,1002,1001,0,0,0],102)).statusCode,200);
  const after=(await app.inject({url:'/v1/tower/formations',headers:ha})).json();
  assert.deepEqual(after.rosters['1'].heroIds,[1003,1002,1001,0,0,0]);
  assert.equal(after.rosters['1'].formationType,102);
  assert.deepEqual((await app.inject({url:'/v1/formation',headers:ha})).json(),main);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await app.close();
 }
});
test('tower task progress tracks completed floors and source tower module gates',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 try{
  await app.inject({url:'/v1/tasks',headers});
  await s.pg.query('UPDATE player_profiles SET power=2000000000 WHERE account_id=$1',[a.id]);
  const quick=await app.inject({method:'POST',url:'/v1/tower/quick',headers,payload:{type:99,from:1,to:25}});
  assert.equal(quick.statusCode,200,quick.body);
  const taskRes1=await app.inject({url:'/v1/tasks',headers});
  assert.equal(taskRes1.statusCode,200,taskRes1.body);
  const t1=taskRes1.json().main.find((t:{id:number})=>t.id===11914);
  assert.equal(t1.progress,25);
  assert.equal(t1.ready,true);
  assert.equal(quick.json().unlockedModules.includes(2034),false);
  const q2=await app.inject({method:'POST',url:'/v1/tower/quick',headers,payload:{type:99,from:26,to:60}});
  assert.equal(q2.statusCode,200,q2.body);
  const taskRes2=await app.inject({url:'/v1/tasks',headers});
  assert.equal(taskRes2.statusCode,200,taskRes2.body);
  const t2=taskRes2.json().main.find((t:{id:number})=>t.id===11923);
  assert.equal(t2.progress,60);
  assert.equal(t2.ready,true);
  assert.equal((await s.pg.query('SELECT count(*)::int AS n FROM player_modules WHERE account_id=$1 AND module_id=2034',[a.id])).rows[0].n,0);
  assert.equal((await s.pg.query('SELECT count(*)::int AS n FROM player_modules WHERE account_id=$1 AND module_id BETWEEN 2029 AND 2033',[a.id])).rows[0].n,0);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
test('tower source module condition 102 requires exact tower type and floor',async()=>{
 const {eligibleModules}=await import('../src/campaignDependencies.js');
 const profile={level:100,stage:100101,days:2,vip:0,power:1000000000};
 assert.ok(!eligibleModules({...profile,towers:{1:1999,2:0}}).includes(2029));
 assert.ok(eligibleModules({...profile,towers:{1:2000,2:0}}).includes(2029));
 assert.ok(!eligibleModules({...profile,towers:{1:2000,2:0}}).includes(2030));
 assert.ok(eligibleModules({...profile,towers:{99:3000}}).includes(2034));
});
test('tower challenge/settlement are authenticated, ordered, persistent and idempotent',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s);const app=await buildApp(s);
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const post=(route:string,payload:object,headers=ha)=>app.inject({method:'POST',url:'/v1/tower/'+route,headers,payload});
 try{
  assert.equal((await app.inject('/v1/tower')).statusCode,401);
  const list=await app.inject({url:'/v1/tower',headers:ha});
  assert.equal(list.statusCode,200,list.body);
  assert.equal(list.json().towers.length,12);
  assert.equal(list.json().towers.find((x:{type:number})=>x.type===99).mapIndex,0);
  assert.equal((await post('challenge',{type:99,mapIndex:2})).statusCode,409);
  assert.equal((await post('challenge',{type:99,mapIndex:1},hb)).statusCode,200);
  const r=await post('challenge',{type:99,mapIndex:1});
  assert.equal(r.statusCode,200,r.body);
  const battle=r.json();
  assert.equal(battle.mapId,200001);
  assert.equal(battle.mode,'tower');
  assert.equal((await post('settle',{battleId:battle.battleId},hb)).statusCode,404);
  assert.equal((await app.inject({url:'/v1/tower/pending',headers:ha})).json().report.battleId,battle.battleId);
  const settle=()=>post('settle',{battleId:battle.battleId});
  const [one,two]=await Promise.all([settle(),settle()]);
  assert.equal(one.statusCode,200,one.body);
  assert.equal(two.statusCode,200,two.body);
  assert.deepEqual(two.json(),one.json());
  const progress=(await s.pg.query('SELECT map_index FROM tower_progress WHERE account_id=$1 AND tower_type=99',[a.id])).rows[0];
  assert.equal(progress.map_index,one.json().result===1?1:0);
  const replay=await settle();
  assert.deepEqual(replay.json(),one.json());
  assert.equal((await app.inject({url:'/v1/tower/pending',headers:ha})).json().report,null);
  assert.equal((await post('daily',{type:99})).statusCode,200);
  assert.equal((await post('daily',{type:99})).statusCode,409);
  const dailyCoin=await s.pg.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=1',[a.id]);
  assert.ok(Number(dailyCoin.rows[0].amount)>=3000);
  const quick=await post('quick',{type:99,from:one.json().result===1?2:1,to:one.json().result===1?2:1});
  assert.equal(quick.statusCode,409);
  assert.equal(quick.json().error,'quick_power_low');
  if(one.json().result===1){
   assert.equal((await post('extra',{type:99,mapIndex:1})).statusCode,200);
   assert.equal((await post('extra',{type:99,mapIndex:1})).statusCode,409);
  }
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
  await app.close();
 }
});
test('tower quick from original configuration grants all first-clears exactly once',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 const post=(route:string,payload:object)=>app.inject({method:'POST',url:'/v1/tower/'+route,headers,payload});
 try{
  await app.inject({url:'/v1/profile',headers});
  await s.pg.query('UPDATE player_profiles SET power=10000000000 WHERE account_id=$1',[a.id]);
  const quick=await post('quick',{type:99,from:1,to:2});
  assert.equal(quick.statusCode,200,quick.body);
  assert.equal(quick.json().to,2);
  assert.equal((await post('quick',{type:99,from:1,to:2})).statusCode,409);
  assert.equal((await s.pg.query('SELECT map_index FROM tower_progress WHERE account_id=$1 AND tower_type=99',[a.id])).rows[0].map_index,2);
  const coin=(await s.pg.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=1',[a.id])).rows[0];
  const expected=towerFloor(99,1)!.floor.firstClearRewards.find(x=>x[0]===1)![1]+towerFloor(99,2)!.floor.firstClearRewards.find(x=>x[0]===1)![1];
  assert.equal(Number(coin.amount),expected);
  assert.equal((await post('extra',{type:99,mapIndex:2})).statusCode,200);
  assert.equal((await post('extra',{type:99,mapIndex:2})).statusCode,409);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
