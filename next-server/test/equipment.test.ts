import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';

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
