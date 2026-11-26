import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {getProfile} from '../src/profile.js';
import {vipLevelFor} from '../src/shop.js';

test('vipLevelFor thresholds',()=>{
 assert.equal(vipLevelFor(0),0);
 assert.equal(vipLevelFor(99),0);
 assert.equal(vipLevelFor(100),1);
 assert.equal(vipLevelFor(500),2);
 assert.equal(vipLevelFor(2000),3);
});

test('shop 2 free+diamond buy and daily limit',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  const free=await app.inject({
   method:'POST',url:'/v1/shop/2/buy',headers,payload:{id:201001,count:1},
  });
  assert.equal(free.statusCode,200,free.body);
  assert.deepEqual(free.json().rewards,[[37001,1]]);
  const again=await app.inject({
   method:'POST',url:'/v1/shop/2/buy',headers,payload:{id:201001,count:1},
  });
  assert.equal(again.statusCode,409);

  const broke=await app.inject({
   method:'POST',url:'/v1/shop/2/buy',headers,payload:{id:202001,count:1},
  });
  assert.equal(broke.statusCode,402);

  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,3,200)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=200`,[a.id],
  );
  const paid=await app.inject({
   method:'POST',url:'/v1/shop/2/buy',headers,payload:{id:202001,count:1},
  });
  assert.equal(paid.statusCode,200,paid.body);
  assert.deepEqual(paid.json().rewards,[[10001,500]]);
  const diamonds=Number((await s.pg.query(
   'SELECT amount FROM player_items WHERE account_id=$1 AND item_id=3',[a.id],
  )).rows[0].amount);
  assert.equal(diamonds,0);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('shop 1 refreshable shelf buy + refresh',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,1,100000000),($1,3,100000)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,[a.id],
  );
  const list=await app.inject({url:'/v1/shop/1',headers});
  assert.equal(list.statusCode,200,list.body);
  assert.equal(list.json().isRefresh,true);
  assert.ok(list.json().goods.length>=6);
  const slot=list.json().goods.find((g:{vipLimit:number;price:number})=>g.vipLimit===0&&g.price>0)
   ??list.json().goods[0];
  const buy=await app.inject({
   method:'POST',url:'/v1/shop/1/buy',headers,payload:{id:slot.slot,count:1},
  });
  assert.equal(buy.statusCode,200,buy.body);
  assert.ok(buy.json().rewards.length);

  const freeRefresh=await app.inject({
   method:'POST',url:'/v1/shop/1/refresh',headers,payload:{useCurrency:false},
  });
  assert.equal(freeRefresh.statusCode,200,freeRefresh.body);
  assert.ok(freeRefresh.json().goods.length>=6);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('VIP gift buy',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,2,100),($1,3,1000)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,[a.id],
  );
  const info=await app.inject({url:'/v1/vip',headers});
  assert.equal(info.statusCode,200);
  assert.equal(info.json().level,1);
  const gift=await app.inject({method:'POST',url:'/v1/vip/gift',headers,payload:{id:1}});
  assert.equal(gift.statusCode,200,gift.body);
  assert.ok(gift.json().rewards.length);
  const again=await app.inject({method:'POST',url:'/v1/vip/gift',headers,payload:{id:1}});
  assert.equal(again.statusCode,409);
  const locked=await app.inject({method:'POST',url:'/v1/vip/gift',headers,payload:{id:2}});
  assert.equal(locked.statusCode,403);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
