import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {dailyInstanceTypes,instanceStage,dailyInstanceDefenders,dailyRewards,dailyDay,FREE_DAILY,PAID_DAILY} from '../src/dailyInstanceConfig.js';
test('exact original DailyInstance tables, power, rewards and free/paid limits',()=>{
 assert.equal(Object.keys(dailyInstanceTypes).length,5);
 assert.equal(Object.values(dailyInstanceTypes).reduce((a,c)=>a+c.maps.length,0),55);
 assert.equal(dailyInstanceTypes['1'].battlePrice,50);
 assert.equal(dailyInstanceTypes['1'].maps[0],10101);
 assert.deepEqual(dailyRewards(1,10101),[[1,200000],[10001,10]]);
 assert.deepEqual(dailyRewards(1,10101,2),[[1,400000],[10001,20]]);
 assert.equal(instanceStage(1,10101)?.stage.requirePower,1000);
 assert.equal(instanceStage(1,10101)?.map.heroes.length,5);
 assert.equal(dailyInstanceDefenders(1,10101)?.length,5);
 assert.equal(instanceStage(1,10201),null);
 assert.equal(FREE_DAILY,2);assert.equal(PAID_DAILY,2);
 assert.equal(dailyDay(new Date('2026-11-27T15:00:00Z')),'2026-11-28');
});
test('daily instance unlock, settlement, reward isolation, free and paid sweep, atomic limits',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s),b=await createGuest(s);const app=await buildApp(s);
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const post=(path:string,body:object,headers=ha)=>app.inject({method:'POST',url:'/v1/daily-instance/'+path,headers,payload:body});
 try{
  assert.equal((await app.inject('/v1/daily-instance')).statusCode,401);
  const list=await app.inject({url:'/v1/daily-instance',headers:ha});
  assert.equal(list.statusCode,200,list.body);
  assert.equal(list.json().instances.length,5);
  assert.equal(list.json().instances[0].clearedCount,0);
  assert.equal((await post('challenge',{type:1,mapId:10102})).statusCode,409);
  assert.equal((await post('quick',{type:1,mapId:10101,count:1})).statusCode,409);
  const first=await post('challenge',{type:1,mapId:10101});
  assert.equal(first.statusCode,200,first.body);
  assert.equal(first.json().mode,'daily-instance');
  assert.equal(first.json().mapId,10101);
  assert.equal((await post('settle',{battleId:first.json().battleId},hb)).statusCode,404);
  assert.equal((await app.inject({url:'/v1/daily-instance/pending',headers:ha})).json().report.battleId,first.json().battleId);
  const settle=()=>post('settle',{battleId:first.json().battleId});
  const [one,two]=await Promise.all([settle(),settle()]);
  assert.equal(one.statusCode,200,one.body);assert.deepEqual(two.json(),one.json());
  assert.deepEqual((await settle()).json(),one.json());
  assert.equal((await app.inject({url:'/v1/daily-instance/pending',headers:ha})).json().report,null);
  const win=one.json().result===1;
  const row=(await s.pg.query('SELECT cleared_map_id,free_battle_count,paid_battle_count FROM daily_instance_progress WHERE account_id=$1 AND instance_type=1',[a.id])).rows[0];
  assert.equal(row.cleared_map_id,win?10101:0);
  assert.equal(row.free_battle_count,0);
  if(win){
   assert.deepEqual(one.json().rewards,[[1,200000],[10001,10]]);
   const free=await post('quick',{type:1,mapId:10101,count:2});
   assert.equal(free.statusCode,200,free.body);
   assert.equal(free.json().free,2);
   assert.equal(free.json().paid,0);
   assert.deepEqual(free.json().rewards,[[1,400000],[10001,20]]);
   assert.equal((await post('quick',{type:1,mapId:10101,count:1})).statusCode,409);
   await s.pg.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,3,200) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount',[a.id]);
   const paid=await post('quick',{type:1,mapId:10101,count:2});
   assert.equal(paid.statusCode,200,paid.body);
   assert.equal(paid.json().diamonds,100);
   assert.equal((await post('quick',{type:1,mapId:10101,count:1})).statusCode,409);
   const coins=await s.pg.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=1',[a.id]);
   assert.equal(Number(coins.rows[0].amount),200000*5);
   const diamond=(await s.pg.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=3',[a.id])).rows[0].amount;
   assert.equal(Number(diamond),100);
  }
  assert.equal((await post('quick',{type:1,mapId:10101,count:1},hb)).statusCode,409);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
  await app.close();
 }
});
test('daily instance refuses insufficient power and preserves previous challenge when replaced',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 const post=(path:string,body:object)=>app.inject({method:'POST',url:'/v1/daily-instance/'+path,headers,payload:body});
 try{
  await app.inject({url:'/v1/profile',headers});
  await s.pg.query('UPDATE player_profiles SET power=1 WHERE account_id=$1',[a.id]);
  assert.equal((await post('challenge',{type:1,mapId:10101})).statusCode,409);
  assert.equal((await post('challenge',{type:1,mapId:10101})).json().error,'daily_power_low');
  await s.pg.query('UPDATE player_profiles SET power=1000000 WHERE account_id=$1',[a.id]);
  const first=await post('challenge',{type:1,mapId:10101});assert.equal(first.statusCode,200,first.body);
  const second=await post('challenge',{type:1,mapId:10101});assert.equal(second.statusCode,200,second.body);
  assert.equal((await post('settle',{battleId:first.json().battleId})).statusCode,409);
  const pending=(await app.inject({url:'/v1/daily-instance/pending',headers})).json().report;
  assert.equal(pending.battleId,second.json().battleId);
  assert.equal((await post('cancel',{battleId:second.json().battleId})).json().cancelled,true);
  assert.equal((await post('settle',{battleId:second.json().battleId})).statusCode,409);
  assert.equal((await s.pg.query('SELECT cleared_map_id FROM daily_instance_progress WHERE account_id=$1 AND instance_type=1',[a.id])).rows[0].cleared_map_id,0);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
