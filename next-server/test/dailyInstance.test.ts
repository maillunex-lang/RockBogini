import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {dailyInstanceTypes,instanceStage,dailyInstanceDefenders,dailyRewards,dailyDay,FREE_DAILY,PAID_DAILY,dailyVipBonus,dailyVipLimits} from '../src/dailyInstanceConfig.js';
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
test('VIP source privilege 9 paid attempts and unavailable 14-24 bonuses stay zero',()=>{
 assert.deepEqual(dailyVipLimits(1,0),{freeMax:2,paidMax:2,rewardBonus:0});
 assert.deepEqual(dailyVipLimits(1,1),{freeMax:2,paidMax:3,rewardBonus:0});
 assert.deepEqual(dailyVipLimits(5,3),{freeMax:2,paidMax:4,rewardBonus:0});
 assert.deepEqual(dailyVipLimits(4,21),{freeMax:2,paidMax:12,rewardBonus:0});
 for(const type of [1,2,3,4,5])for(const bonusType of [14,15,16,17,18,19,20,21,23,24]){
  assert.equal(dailyVipBonus(21,bonusType),0,'VIP source table has no bonus type '+bonusType);
  assert.equal(dailyVipLimits(type,2).freeMax,2);
 }
 assert.deepEqual(dailyRewards(1,10101,3,100),[[1,660000],[10001,33]]);
});
test('daily paid VIP attempts use account VIP points, atomically debit diamonds and isolate other players',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s),app=await buildApp(s);
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const post=(type:number,count:number,headers=ha)=>app.inject({method:'POST',url:'/v1/daily-instance/quick',headers,payload:{type,mapId:10101,count}});
 try{
  await app.inject({url:'/v1/profile',headers:ha});
  await app.inject({url:'/v1/profile',headers:hb});
  await s.pg.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,2,2000),($1,3,350) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount',[a.id]);
  await s.pg.query('INSERT INTO daily_instance_progress(account_id,instance_type,cleared_map_id) VALUES($1,1,10101) ON CONFLICT(account_id,instance_type) DO UPDATE SET cleared_map_id=10101',[a.id]);
  const before=(await app.inject({url:'/v1/daily-instance',headers:ha})).json().instances[0];
  assert.equal(before.vipLevel,3);
  assert.equal(before.paidMax,4);
  assert.equal(before.freeMax,2);
  assert.equal(before.rewardBonus,0);
  assert.equal((await app.inject({url:'/v1/daily-instance',headers:hb})).json().instances[0].paidMax,2);
  const twoFree=await post(1,2);assert.equal(twoFree.statusCode,200,twoFree.body);
  assert.equal(twoFree.json().paid,0);
  const fourPaid=await post(1,4);assert.equal(fourPaid.statusCode,200,fourPaid.body);
  assert.equal(fourPaid.json().paid,4);
  assert.equal(fourPaid.json().diamonds,200);
  assert.equal((await s.pg.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=3',[a.id])).rows[0].amount,'150');
  const limit=(await app.inject({url:'/v1/daily-instance',headers:ha})).json().instances[0];
  assert.equal(limit.paidLeft,0);
  assert.equal(limit.freeLeft,0);
  assert.equal((await post(1,1)).json().error,'daily_attempt_limit');
  assert.equal((await post(1,1,hb)).statusCode,409);
  await s.pg.query('UPDATE daily_instance_progress SET day=$2 WHERE account_id=$1 AND instance_type=1',[a.id,'2026-01-01']);
  const rollover=(await app.inject({url:'/v1/daily-instance',headers:ha})).json().instances[0];
  assert.equal(rollover.freeLeft,2);
  assert.equal(rollover.paidLeft,4);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await app.close()}
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
test('daily instance uses historical highest formation power after reducing the active squad',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 const put=(hero_ids:number[])=>app.inject({method:'PUT',url:'/v1/formation',headers,payload:{formation_type:101,hero_ids}});
 try{
  const profile=await app.inject({url:'/v1/profile',headers});
  assert.equal(profile.statusCode,200);
  assert.ok(Number(profile.json().highest_power)>=Number(profile.json().power));
  const high=await put([1001,1002,1003,0,0,0]);
  assert.equal(high.statusCode,200,high.body);
  const record=high.json().power;
  const low=await put([1001,0,0,0,0,0]);
  assert.equal(low.statusCode,200,low.body);
  assert.ok(low.json().power<record);
  const after=(await app.inject({url:'/v1/profile',headers})).json();
  assert.equal(after.power,low.json().power);
  assert.equal(after.highest_power,record);
  const next=(await app.inject({url:'/v1/daily-instance',headers})).json().instances[0];
  assert.equal(next.canChallenge,record>=next.nextMap.requirePower);
  const result=await app.inject({method:'POST',url:'/v1/daily-instance/challenge',headers,payload:{type:1,mapId:10101}});
  assert.equal(result.statusCode,record>=1000?200:409,result.body);
  if(result.statusCode===200){
   const cancel=await app.inject({method:'POST',url:'/v1/daily-instance/cancel',headers,payload:{battleId:result.json().battleId}});
   assert.equal(cancel.statusCode,200);
  }
  await s.pg.query('UPDATE player_profiles SET highest_power=1,power=1 WHERE account_id=$1',[a.id]);
  const locked=await app.inject({method:'POST',url:'/v1/daily-instance/challenge',headers,payload:{type:1,mapId:10101}});
  assert.equal(locked.statusCode,409);
  assert.equal(locked.json().error,'daily_power_low');
  const current=(await app.inject({url:'/v1/daily-instance',headers})).json().instances[0];
  assert.equal(current.canChallenge,false);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
test('daily instance refuses insufficient power and preserves previous challenge when replaced',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 const post=(path:string,body:object)=>app.inject({method:'POST',url:'/v1/daily-instance/'+path,headers,payload:body});
 try{
  await app.inject({url:'/v1/profile',headers});
  await s.pg.query('UPDATE player_profiles SET power=1,highest_power=1 WHERE account_id=$1',[a.id]);
  assert.equal((await post('challenge',{type:1,mapId:10101})).statusCode,409);
  assert.equal((await post('challenge',{type:1,mapId:10101})).json().error,'daily_power_low');
  await s.pg.query('UPDATE player_profiles SET power=1000000,highest_power=1000000 WHERE account_id=$1',[a.id]);
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
