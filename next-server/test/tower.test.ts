import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {towerTypes,towerFloor,towerDefenders,towerOpen,towerWeekday,towerRewards} from '../src/towerConfig.js';
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
