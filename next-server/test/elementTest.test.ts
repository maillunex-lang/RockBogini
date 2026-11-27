import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {getProfile} from '../src/profile.js';
import {elementTestRoutes} from '../src/elementTestRoutes.js';
import {elementEvents,elementEvent,elementStage,elementDefenders,elementSid,elementWindow,
 elementRewards,elementQuickPower,elementQuickEnd,elementWeaken} from '../src/elementTestConfig.js';

test('original ElementTest source has 2 events, 400 maps, exact rewards, formations and QuickPower limits',()=>{
 assert.deepEqual(Object.keys(elementEvents).sort(),['15792','15793']);
 const dark=elementEvent(15792)!,heart=elementEvent(15793)!;
 assert.equal(dark.custom.element,5);assert.equal(heart.custom.element,1);
 assert.equal(elementSid(dark),1005);assert.equal(elementSid(heart),1001);
 assert.equal(dark.stages.length,200);assert.equal(heart.stages.length,200);
 assert.equal(elementStage(dark,1)?.mapId,15001);assert.equal(elementStage(heart,1)?.mapId,11001);
 assert.equal(elementStage(dark,200)?.mapId,15200);assert.equal(elementStage(heart,200)?.mapId,11200);
 assert.equal(elementStage(dark,201),null);
 assert.deepEqual(elementRewards(dark,0,1),[[4404,1],[10001,20],[1,25000],[22,10000]]);
 assert.deepEqual(elementRewards(heart,0,1),[[4204,1],[10001,20],[1,25000],[22,10000]]);
 assert.deepEqual(elementRewards(heart,0,2),[[4204,2],[10001,40],[1,50500],[22,20200]]);
 assert.equal(elementDefenders(elementStage(heart,1)!)?.length,5);
 assert.equal(elementDefenders(elementStage(dark,1)!)?.length,5);
 assert.equal(elementQuickEnd(heart,0,0),0);
 assert.equal(elementQuickEnd(heart,0,15688),1);
 assert.equal(elementQuickEnd(heart,0,1e15),200);
 assert.equal(elementQuickPower([{heroId:11501,power:1000},{heroId:12501,power:1000}],heart),1600);
 const match:any={element:1,attrs:{0:100,1:1000,2:100},hp_max:1000};
 const wrong:any={element:5,attrs:{0:100,1:1000,2:100},hp_max:1000};
 const weakened=elementWeaken([match,wrong],heart);
 assert.equal(weakened[0].attrs[0],100);
 assert.equal(weakened[1].attrs[0],60);
 assert.equal(weakened[1].hp_max,600);
 assert.equal(elementWindow(heart,new Date('2026-10-26T12:00:00Z')).open,true);
});
test('ElementTest isolated: saved SID per event, atomic rewards/quick, authorization, duplicate settlement and pending',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s);
 let day='2026-10-26T12:00:00Z';
 const app=Fastify({logger:false});
 await elementTestRoutes(app,s,()=>new Date(day));
 app.addHook('onClose',async()=>s.close());
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const put=(eventId:number,heroIds:number[],formationType=101,headers=ha)=>
  app.inject({method:'PUT',url:'/v1/element-test/formation',headers,payload:{eventId,heroIds,formationType}});
 const post=(path:string,payload:object,headers=ha)=>app.inject({method:'POST',url:'/v1/element-test/'+path,headers,payload});
 try{
  await getProfile(s,a.id);await getProfile(s,b.id);
  const initial=await app.inject({url:'/v1/element-test',headers:ha});
  assert.equal(initial.statusCode,200,initial.body);
  const events=initial.json().events;
  assert.equal(events.length,2);
  assert.equal(events[0].window.open,true);
  assert.equal(events[0].nextStage.mapId,15001);
  assert.equal(events[1].nextStage.mapId,11001);
  assert.equal((await app.inject('/v1/element-test')).statusCode,401);
  assert.equal((await post('quick',{eventId:15792,endStage:1})).json().error,'element_quick_power_low');
  assert.equal((await put(15792,[1001,1001,0,0,0,0])).statusCode,400);
  assert.equal((await put(15792,[9999,0,0,0,0,0])).statusCode,409);
  assert.equal((await put(15792,[1002,1001,0,0,0,0],102)).statusCode,200);
  assert.equal((await app.inject({url:'/v1/element-test/formation/15792',headers:ha})).json().sid,1005);
  assert.equal((await app.inject({url:'/v1/element-test/formation/15793',headers:ha})).json().usesMainFallback,true);
  assert.equal((await app.inject({url:'/v1/element-test/formation/15792',headers:hb})).json().usesMainFallback,true);
  assert.equal((await post('challenge',{eventId:15792,stage:2})).json().error,'element_stage_locked');
  const fight=await post('challenge',{eventId:15792,stage:1});
  assert.equal(fight.statusCode,200,fight.body);
  assert.equal(fight.json().mode,'element-test');
  assert.equal(fight.json().mapId,15001);
  assert.equal((await post('challenge',{eventId:15792,stage:1})).json().error,'element_battle_pending');
  assert.equal((await put(15792,[1001,0,0,0,0,0])).json().error,'element_battle_pending');
  assert.equal((await app.inject({url:'/v1/element-test/pending/15792',headers:ha})).json().report.battleId,fight.json().battleId);
  assert.equal((await post('settle',{battleId:fight.json().battleId},hb)).statusCode,404);
  const settle=()=>post('settle',{battleId:fight.json().battleId});
  const [one,two]=await Promise.all([settle(),settle()]);
  assert.equal(one.statusCode,200,one.body);
  assert.deepEqual(one.json(),two.json());
  const win=one.json().result===1;
  assert.deepEqual(one.json().rewards,win?elementRewards(elementEvent(15792)!,0,1):[]);
  assert.equal((await settle()).statusCode,200);
  assert.equal((await post('cancel',{battleId:fight.json().battleId})).json().cancelled,false);
  const second=await app.inject({url:'/v1/element-test',headers:hb});
  assert.equal(second.json().events[0].clearedStage,0);
  // Pump only the test user's power and unlock a 2-stage quick path; rewards remain authoritative.
  await s.pg.query('UPDATE player_heroes SET power=20000000 WHERE account_id=$1 AND sid=1001',[a.id]);
  const quickMax=(await app.inject({url:'/v1/element-test',headers:ha})).json().events[0].quickEnd;
  assert.ok(quickMax>=2);
  const cleared=(await app.inject({url:'/v1/element-test',headers:ha})).json().events[0].clearedStage;
  const quick=await post('quick',{eventId:15792,endStage:cleared+2});
  assert.equal(quick.statusCode,200,quick.body);
  assert.deepEqual(quick.json().rewards,elementRewards(elementEvent(15792)!,cleared,cleared+2));
  assert.equal((await post('quick',{eventId:15792,endStage:cleared+2})).json().error,'element_stage_locked');
  assert.equal((await app.inject({url:'/v1/element-test',headers:hb})).json().events[0].clearedStage,0);
  assert.equal((await app.inject({url:'/v1/element-test',headers:ha})).json().events[1].clearedStage,0);
  day='2026-12-27T12:00:00Z';
  const after=(await app.inject({url:'/v1/element-test',headers:ha})).json();
  assert.equal(after.events.length,2);
  // Activity source timestamps shift with reference snapshot; do not generate fake event times.
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
  await app.close();
 }
});
