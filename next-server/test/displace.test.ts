import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {pullOnce,pullMany,summonTypeCfg} from '../src/summon.js';

test('pullOnce displace type 401 excludes hero id and keeps element',()=>{
 const typeCfg=summonTypeCfg(401)!;
 assert.ok(typeCfg);
 const model={libCount:{},libStatus:{},freeCount:0,todayCount:0,totalCount:0};
 const {items}=pullMany(401,model,20,()=>0.5,2,[12402]);
 assert.equal(items.length,20);
 for(const [id] of items){
  assert.notEqual(id,12402);
  assert.ok([12401,12403].includes(id),String(id));
 }
 const empty=pullOnce(typeCfg,model,()=>0,2,[12401,12402,12403]);
 assert.equal(empty.item,null);
});

test('POST displace pay/save/cancel for starter ★4',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 try{
  const heroes=(await app.inject({url:'/v1/heroes',headers})).json().heroes as {Sid:number;HeroId:number;StarLevel:number;Level:number}[];
  const target=heroes.find(h=>h.Sid===1003&&h.StarLevel===4);
  assert.ok(target,JSON.stringify(heroes.map(h=>({Sid:h.Sid,HeroId:h.HeroId,star:h.StarLevel}))));
  const info=await app.inject({url:`/v1/heroes/${target!.Sid}/displace`,headers});
  assert.equal(info.statusCode,200,info.body);
  assert.equal(info.json().eligible,true);
  assert.equal(info.json().cost.amount,20);
  assert.ok(info.json().currency.amount>=20);
  const before=info.json().currency.amount;
  const oldId=target!.HeroId;
  const pull=await app.inject({method:'POST',url:`/v1/heroes/${target!.Sid}/displace`,headers});
  assert.equal(pull.statusCode,200,pull.body);
  assert.equal(pull.json().cost.amount,20);
  assert.equal(pull.json().currency.amount,before-20);
  assert.equal(pull.json().pending.oldHeroId,oldId);
  assert.notEqual(pull.json().pending.newHeroId,oldId);
  const newId=pull.json().pending.newHeroId as number;
  // hero unchanged until save
  const mid=(await app.inject({url:'/v1/heroes',headers})).json().heroes.find((h:{Sid:number})=>h.Sid===target!.Sid);
  assert.equal(mid.HeroId,oldId);
  const save=await app.inject({
   method:'POST',url:`/v1/heroes/${target!.Sid}/displace/save`,headers,
   payload:{newHeroId:newId},
  });
  assert.equal(save.statusCode,200,save.body);
  assert.equal(save.json().hero.HeroId,newId);
  assert.equal(save.json().hero.StarLevel,4);
  assert.equal(save.json().hero.Level,target!.Level);
  const after=(await app.inject({url:'/v1/heroes',headers})).json().heroes.find((h:{Sid:number})=>h.Sid===target!.Sid);
  assert.equal(after.HeroId,newId);
  // cancel path: pull again then cancel — currency not refunded
  const before2=(await app.inject({url:`/v1/heroes/${target!.Sid}/displace`,headers})).json().currency.amount;
  const pull2=await app.inject({method:'POST',url:`/v1/heroes/${target!.Sid}/displace`,headers});
  assert.equal(pull2.statusCode,200,pull2.body);
  const cancel=await app.inject({method:'POST',url:`/v1/heroes/${target!.Sid}/displace/cancel`,headers});
  assert.equal(cancel.statusCode,200,cancel.body);
  assert.equal(cancel.json().currency.amount,before2-20);
  const still=(await app.inject({url:'/v1/heroes',headers})).json().heroes.find((h:{Sid:number})=>h.Sid===target!.Sid);
  assert.equal(still.HeroId,newId);
  // 3★ ineligible
  const bad=await app.inject({method:'POST',url:'/v1/heroes/1001/displace',headers});
  assert.equal(bad.statusCode,409);
  assert.equal(bad.json().reason,'star_not_displaceable');
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
