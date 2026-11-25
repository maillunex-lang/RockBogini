import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {climbEquip,forgeCost} from '../src/equipment.js';

test('climbEquip and forgeCost match NextId thresholds',()=>{
 assert.deepEqual(climbEquip(40111,1),{itemId:40111,xp:0});
 assert.deepEqual(climbEquip(40111,2),{itemId:40112,xp:0});
 assert.deepEqual(climbEquip(40111,4),{itemId:40113,xp:0});
 assert.equal(forgeCost(1,[{itemId:40111,count:1,unit:1}]),1);
 assert.equal(forgeCost(5,[{itemId:40111,count:1,unit:1}]),1);
});

test('equipment put-on from bag and put-off returns item',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,40111,2),($1,40211,1)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const missing=await app.inject({method:'POST',url:'/v1/equipment/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:40111,ownerId:9999}});
  assert.equal(missing.statusCode,404);
  const on=await app.inject({method:'POST',url:'/v1/equipment/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:40111,ownerId:1001}});
  assert.equal(on.statusCode,200,JSON.stringify(on.json()));
  const worn=on.json().equipment.filter((e:{OwnerId:number})=>e.OwnerId===1001);
  assert.equal(worn.length,1);
  assert.equal(worn[0].ItemId,40111);
  assert.equal(worn[0].slot,1);
  const bag=(await s.pg.query('SELECT amount::int AS n FROM player_items WHERE account_id=$1 AND item_id=40111',[a.id])).rows[0];
  assert.equal(bag.n,1);
  const slots=await app.inject({url:'/v1/heroes/1001/equipment',headers:{authorization:'Bearer '+a.token}});
  assert.equal(slots.statusCode,200);
  assert.equal(slots.json().slots[0].equip.ItemId,40111);
  const off=await app.inject({method:'POST',url:'/v1/equipment/put-off',headers:{authorization:'Bearer '+a.token},payload:{sid:worn[0].Sid}});
  assert.equal(off.statusCode,200);
  assert.equal(off.json().equipment.filter((e:{OwnerId:number})=>e.OwnerId===1001).length,0);
  const bag2=(await s.pg.query('SELECT amount::int AS n FROM player_items WHERE account_id=$1 AND item_id=40111',[a.id])).rows[0];
  assert.equal(bag2.n,2);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('equipment put-on raises hero power via attrs + score',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  const before=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.find((h:{Sid:number})=>h.Sid===1001);
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,40111,1)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const on=await app.inject({method:'POST',url:'/v1/equipment/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:40111,ownerId:1001}});
  assert.equal(on.statusCode,200,JSON.stringify(on.json()));
  const after=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.find((h:{Sid:number})=>h.Sid===1001);
  assert.ok(after.Power>before.Power,`power ${before.Power} -> ${after.Power}`);
  assert.ok(after.equipExtra.some((p:[number,number])=>p[0]===82&&p[1]===1000));
  assert.ok(after.base.attrs[100]>(before.base.attrs[100]??0)||after.base.attrs[0]>=(before.base.attrs[0]??0));
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/equipment/forge climbs NextId with bag materials + coin',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,40111,5),($1,1,10000)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const on=await app.inject({method:'POST',url:'/v1/equipment/put-on',headers:{authorization:'Bearer '+a.token},payload:{itemId:40111,ownerId:1001}});
  assert.equal(on.statusCode,200,JSON.stringify(on.json()));
  const sid=on.json().equipment.find((e:{OwnerId:number})=>e.OwnerId===1001).Sid;
  // own=1+0; feed 1×40111 (unit xp=1) → total 2 → climb to 40112 (need 2)
  const forge=await app.inject({method:'POST',url:'/v1/equipment/forge',headers:{authorization:'Bearer '+a.token},payload:{sid,materials:[{itemId:40111,count:1}]}});
  assert.equal(forge.statusCode,200,JSON.stringify(forge.json()));
  assert.equal(forge.json().after.ItemId,40112);
  assert.ok(forge.json().cost.some((c:[number,number])=>c[0]===1&&c[1]===200));
  const worn=forge.json().equipment.find((e:{Sid:number})=>e.Sid===sid);
  assert.equal(worn.ItemId,40112);
  // feed more to climb further
  const forge2=await app.inject({method:'POST',url:'/v1/equipment/forge',headers:{authorization:'Bearer '+a.token},payload:{sid,materials:[{itemId:40111,count:3}]}});
  assert.equal(forge2.statusCode,200,JSON.stringify(forge2.json()));
  assert.ok(forge2.json().after.ItemId>=40113);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
