import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {abyssTypes,abyssStage,abyssWave,abyssDefenders,abyssBuffs,abyssPointRewards,abyssOpen,abyssParams} from '../src/abyssConfig.js';
import {ABYSS_SINGLE_SIDS,ABYSS_SINGLE_STATIONS,checkSingleRoster,singleUnits,checkTeamRoster,teamUnits} from '../src/abyssFormation.js';
import {starterHeroes} from '../src/starterHeroes.js';
test('exact source abyss maps 2 modes, 140 stages, 1680 enemy waves, 12 buffs',()=>{
 assert.equal(Object.keys(abyssTypes).length,2);
 assert.equal(abyssTypes['1'].mapIdPrefix,0);assert.equal(abyssTypes['2'].mapIdPrefix,10000);
 assert.deepEqual(abyssTypes['1'].openTime,[1,3,5,7]);
 assert.deepEqual(abyssTypes['2'].openTime,[2,4,6]);
 assert.ok(abyssOpen(1,new Date('2026-11-29T03:00:00Z')));
 assert.ok(!abyssOpen(2,new Date('2026-11-29T03:00:00Z')));
 assert.deepEqual(abyssParams.pointWaves,[6,9,12]);
 assert.deepEqual(abyssParams.buffWaves,[3,6,9]);
 assert.equal(Object.keys(abyssBuffs).length,12);
 const ids=new Set<number>();
 for(const t of [1,2])for(let i=1;i<=70;i++){
  const stage=abyssStage(t,i);assert.ok(stage);
  assert.equal(stage.stage.monsters.length,12);
  for(let wave=1;wave<=12;wave++){
   const cfg=abyssWave(t,i,wave);assert.ok(cfg);
   ids.add(cfg.mapId);
   assert.ok(abyssDefenders(t,i,wave)?.length);
   assert.equal(cfg.map.type,t===1?10:11);
  }
 }
 assert.equal(ids.size,1680);
 assert.equal(abyssStage(1,71),null);assert.equal(abyssWave(1,1,13),null);
 assert.deepEqual(abyssPointRewards(1,1,0),[[22,200000]]);
 assert.deepEqual(abyssPointRewards(1,1,1),[[10450,1000]]);
});
test('original Abyss trio positions are the battle center column and never rotate',()=>{
 assert.deepEqual(ABYSS_SINGLE_SIDS,[101,102,103]);
 assert.deepEqual(ABYSS_SINGLE_STATIONS,[1,4,7]);
 assert.ok(checkSingleRoster([1001,1002,0]));
 assert.ok(!checkSingleRoster([1001,1001,0]));
 assert.ok(!checkSingleRoster([1001,0]));
 const heroes=starterHeroes.map(x=>({...x,Attrs:x.Attrs,Skills:x.Skills,SkinId:x.SkinId})) as Parameters<typeof singleUnits>[1];
 const roster=singleUnits([1001,1002,1003],heroes);
 assert.deepEqual(roster.map(x=>x.station),[1,4,7]);
 assert.deepEqual(roster.map(x=>x.id),[2,5,8]);
 assert.deepEqual(roster.map(x=>(x as typeof x&{sid:number}).sid),[1001,1002,1003]);
 assert.throws(()=>singleUnits([1001,9999,0],heroes),/hero_not_owned/);
});
test('abyss formation persists, enforces ownership and owner isolation; lone trio versus main team',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s),app=await buildApp(s);
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const put=(single:number[],headers=ha)=>app.inject({method:'PUT',url:'/v1/abyss/formation',headers,payload:{single}});
 try{
  assert.equal((await app.inject('/v1/abyss/formation')).statusCode,401);
  assert.equal((await put([1001,1002,1003],hb)).statusCode,200);
  assert.equal((await put([1001,1002,1003])).statusCode,200);
  assert.equal((await put([1001,1001,0])).statusCode,400);
  assert.equal((await put([1001,99999,0])).statusCode,409);
  const own=await app.inject({url:'/v1/abyss/formation',headers:ha});
  assert.equal(own.statusCode,200,own.body);
  assert.deepEqual(own.json().single,[1001,1002,1003]);
  assert.deepEqual(own.json().positions,[2,5,8]);
  assert.equal((await app.inject({url:'/v1/abyss',headers:ha})).json().roster.single[2],1003);
  assert.deepEqual((await app.inject({url:'/v1/abyss/formation',headers:hb})).json().single,[1001,1002,1003]);
  // Reject roster edits when an Abyss fight is unresolved.
  const allowed=(await app.inject({url:'/v1/abyss',headers:ha})).json().modes.find((x:{open:boolean})=>x.open)?.type;
  assert.ok(allowed);
  const start=await app.inject({method:'POST',url:'/v1/abyss/challenge',headers:ha,payload:{type:allowed}});
  assert.equal(start.statusCode,200,start.body);
  if(allowed===1){
   assert.deepEqual(start.json().initialUnits.filter((u:{camp:number})=>u.camp===1).map((u:{station:number})=>u.station),[1,4,7]);
  }
  assert.equal((await put([1003,1002,1001])).statusCode,409);
  assert.equal((await app.inject({method:'POST',url:'/v1/abyss/cancel',headers:ha,payload:{battleId:start.json().battleId}})).statusCode,200);
  assert.equal((await put([1003,1002,1001])).statusCode,200);
  assert.deepEqual((await app.inject({url:'/v1/abyss/formation',headers:ha})).json().single,[1003,1002,1001]);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await app.close();
 }
});
test('Abyss team layout 7 uses original FormationType slots independent from the main squad',()=>{
 const heroes=starterHeroes.map(x=>({...x,Attrs:x.Attrs,Skills:x.Skills,SkinId:x.SkinId})) as Parameters<typeof teamUnits>[2];
 assert.equal(checkTeamRoster([1001,1002,1003,0,0,0],101),true);
 assert.equal(checkTeamRoster([1001,1001,0,0,0,0],101),false);
 assert.equal(checkTeamRoster([1001,0,0,0,0,0],905),false);
 assert.equal(checkTeamRoster([1001,0,0],101),false);
 const fighters=teamUnits([1001,1002,1003,0,0,0],101,heroes);
 assert.deepEqual(fighters.map(u=>u.station),[1,3,4]);
 assert.deepEqual(fighters.map(u=>u.id),[2,4,5]);
 const other=teamUnits([1003,1001,0,0,0,0],102,heroes);
 assert.deepEqual(other.map(u=>u.station),[0,2]);
 assert.throws(()=>teamUnits([1001,99999,0,0,0,0],101,heroes),/hero_not_owned/);
});
test('team abyss roster persists separately, enforces ownership and rejects edits during pending battle',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s),app=await buildApp(s);
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const put=(team:number[],teamType=101,headers=ha)=>app.inject({method:'PUT',url:'/v1/abyss/team',headers,payload:{team,teamType}});
 try{
  assert.equal((await app.inject({method:'PUT',url:'/v1/abyss/team',payload:{team:[1001,0,0,0,0,0],teamType:101}})).statusCode,401);
  assert.equal((await put([1001,1002,1003,0,0,0],101)).statusCode,200);
  assert.equal((await put([1001,1001,0,0,0,0],101)).statusCode,400);
  assert.equal((await put([1001,99999,0,0,0,0],101)).statusCode,409);
  assert.equal((await put([1001,0,0],101)).statusCode,400);
  assert.equal((await put([1001,0,0,0,0,0],905)).statusCode,400);
  const own=(await app.inject({url:'/v1/abyss/formation',headers:ha})).json();
  assert.deepEqual(own.team,[1001,1002,1003,0,0,0]);
  assert.equal(own.teamType,101);
  assert.equal(own.teamSid,7);
  assert.deepEqual(own.teamLayouts.find((x:{id:number})=>x.id===101).positions,[2,4,5,6,7,9]);
  const foreign=(await app.inject({url:'/v1/abyss/formation',headers:hb})).json();
  assert.deepEqual(foreign.team,[0,0,0,0,0,0]);
  const main=(await app.inject({url:'/v1/formation',headers:ha})).json();
  assert.deepEqual(main.hero_ids,[1001,1002,0,0,0,0]);
  const modes=(await app.inject({url:'/v1/abyss',headers:ha})).json().modes;
  const open=modes.find((x:{type:number;open:boolean})=>x.type===2&&x.open);
  if(open){
   const start=await app.inject({method:'POST',url:'/v1/abyss/challenge',headers:ha,payload:{type:2}});
   assert.equal(start.statusCode,200,start.body);
   assert.deepEqual(start.json().initialUnits.filter((u:{camp:number})=>u.camp===1).map((u:{station:number})=>u.station),[1,3,4]);
   assert.equal((await put([1003,1002,1001,0,0,0],102)).statusCode,409);
   const cancel=await app.inject({method:'POST',url:'/v1/abyss/cancel',headers:ha,payload:{battleId:start.json().battleId}});
   assert.equal(cancel.statusCode,200,cancel.body);
  }
  assert.equal((await put([1003,1002,1001,0,0,0],102)).statusCode,200);
  assert.deepEqual((await app.inject({url:'/v1/abyss/formation',headers:ha})).json().team,[1003,1002,1001,0,0,0]);
  assert.deepEqual((await app.inject({url:'/v1/formation',headers:ha})).json(),main);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await app.close();
 }
});
test('abyss modes gate weekdays, preserve battle pending, settlement idempotent and owner isolation',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s);
 const app=await buildApp(s);const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const post=(route:string,payload:object,headers=ha)=>app.inject({method:'POST',url:'/v1/abyss/'+route,headers,payload});
 try{
  assert.equal((await app.inject('/v1/abyss')).statusCode,401);
  const list=await app.inject({url:'/v1/abyss',headers:ha});
  assert.equal(list.statusCode,200,list.body);
  assert.equal(list.json().modes.length,2);
  assert.equal(list.json().modes[0].mapIndex,0);
  assert.equal((await post('points',{type:1})).statusCode,409);
  const type=list.json().modes.find((x:{open:boolean})=>x.open)?.type;
  assert.ok(type,'some abyss mode should be open every day');
  if(type===1){
   const f=await app.inject({method:'PUT',url:'/v1/abyss/formation',headers:ha,payload:{single:[1001,1002,1003]}});
   assert.equal(f.statusCode,200,f.body);
  }
  if(type===2){
   const f=await app.inject({method:'PUT',url:'/v1/abyss/team',headers:ha,payload:{team:[1001,1002,1003,0,0,0],teamType:101}});
   assert.equal(f.statusCode,200,f.body);
  }
  const first=await post('challenge',{type});
  assert.equal(first.statusCode,200,first.body);
  assert.equal(first.json().mode,'abyss');
  assert.equal(first.json().waveIndex,1);
  assert.equal(first.json().mapIndex,1);
  assert.equal((await post('challenge',{type})).statusCode,409);
  assert.equal((await post('settle',{battleId:first.json().battleId},hb)).statusCode,404);
  assert.equal((await app.inject({url:'/v1/abyss/pending',headers:ha})).json().report.battleId,first.json().battleId);
  const settle=()=>post('settle',{battleId:first.json().battleId});
  const [one,two]=await Promise.all([settle(),settle()]);
  assert.equal(one.statusCode,200,one.body);
  assert.deepEqual(one.json(),two.json());
  assert.deepEqual((await settle()).json(),one.json());
  assert.equal((await app.inject({url:'/v1/abyss/pending',headers:ha})).json().report,null);
  const row=(await s.pg.query('SELECT map_index,reward_index FROM abyss_progress WHERE account_id=$1 AND abyss_type=$2',[a.id,type])).rows[0];
  assert.equal(row.map_index,0);
  assert.equal(row.reward_index,one.json().result===1?1:0);
  assert.equal((await post('points',{type})).statusCode,409);
  const second=await post('challenge',{type});
  assert.equal(second.statusCode,200,second.body);
  assert.equal(second.json().waveIndex,one.json().result===1?2:1);
  assert.equal((await post('cancel',{battleId:second.json().battleId})).json().cancelled,true);
  assert.equal((await post('settle',{battleId:second.json().battleId})).statusCode,409);
  assert.equal((await post('cancel',{battleId:second.json().battleId})).json().cancelled,false);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
  await app.close();
 }
});
test('abyss reward claim persists and cannot be claimed twice',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 const post=(route:string,payload:object)=>app.inject({method:'POST',url:'/v1/abyss/'+route,headers,payload});
 try{
  await app.inject({url:'/v1/abyss',headers});
  await s.pg.query('UPDATE abyss_progress SET point_rewards=$3 WHERE account_id=$1 AND abyss_type=$2',[a.id,1,JSON.stringify([10,11,12])]);
  const result=await post('points',{type:1});
  assert.equal(result.statusCode,200,result.body);
  assert.deepEqual(result.json().rewards,[[22,200000],[10450,1000],[13,500]]);
  assert.equal((await post('points',{type:1})).statusCode,409);
  for(const [item,count] of result.json().rewards){
   const quantity=(await s.pg.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=$2',[a.id,item])).rows[0].amount;
   assert.equal(Number(quantity),count);
  }
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
