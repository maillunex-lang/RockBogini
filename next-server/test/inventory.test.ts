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

test('original ItemPiece hero recipes preserve source ItemPiece IDs and counts',async()=>{
 const {heroPieceRecipe,heroPieceRecipes}=await import('../src/itemCatalog.js');
 const a=heroPieceRecipe(1011301);
 assert.deepEqual(a,{itemId:1011301,need:20,cardId:1111301});
 const all=heroPieceRecipes();
 assert.equal(all.length,218);
 assert.equal(new Set(all.map(x=>x.itemId)).size,218);
 assert.equal(heroPieceRecipe(999999999),undefined);
});

test('POST /v1/inventory/compose debits source fragments atomically and one-click combines only eligible',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const app=await buildApp(s);
 const a=await createGuest(s);
 const headers={authorization:'Bearer '+a.token};
 try{
  await s.pg.query(
   'INSERT INTO player_items(account_id,item_id,amount) VALUES($1,1011301,65),($1,1011302,43)',
   [a.id],
  );
  const pre=(await app.inject({url:'/v1/inventory',headers})).json();
  assert.deepEqual(pre.items.find((x:{itemId:number})=>x.itemId===1011301).compose,{need:20,cardId:1111301,max:3});
  const notUser=await app.inject({method:'POST',url:'/v1/inventory/compose',payload:{itemId:1011301,count:1}});
  assert.equal(notUser.statusCode,401);
  const invalid=await app.inject({method:'POST',url:'/v1/inventory/compose',headers,payload:{itemId:110010,count:1}});
  assert.equal(invalid.statusCode,409);
  const first=await app.inject({method:'POST',url:'/v1/inventory/compose',headers,payload:{itemId:1011301,count:2}});
  assert.equal(first.statusCode,200,first.body);
  assert.equal(first.json().used.remaining,'25');
  assert.equal(first.json().rewards[0].itemId,1111301);
  assert.equal(first.json().rewards[0].amount,'2');
  const blocked=await app.inject({method:'POST',url:'/v1/inventory/compose',headers,payload:{itemId:1011301,count:2}});
  assert.equal(blocked.statusCode,409);
  assert.equal(blocked.json().error,'insufficient_fragments');
  const all=await app.inject({method:'POST',url:'/v1/inventory/compose-all',headers,payload:{}});
  assert.equal(all.statusCode,200,all.body);
  assert.deepEqual(all.json().rewards.map((x:{itemId:number;amount:string})=>[x.itemId,x.amount]),[[1111301,'1'],[1111302,'2']]);
  const items=all.json().inventory.items as {itemId:number;amount:string}[];
  assert.equal(items.find(x=>x.itemId===1011301)?.amount,'5');
  assert.equal(items.find(x=>x.itemId===1011302)?.amount,'3');
  assert.equal(items.find(x=>x.itemId===1111301)?.amount,'3');
  assert.equal(items.find(x=>x.itemId===1111302)?.amount,'2');
  const empty=await app.inject({method:'POST',url:'/v1/inventory/compose-all',headers,payload:{}});
  assert.deepEqual(empty.json().rewards,[]);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);
  await app.close();
 }
});
