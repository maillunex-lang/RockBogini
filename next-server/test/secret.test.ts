import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {secretFloor,secretMonsters,selectPower,makeFloor,monsterRewards,secretDefenders,secretProp,GRASS_OUTCOMES,RESURRECTION_PRICES,neighbours,SECRET_PERIOD_MS,defeatSecretCell,survivingMonsterHp} from '../src/secretConfig.js';
test('exact source secret area floor sizes, monsters, source weights and treasure',()=>{
 assert.deepEqual([1,2,3,4].map(i=>secretFloor(i).map.length),[79,101,133,79]);
 assert.equal(secretFloor(4).type,2);
 assert.equal(Object.keys(secretMonsters).length,49);
 assert.deepEqual(GRASS_OUTCOMES,[[4,1,10],[4,2,10],[2,1,10]]);
 assert.deepEqual(RESURRECTION_PRICES,[100,200,300]);
 assert.equal(SECRET_PERIOD_MS,172800000);
 assert.equal(selectPower(0).id,10001);
 assert.deepEqual(secretMonsterFirst(),[25,20]);
 assert.equal(secretProp(4)?.param[0],300);
 const x=makeFloor(1,10001);
 assert.equal(x.cells.length,79);
 assert.equal(x.cells.filter(c=>c[4]===3).length,1);
 assert.equal(x.cells.filter(c=>c[4]===2).length,10);
 assert.equal(x.cells.filter(c=>c[4]===4).length,6);
 assert.equal(x.cells.filter(c=>c[4]===5).length,6);
 assert.equal(x.cells[x.view][3],1);
 assert.ok(x.cells.some(c=>c[3]===2));
 assert.deepEqual(x.cells.filter(c=>c[3]!==0).length>1,true);
 const enemy=x.cells.find(c=>c[4]===2)!;
 assert.ok(secretDefenders(enemy[5],enemy[6],10001,enemy.slice(8,13))?.length);
 assert.ok(monsterRewards(1).length>0);
 const changed=neighbours(x.cells,x.view);
 assert.equal(changed.length,79);
});
function secretMonsterFirst(){return secretMonsters['1'].rewards[0]}
test('guardian becomes portal after defeat and can lead to all three exploration floors',()=>{
 for(let floor=1;floor<=3;floor++){
  const map=makeFloor(floor,10001);
  const index=map.cells.findIndex(c=>c[4]===3);
  assert.ok(index>=0);
  const guardian=map.cells[index];
  const portal=defeatSecretCell([...guardian.slice(0,3),1,...guardian.slice(4)]);
  assert.deepEqual(portal.slice(3),[1,6]);
  assert.equal(portal.length,5);
  assert.throws(()=>defeatSecretCell(portal),/secret_cell_not_monster/);
 }
 const blank=makeFloor(1,10001).cells.find(c=>c[4]===1)!;
 assert.equal(defeatSecretCell([...blank.slice(0,3),1,2,280101,1])[4],1);
});
test('surviving monster HP follows roster positions and does not resurrect dead foes',()=>{
 const roster=[[5,280101],[2,280102],[9,280103]];
 const hp=survivingMonsterHp([900,0,500,0,0],[{station:4,hp:23,hpMax:100},{station:8,hp:0,hpMax:100}],roster);
 assert.deepEqual(hp,[230,0,0,0,0]);
 assert.deepEqual(survivingMonsterHp([500],[{station:4,hp:80,hpMax:100}],roster),[800,1000,1000,0,0]);
});
test('secret exploration selects source highest historical power only on a fresh two-day period',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 try{
  const first=await app.inject({url:'/v1/secret',headers});
  assert.equal(first.statusCode,200,first.body);
  const old=first.json();
  const levels=[0,1000000000,2000000000].map(p=>selectPower(p).id);
  assert.ok(levels[2]>=levels[0]);
  const topPower=2000000000;
  const topLevel=selectPower(topPower);
  await s.pg.query('UPDATE player_profiles SET power=1,highest_power=$2 WHERE account_id=$1',[a.id,topPower]);
  const samePeriod=(await app.inject({url:'/v1/secret',headers})).json();
  assert.equal(samePeriod.powerLevelId,old.powerLevelId);
  await s.pg.query("UPDATE secret_exploration SET reset_at=now()-interval '4 days' WHERE account_id=$1",[a.id]);
  const reset=await app.inject({url:'/v1/secret',headers});
  assert.equal(reset.statusCode,200,reset.body);
  assert.equal(reset.json().powerLevelId,topLevel.id);
  assert.equal(reset.json().floor,1);
  assert.equal(reset.json().cells.length,79);
  await s.pg.query('UPDATE player_profiles SET power=$2,highest_power=$2 WHERE account_id=$1',[a.id,1]);
  const retained=(await app.inject({url:'/v1/secret',headers})).json();
  assert.equal(retained.powerLevelId,topLevel.id);
  await s.pg.query("UPDATE secret_exploration SET reset_at=now()-interval '4 days' WHERE account_id=$1",[a.id]);
  const down=(await app.inject({url:'/v1/secret',headers})).json();
  assert.equal(down.powerLevelId,selectPower(1).id);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
test('secret map authorizes clicks, keeps fog and rejects remote/duplicate cells',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const a=await createGuest(s),b=await createGuest(s);const app=await buildApp(s);
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const post=(route:string,payload:object,headers=ha)=>app.inject({method:'POST',url:'/v1/secret/'+route,headers,payload});
 try{
  assert.equal((await app.inject('/v1/secret')).statusCode,401);
  const x=await app.inject({url:'/v1/secret',headers:ha});assert.equal(x.statusCode,200,x.body);
  const data=x.json();
  assert.equal(data.floor,1);assert.equal(data.cells.length,79);
  assert.equal(data.props.length,3);
  assert.equal((await app.inject({url:'/v1/secret',headers:hb})).json().floor,1);
  assert.equal((await post('treasure',{index:0})).statusCode,409);
  assert.equal((await post('click',{index:999})).statusCode,400);
  const gray=data.cells.findIndex((c:number[])=>c[3]===0);
  assert.equal((await post('click',{index:gray})).statusCode,409);
  const fog=data.cells.findIndex((c:number[])=>c[3]===2);
  assert.ok(fog>=0);
  const opened=await post('click',{index:fog});assert.equal(opened.statusCode,200,opened.body);
  assert.equal(opened.json().cells[fog][3],1);
  // A fog cell can reveal a prop, bush or monster. Only a blank cell is non-clickable;
  // others have a legitimate follow-up click, as in the original handler.
  if(opened.json().cells[fog][4]===1)
   assert.equal((await post('click',{index:fog})).statusCode,409);
  const retained=(await app.inject({url:'/v1/secret',headers:ha})).json();
  assert.equal(retained.cells[fog][3],1);
  assert.equal((await post('challenge',{index:fog},hb)).statusCode,409);
  assert.equal((await post('resurrect',{})).statusCode,409);
  assert.equal((await post('use-prop',{slot:0})).statusCode,409);
}finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
  await app.close();
 }
});
test('secret battle persistence, authorization, idempotent settlement, keep reward once',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s),b=await createGuest(s);const app=await buildApp(s);
 const ha={authorization:'Bearer '+a.token},hb={authorization:'Bearer '+b.token};
 const post=(route:string,payload:object,headers=ha)=>app.inject({method:'POST',url:'/v1/secret/'+route,headers,payload});
 try{
  const x=await app.inject({url:'/v1/secret',headers:ha});assert.equal(x.statusCode,200,x.body);
  const cells=x.json().cells as number[][];
  const monsterIndex=cells.findIndex(c=>c[4]===2);
  assert.ok(monsterIndex>=0);
  const row=await s.pg.query('SELECT cells FROM secret_exploration WHERE account_id=$1',[a.id]);
  const all=row.rows[0].cells as number[][];
  all[monsterIndex][3]=1;
  await s.pg.query('UPDATE secret_exploration SET cells=$2 WHERE account_id=$1',[a.id,JSON.stringify(all)]);
  const first=await post('challenge',{index:monsterIndex});assert.equal(first.statusCode,200,first.body);
  assert.equal(first.json().mode,'secret');
  assert.equal(first.json().mapId,all[monsterIndex][5]);
  assert.equal((await post('challenge',{index:monsterIndex})).statusCode,409);
  assert.equal((await post('settle',{battleId:first.json().battleId},hb)).statusCode,404);
  assert.equal((await app.inject({url:'/v1/secret/pending',headers:ha})).json().report.battleId,first.json().battleId);
  const settle=()=>post('settle',{battleId:first.json().battleId});
  const [one,two]=await Promise.all([settle(),settle()]);
  assert.equal(one.statusCode,200,one.body);
  assert.deepEqual(two.json(),one.json());
  assert.deepEqual((await settle()).json(),one.json());
  assert.equal((await app.inject({url:'/v1/secret/pending',headers:ha})).json().report,null);
  const after=(await app.inject({url:'/v1/secret',headers:ha})).json();
  assert.equal(after.cells[monsterIndex][4],one.json().result===1?1:2);
  assert.equal((await post('settle',{battleId:first.json().battleId},hb)).statusCode,404);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
  await app.close();
 }
});
test('guardian victory opens actual portal and a click advances to floor 2',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);
 const account=await createGuest(s),app=await buildApp(s);
 const headers={authorization:'Bearer '+account.token};
 const post=(path:string,body:object)=>app.inject({method:'POST',url:'/v1/secret/'+path,headers,payload:body});
 try{
  const first=await app.inject({url:'/v1/secret',headers});assert.equal(first.statusCode,200,first.body);
  const cells=first.json().cells as number[][];
  const guardian=cells.findIndex(c=>c[4]===3);
  assert.ok(guardian>=0);
  // Only test account's isolated map: force guardian to open, then simulate a winning
  // battle report from trusted server storage, not forged API input.
  cells[guardian][3]=1;
  await s.pg.query('UPDATE secret_exploration SET cells=$2 WHERE account_id=$1',[account.id,JSON.stringify(cells)]);
  const battle=await post('challenge',{index:guardian});
  assert.equal(battle.statusCode,200,battle.body);
  await s.pg.query("UPDATE secret_battles SET report=jsonb_set(report,'{summary,resultCode}','2'::jsonb) WHERE id=$1",[battle.json().battleId]);
  const settled=await post('settle',{battleId:battle.json().battleId});
  assert.equal(settled.statusCode,200,settled.body);
  assert.equal(settled.json().result,1);
  const updated=await app.inject({url:'/v1/secret',headers});
  assert.equal(updated.statusCode,200,updated.body);
  assert.deepEqual(updated.json().cells[guardian].slice(3),[1,6]);
  const click=await post('click',{index:guardian});
  assert.equal(click.statusCode,200,click.body);
  assert.equal(click.json().floor,2);
  assert.equal(click.json().cells.length,101);
  const reloaded=await app.inject({url:'/v1/secret',headers});
  assert.equal(reloaded.json().floor,2);
  assert.equal(reloaded.json().cells.length,101);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=$1',[account.id]);await app.close();
 }
});
test('failed secret battle saves monster HP and excludes enemies with zero HP on next challenge',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s),app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 const post=(path:string,body:object)=>app.inject({method:'POST',url:'/v1/secret/'+path,headers,payload:body});
 try{
  const map=await app.inject({url:'/v1/secret',headers});
  assert.equal(map.statusCode,200,map.body);
  const cells=map.json().cells as number[][];
  const monster=cells.findIndex(c=>c[4]===2);
  assert.ok(monster>=0);
  cells[monster][3]=1;
  const old=cells[monster].slice(8,13);
  await s.pg.query('UPDATE secret_exploration SET cells=$2 WHERE account_id=$1',[a.id,JSON.stringify(cells)]);
  const battle=await post('challenge',{index:monster});
  assert.equal(battle.statusCode,200,battle.body);
  const initial=battle.json().initialUnits as {id:number;station:number;camp:number}[];
  const defenders=initial.filter(u=>u.camp===-1);
  assert.ok(defenders.length>1);
  const defenderId=defenders[0].id;
  // Battle runner is server authoritative; test updates only its isolated DB report
  // to make the failed 5-person battle deterministic and validate settlement logic.
  const stored=(await s.pg.query('SELECT report FROM secret_battles WHERE id=$1',[battle.json().battleId])).rows[0].report;
  stored.summary.resultCode=3;
  const enemy=stored.summary.heroes.find((x:{id:number})=>x.id===defenderId);
  enemy.hp=0;
  await s.pg.query('UPDATE secret_battles SET report=$2 WHERE id=$1',[battle.json().battleId,JSON.stringify(stored)]);
  const settled=await post('settle',{battleId:battle.json().battleId});
  assert.equal(settled.statusCode,200,settled.body);
  assert.equal(settled.json().result,0);
  const state=(await app.inject({url:'/v1/secret',headers})).json();
  assert.equal(state.cells[monster][8+defenders.findIndex(u=>u.id===defenderId)],0);
  // A defeated attacker squad may have no survivors, in which case recovery
  // is required before a re-challenge. Use an original resurrection prop.
  await s.pg.query('UPDATE secret_exploration SET props=$2 WHERE account_id=$1',[a.id,JSON.stringify([[3,1],[0,0],[0,0]])]);
  const revived=await post('use-prop',{slot:0});
  assert.equal(revived.statusCode,200,revived.body);
  const retry=await post('challenge',{index:monster});
  assert.equal(retry.statusCode,200,retry.body);
  assert.equal(retry.json().initialUnits.filter((u:{camp:number})=>u.camp===-1).length,defenders.length-1);
  assert.deepEqual(old,[1000,1000,1000,1000,1000]);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
test('secret items and treasure are transactional and cannot be duplicated',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 const post=(route:string,payload:object)=>app.inject({method:'POST',url:'/v1/secret/'+route,headers,payload});
 try{
  const map=await app.inject({url:'/v1/secret',headers});assert.equal(map.statusCode,200,map.body);
  const cell=(map.json().cells as number[][]).findIndex(c=>c[4]===2);
  assert.ok(cell>=0);
  let rows=(await s.pg.query('SELECT cells,props FROM secret_exploration WHERE account_id=$1',[a.id])).rows[0];
  const cells=rows.cells as number[][];
  cells[cell][3]=1;
  await s.pg.query('UPDATE secret_exploration SET cells=$2,props=$3 WHERE account_id=$1',[a.id,JSON.stringify(cells),JSON.stringify([[2,1],[3,1],[4,1]])]);
  assert.equal((await post('use-prop',{slot:0,index:cell})).statusCode,200);
  assert.equal((await post('use-prop',{slot:0,index:cell})).statusCode,409);
  assert.equal((await post('use-prop',{slot:1})).statusCode,200);
  assert.equal((await post('use-prop',{slot:1})).statusCode,409);
  await s.pg.query('UPDATE secret_exploration SET floor=4,cells=$2,reward_state=$3 WHERE account_id=$1',[a.id,JSON.stringify([]),JSON.stringify([0,0,0,0])]);
  assert.equal((await post('treasure',{index:0})).statusCode,200);
  assert.equal((await post('treasure',{index:0})).statusCode,409);
  const rewards=(await post('treasure',{index:1}));assert.equal(rewards.statusCode,200);
  assert.ok(rewards.json().rewards.length>0);
  await Promise.all([post('treasure',{index:2}),post('treasure',{index:3})]);
  const done=(await app.inject({url:'/v1/secret',headers})).json();
  assert.equal(done.finished,true);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
