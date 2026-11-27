import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {secretFloor,secretMonsters,selectPower,makeFloor,monsterRewards,secretDefenders,secretProp,GRASS_OUTCOMES,RESURRECTION_PRICES,neighbours,SECRET_PERIOD_MS} from '../src/secretConfig.js';
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
