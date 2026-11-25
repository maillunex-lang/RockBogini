import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {buildApp} from '../src/app.js';
import {createGuest} from '../src/auth.js';

test('GET /v1/inventory returns bag and currencies',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const app=await buildApp(s);
 const a=await createGuest(s);
 try{
  assert.equal((await app.inject('/v1/inventory')).statusCode,401);
  const r=await app.inject({url:'/v1/inventory',headers:{authorization:'Bearer '+a.token}});
  assert.equal(r.statusCode,200);
  const body=r.json();
  assert.ok(Array.isArray(body.items));
  assert.ok(body.items.some((i:{itemId:number})=>i.itemId===110010));
  assert.equal(body.currencies.coin,'0');
  assert.equal(typeof body.itemCount,'number');
  await s.pg.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,1,1234) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount',[a.id]);
  const r2=(await app.inject({url:'/v1/inventory',headers:{authorization:'Bearer '+a.token}})).json();
  assert.equal(r2.currencies.coin,'1234');
  assert.ok(r2.items.some((i:{itemId:number;amount:string})=>i.itemId===1&&i.amount==='1234'));
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);
  await app.close();
 }
});
