import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {pullMany,pullOnce,heroCard,prophetCost,crystalCost} from '../src/summon.js';
import {getHeroes} from '../src/heroes.js';

test('heroCard maps ItemHeroCard to hero/star',()=>{
 const c=heroCard(1111401);
 assert.ok(c);
 assert.ok(c!.heroId>0);
 assert.equal(typeof c!.starLevel,'number');
});

test('pullOnce OnceLibs burns 10107 then falls through',()=>{
 const typeCfg={
  libs:[[1,10107],[2,10101],[3,10102],[4,10103],[5,10104],[6,10105],[7,10106]],
  onceLibs:[1],startFreeCount:1,dailyFreeCount:1,
 };
 let model={libCount:{},libStatus:{},freeCount:1,todayCount:0,totalCount:0};
 // force first slot always by rng that returns ~0 for chance and 0 for picks
 const rng=()=>0;
 const first=pullOnce(typeCfg,model,rng);
 assert.ok(first.item);
 assert.equal(first.model.libStatus['10107'],1);
 model=first.model;
 const second=pullOnce(typeCfg,model,rng);
 assert.ok(second.item);
 assert.equal(second.model.libStatus['10107'],1);
 // 10107 should not be re-selected as candidate after once
 assert.ok(!Object.keys(second.model.libCount).includes('10107')||second.model.libCount['10107']===0||second.model.libStatus['10107']===1);
});

test('pullMany returns summonCount items',()=>{
 const model={libCount:{},libStatus:{},freeCount:0,todayCount:0,totalCount:0};
 const {items}=pullMany(101,model,10,()=>0.5);
 assert.equal(items.length,10);
});

test('pullMany senior type 102 returns items with pity libs',()=>{
 const model={libCount:{},libStatus:{},freeCount:0,todayCount:0,totalCount:0};
 const {items}=pullMany(102,model,10,()=>0.5);
 assert.equal(items.length,10);
});

test('pullMany oracle type 201 filters by element',()=>{
 const model={libCount:{},libStatus:{},freeCount:0,todayCount:0,totalCount:0};
 const {items}=pullMany(201,model,5,()=>0.5,1);
 assert.equal(items.length,5);
 assert.equal(prophetCost({currencyId:14001,baseCurrencyCount:1,advCurrencyCount:1,summonType:201,extra:[],times:1},4),1);
 assert.equal(prophetCost({currencyId:14001,baseCurrencyCount:1,advCurrencyCount:2,summonType:201,extra:[],times:1},4),2);
});

test('pullMany crystal type 301 filters by element and costs',()=>{
 const model={libCount:{},libStatus:{},freeCount:0,todayCount:0,totalCount:0};
 const {items}=pullMany(301,model,3,()=>0.5,5);
 assert.equal(items.length,3);
 const cfg={currencyId:39,baseCurrencyCount:1000,advCurrencyCount:2000,summonType:301,extra:[],times:1};
 assert.equal(crystalCost(cfg,1),1000);
 assert.equal(crystalCost(cfg,4),2000);
 assert.equal(crystalCost(cfg,5),2000);
});

test('starter collection preserves heroes obtained before initialization',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);
 const old=heroCard(1111401);
 assert.ok(old);
 const oldHeroId=old.heroId;
 const orphan={Sid:1001,HeroId:oldHeroId,Level:1,StarLevel:Math.max(1,old.starLevel),Power:0,Locked:false};
 try{
  await s.pg.query(
   'INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
   [a.id,1001,oldHeroId,1,orphan.StarLevel,0,false,JSON.stringify(orphan)],
  );
  const heroes=await getHeroes(s,a.id);
  assert.equal(heroes.length,4);
  assert.equal(heroes.find(h=>h.Sid===1001)?.HeroId,oldHeroId);
  assert.equal(heroes.find(h=>h.HeroId===11303)?.Sid,1004);
  assert.equal(heroes.find(h=>h.HeroId===12301)?.Sid,1002);
  assert.equal(heroes.find(h=>h.HeroId===12402)?.Sid,1003);
  assert.equal((await getHeroes(s,a.id)).length,4);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await s.close()}
});

test('POST /v1/summon/pull grants heroes and spends tickets',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  const info=await app.inject({url:'/v1/summon',headers:{authorization:'Bearer '+a.token}});
  assert.equal(info.statusCode,200);
  assert.ok(info.json().ticket.amount>=20);
  const before=info.json().ticket.amount;
  const beforeHeroes=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.length;
  const pull=await app.inject({
   method:'POST',url:'/v1/summon/pull',
   headers:{authorization:'Bearer '+a.token},
   payload:{type:1,itemId:10401},
  });
  assert.equal(pull.statusCode,200,JSON.stringify(pull.json()));
  assert.equal(pull.json().times,1);
  assert.ok(pull.json().heroes.length>=1);
  assert.equal(pull.json().ticket.amount,before-1);
  const afterHeroes=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.length;
  assert.ok(afterHeroes>beforeHeroes);
  const ten=await app.inject({
   method:'POST',url:'/v1/summon/pull',
   headers:{authorization:'Bearer '+a.token},
   payload:{type:2},
  });
  assert.equal(ten.statusCode,200,JSON.stringify(ten.json()));
  assert.equal(ten.json().times,10);
  assert.equal(ten.json().heroes.length,10);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/summon/pull senior spends 10403 and grants heroes',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  const info=await app.inject({url:'/v1/summon',headers:{authorization:'Bearer '+a.token}});
  assert.equal(info.statusCode,200);
  assert.ok(info.json().banners.some((b:{id:number})=>b.id===3));
  assert.ok(info.json().tickets.senior.amount>=11);
  const before=info.json().tickets.senior.amount;
  const beforeHeroes=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.length;
  const pull=await app.inject({
   method:'POST',url:'/v1/summon/pull',
   headers:{authorization:'Bearer '+a.token},
   payload:{type:3,itemId:10403},
  });
  assert.equal(pull.statusCode,200,JSON.stringify(pull.json()));
  assert.equal(pull.json().times,1);
  assert.ok(pull.json().heroes.length>=1);
  assert.equal(pull.json().tickets.senior.amount,before-1);
  assert.equal(pull.json().state.summonType,102);
  const ten=await app.inject({
   method:'POST',url:'/v1/summon/pull',
   headers:{authorization:'Bearer '+a.token},
   payload:{type:4,itemId:10403},
  });
  assert.equal(ten.statusCode,200,JSON.stringify(ten.json()));
  assert.equal(ten.json().times,10);
  assert.equal(ten.json().heroes.length,10);
  const afterHeroes=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.length;
  assert.ok(afterHeroes>=beforeHeroes+11);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/summon/oracle pulls by element and spends 14001',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  const info=await app.inject({url:'/v1/summon',headers:{authorization:'Bearer '+a.token}});
  assert.equal(info.statusCode,200);
  assert.ok(info.json().oracle.banners.some((b:{id:number})=>b.id===1));
  assert.ok(info.json().tickets.oracle.amount>=20);
  const before=info.json().tickets.oracle.amount;
  const beforeHeroes=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.length;
  const pull=await app.inject({
   method:'POST',url:'/v1/summon/oracle',
   headers:{authorization:'Bearer '+a.token},
   payload:{type:1,element:2},
  });
  assert.equal(pull.statusCode,200,JSON.stringify(pull.json()));
  assert.equal(pull.json().times,1);
  assert.equal(pull.json().element,2);
  assert.ok(pull.json().heroes.length>=1);
  assert.equal(pull.json().oracle.amount,before-1);
  const ten=await app.inject({
   method:'POST',url:'/v1/summon/oracle',
   headers:{authorization:'Bearer '+a.token},
   payload:{type:5,element:1},
  });
  assert.equal(ten.statusCode,200,JSON.stringify(ten.json()));
  assert.equal(ten.json().times,10);
  assert.equal(ten.json().heroes.length,10);
  const afterHeroes=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.length;
  assert.ok(afterHeroes>=beforeHeroes+11);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/summon/crystal spends 39 and grants by element',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  const info=await app.inject({url:'/v1/summon',headers:{authorization:'Bearer '+a.token}});
  assert.equal(info.statusCode,200);
  assert.ok(info.json().crystal?.banner?.id===2);
  assert.ok(info.json().tickets.crystal.amount>=5000);
  assert.ok(!info.json().oracle.banners.some((b:{id:number})=>b.id===2));
  const before=info.json().tickets.crystal.amount;
  const beforeHeroes=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.length;
  const pull=await app.inject({
   method:'POST',url:'/v1/summon/crystal',
   headers:{authorization:'Bearer '+a.token},
   payload:{element:1},
  });
  assert.equal(pull.statusCode,200,JSON.stringify(pull.json()));
  assert.equal(pull.json().times,1);
  assert.equal(pull.json().element,1);
  assert.equal(pull.json().cost.amount,1000);
  assert.ok(pull.json().heroes.length>=1);
  assert.equal(pull.json().crystal.amount,before-1000);
  const adv=await app.inject({
   method:'POST',url:'/v1/summon/crystal',
   headers:{authorization:'Bearer '+a.token},
   payload:{element:5},
  });
  assert.equal(adv.statusCode,200,JSON.stringify(adv.json()));
  assert.equal(adv.json().cost.amount,2000);
  assert.equal(adv.json().crystal.amount,before-3000);
  const bad=await app.inject({
   method:'POST',url:'/v1/summon/crystal',
   headers:{authorization:'Bearer '+a.token},
   payload:{element:6},
  });
  assert.equal(bad.statusCode,400);
  const afterHeroes=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes.length;
  assert.ok(afterHeroes>=beforeHeroes+2);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
