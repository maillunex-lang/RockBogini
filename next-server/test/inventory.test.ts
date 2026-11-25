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
  const chalice=body.items.find((i:{itemId:number})=>i.itemId===110010);
  assert.ok(chalice);
  assert.equal(chalice.kind,'consume');
  assert.equal(chalice.usable,false);
  assert.equal(typeof chalice.icon,'string');
  assert.equal(body.currencies.coin,'0');
  assert.equal(typeof body.itemCount,'number');
  assert.ok(body.byKind);
  await s.pg.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,1,1234) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount',[a.id]);
  const r2=(await app.inject({url:'/v1/inventory',headers:{authorization:'Bearer '+a.token}})).json();
  assert.equal(r2.currencies.coin,'1234');
  assert.ok(r2.items.some((i:{itemId:number;amount:string;kind:string})=>i.itemId===1&&i.amount==='1234'&&i.kind==='currency'));
  assert.ok((r2.byKind.currency??0)>=1);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);
  await app.close();
 }
});

test('POST /v1/inventory/sell sells override-priced materials for coin',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const app=await buildApp(s);
 const a=await createGuest(s);
 try{
  await s.pg.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,10001,5) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount',[a.id]);
  const bad=await app.inject({method:'POST',url:'/v1/inventory/sell',headers:{authorization:'Bearer '+a.token},payload:{itemId:110010,count:1}});
  assert.equal(bad.statusCode,409);
  assert.equal(bad.json().error,'not_sellable');
  const r=await app.inject({method:'POST',url:'/v1/inventory/sell',headers:{authorization:'Bearer '+a.token},payload:{itemId:10001,count:2}});
  assert.equal(r.statusCode,200);
  const body=r.json();
  assert.equal(body.gained.itemId,1);
  assert.equal(body.gained.amount,'50'); // 25 * 2
  assert.equal(body.sold.remaining,'3');
  assert.equal(body.inventory.currencies.coin,'50');
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);
  await app.close();
 }
});

test('POST /v1/inventory/use opens FixedBox consume items',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const app=await buildApp(s);
 const a=await createGuest(s);
 try{
  // FixedBox 331 → four equipment mats ×1
  await s.pg.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,331,1) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount',[a.id]);
  const blocked=await app.inject({method:'POST',url:'/v1/inventory/use',headers:{authorization:'Bearer '+a.token},payload:{itemId:110010,count:1}});
  assert.equal(blocked.statusCode,409);
  assert.equal(blocked.json().error,'not_usable');
  const r=await app.inject({method:'POST',url:'/v1/inventory/use',headers:{authorization:'Bearer '+a.token},payload:{itemId:331,count:1}});
  assert.equal(r.statusCode,200);
  const body=r.json();
  assert.equal(body.used.remaining,'0');
  assert.ok(body.rewards.length>=4);
  assert.ok(body.inventory.items.some((i:{itemId:number})=>i.itemId===40141));
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);
  await app.close();
 }
});
