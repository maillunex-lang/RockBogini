import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {canStarUp,holyPieceExtra,holyWornBonus,nextStarTarget} from '../src/holy.js';

test('holyPieceExtra applies base attrs and HolyEquipmentScore',()=>{
 const extra=holyPieceExtra({Sid:1,ItemId:41001,Star:0,Level:0,Xp:0,Stage:0,Step:0,OwnerId:0});
 assert.ok(extra.some(p=>p[0]===100&&p[1]===5000));
 assert.ok(extra.some(p=>p[0]===104&&p[1]===80));
 assert.ok(extra.some(p=>p[0]===82&&p[1]===10000));
});

test('holyWornBonus adds Suit2 power/score for two pieces',()=>{
 const worn=[
  {Sid:1,ItemId:41001,Star:0,Level:0,Xp:0,Stage:0,Step:0,OwnerId:1},
  {Sid:2,ItemId:41002,Star:0,Level:0,Xp:0,Stage:0,Step:0,OwnerId:1},
 ];
 const {extra,powerBonus}=holyWornBonus(worn);
 assert.equal(powerBonus,10000);
 assert.ok(extra.some(p=>p[0]===82&&(p[1]??0)>=10000));
});

test('holy put-on from bag and put-off, raises power',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  const before=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.find((h:{Sid:number})=>h.Sid===1001);
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,41001,1),($1,41002,1)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const on=await app.inject({method:'POST',url:'/v1/holy/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:41001,ownerId:1001}});
  assert.equal(on.statusCode,200,JSON.stringify(on.json()));
  const worn=on.json().holy.filter((e:{OwnerId:number})=>e.OwnerId===1001);
  assert.equal(worn.length,1);
  assert.equal(worn[0].ItemId,41001);
  assert.equal(worn[0].type,1);
  const after1=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.find((h:{Sid:number})=>h.Sid===1001);
  assert.ok(after1.Power>before.Power,`power ${before.Power} -> ${after1.Power}`);
  const on2=await app.inject({method:'POST',url:'/v1/holy/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:41002,ownerId:1001}});
  assert.equal(on2.statusCode,200,JSON.stringify(on2.json()));
  const after2=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.find((h:{Sid:number})=>h.Sid===1001);
  assert.ok(after2.Power>after1.Power,`suit2 power ${after1.Power} -> ${after2.Power}`);
  assert.ok((after2.holyPowerBonus??0)>=10000);
  const slots=await app.inject({url:'/v1/heroes/1001/holy',headers:{authorization:'Bearer '+a.token}});
  assert.equal(slots.statusCode,200);
  assert.equal(slots.json().slots.filter((x:{equip:unknown})=>x.equip).length,2);
  const off=await app.inject({method:'POST',url:'/v1/holy/put-off',headers:{authorization:'Bearer '+a.token},payload:{sid:worn[0].Sid}});
  assert.equal(off.statusCode,200);
  assert.equal(off.json().holy.filter((e:{OwnerId:number})=>e.OwnerId===1001).length,1);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/holy/level-up spends xp items and coin',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,41001,1),($1,101,2),($1,1,1000)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const on=await app.inject({method:'POST',url:'/v1/holy/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:41001,ownerId:1001}});
  assert.equal(on.statusCode,200,JSON.stringify(on.json()));
  const sid=on.json().holy.find((e:{OwnerId:number})=>e.OwnerId===1001).Sid;
  const up=await app.inject({method:'POST',url:'/v1/holy/level-up',headers:{authorization:'Bearer '+a.token},payload:{sid,counts:[2,0,0,0]}});
  assert.equal(up.statusCode,200,JSON.stringify(up.json()));
  assert.equal(up.json().after.Xp,2000);
  assert.equal(up.json().after.Level,1);
  assert.equal(up.json().cost.find((c:[number,number])=>c[0]===1)?.[1],400);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('nextStarTarget and canStarUp follow HolyEquipmentStar Unlock',()=>{
 const s0=nextStarTarget(0,0,1);
 assert.ok(s0);
 assert.equal(s0!.value,1);
 assert.deepEqual(s0!.materials,[[105,10]]);
 assert.equal(canStarUp(0,0,1),true);
 assert.equal(canStarUp(5,0,1),false);
 assert.equal(canStarUp(4,0,2),false);
 assert.equal(canStarUp(5,0,2),true);
 const step=nextStarTarget(5,0,2);
 assert.ok(step);
 assert.equal(step!.value,1);
 assert.deepEqual(step!.materials,[[403,2],[404,4]]);
});

test('POST /v1/holy/star-up spends materials and raises star/step',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,41001,1),($1,105,20),($1,403,2),($1,404,4)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const on=await app.inject({method:'POST',url:'/v1/holy/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:41001,ownerId:1001}});
  assert.equal(on.statusCode,200,JSON.stringify(on.json()));
  const sid=on.json().holy.find((e:{OwnerId:number})=>e.OwnerId===1001).Sid;
  const before=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.find((h:{Sid:number})=>h.Sid===1001);
  const up=await app.inject({method:'POST',url:'/v1/holy/star-up',headers:{authorization:'Bearer '+a.token},payload:{sid,type:1}});
  assert.equal(up.statusCode,200,JSON.stringify(up.json()));
  assert.equal(up.json().after.Star,1);
  assert.deepEqual(up.json().cost,[[105,10]]);
  const after=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.find((h:{Sid:number})=>h.Sid===1001);
  assert.ok(after.Power>before.Power,`power ${before.Power} -> ${after.Power}`);
  const bag=(await s.pg.query('SELECT amount::int AS n FROM player_items WHERE account_id=$1 AND item_id=105',[a.id])).rows[0];
  assert.equal(bag.n,10);
  // Step requires ★5
  const locked=await app.inject({method:'POST',url:'/v1/holy/star-up',headers:{authorization:'Bearer '+a.token},payload:{sid,type:2}});
  assert.equal(locked.statusCode,409);
  await s.pg.query('UPDATE player_holy_equipment SET star=5 WHERE account_id=$1 AND sid=$2',[a.id,sid]);
  const step=await app.inject({method:'POST',url:'/v1/holy/star-up',headers:{authorization:'Bearer '+a.token},payload:{sid,type:2}});
  assert.equal(step.statusCode,200,JSON.stringify(step.json()));
  assert.equal(step.json().after.Step,1);
  assert.equal(step.json().after.Star,5);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('holy put-on clears normal equipment on same slot',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,40111,1),($1,41001,1)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const eq=await app.inject({method:'POST',url:'/v1/equipment/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:40111,ownerId:1001}});
  assert.equal(eq.statusCode,200);
  const holy=await app.inject({method:'POST',url:'/v1/holy/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:41001,ownerId:1001}});
  assert.equal(holy.statusCode,200,JSON.stringify(holy.json()));
  const bag=(await s.pg.query('SELECT amount::int AS n FROM player_items WHERE account_id=$1 AND item_id=40111',[a.id])).rows[0];
  assert.equal(bag.n,1);
  const wornEq=(await s.pg.query('SELECT count(*)::int AS n FROM player_equipment WHERE account_id=$1 AND owner_sid=1001',[a.id])).rows[0];
  assert.equal(wornEq.n,0);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
