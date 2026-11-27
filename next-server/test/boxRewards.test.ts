import test from 'node:test';
import assert from 'node:assert/strict';
import {rollBox} from '../src/boxRewards.js';
import {consumeConfig} from '../src/itemCatalog.js';
import {openStorage,migrate} from '../src/storage.js';
import {buildApp} from '../src/app.js';
import {createGuest} from '../src/auth.js';

test('original ItemConsume boxes and summon libraries are loaded without fabricated outcomes',()=>{
 assert.equal(consumeConfig(144)?.subType,2);
 assert.equal(consumeConfig(262)?.subType,5);
 assert.equal(consumeConfig(1503)?.subType,6);
 assert.equal(consumeConfig(1501)?.subType,7);
 const cfg=consumeConfig(144)!;
 assert.ok(cfg.summonType);
 assert.ok(cfg.showLib?.length);
 assert.equal(consumeConfig(1503)?.param[0]?.join(','),'1503,1,1504,3,1505,1');
});

test('original RandomBox roll selects a configured reward and remains deterministic for seeded RNG',()=>{
 for(const boxId of [144,262,1501]){
  const cfg=consumeConfig(boxId)!;
  const a=rollBox(cfg.summonType??0,cfg.showLib??[],()=>0);
  const b=rollBox(cfg.summonType??0,cfg.showLib??[],()=>0);
  assert.deepEqual(a,b);
  assert.ok(a&&a[0]>0&&a[1]>0,'Valid reward for '+boxId);
 }
});

test('inventory box routes require authentication and atomically debit locked keys',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const app=await buildApp(s);
 const a=await createGuest(s);
 const headers={authorization:'Bearer '+a.token};
 const give=async(id:number,count:number)=>s.pg.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount',[a.id,id,count]);
 const amount=async(id:number)=>Number((await s.pg.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=$2',[a.id,id])).rows[0]?.amount??0);
 const use=async(id:number,count=1)=>app.inject({method:'POST',url:'/v1/inventory/use',headers,payload:{itemId:id,count}});
 try{
  const anon=await app.inject({method:'POST',url:'/v1/inventory/use',payload:{itemId:1503}});
  assert.equal(anon.statusCode,401);
  await give(144,3);
  const random=await use(144,2);
  assert.equal(random.statusCode,200,random.body);
  assert.equal(await amount(144),1);
  assert.ok(random.json().rewards.length>0);
  const fail=await use(144,2);
  assert.equal(fail.statusCode,409);
  assert.equal(await amount(144),1);
  const keyless=await use(1503);
  assert.equal(keyless.statusCode,409,keyless.body);
  await give(1503,1);await give(1504,3);await give(1505,1);
  const fixed=await use(1503);
  assert.equal(fixed.statusCode,200,fixed.body);
  assert.equal(await amount(1503),0);
  assert.equal(await amount(1504),0);
  assert.equal(await amount(1505),0);
  assert.deepEqual(fixed.json().rewards.map((x:{itemId:number;amount:string})=>[x.itemId,x.amount]),[[40151,'1'],[40251,'1'],[40351,'1'],[40451,'1']]);
  await give(1501,1);
  const lockedFail=await use(1501);
  assert.equal(lockedFail.statusCode,409);
  assert.equal(await amount(1501),1);
  await give(1502,3);
  const locked=await use(1501);
  assert.equal(locked.statusCode,200,locked.body);
  assert.equal(await amount(1501),0);
  assert.equal(await amount(1502),0);
  assert.equal(locked.json().rewards.length,1);
  await give(262,1);
  const auto=await use(262);
  assert.equal(auto.statusCode,200,auto.body);
  assert.equal(await amount(262),0);
  assert.ok(auto.json().rewards.length>=1);
 }finally{
  await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);
  await app.close();
 }
});
