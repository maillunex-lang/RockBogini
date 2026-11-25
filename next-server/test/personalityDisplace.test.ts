import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {pullMany,summonTypeCfg} from '../src/summon.js';
import {isPersonalityItem} from '../src/personalityDisplace.js';

test('summon type 12 personality pool excludes item and keeps element',()=>{
 assert.ok(summonTypeCfg(12));
 assert.ok(isPersonalityItem(1211501));
 const model={libCount:{},libStatus:{},freeCount:0,todayCount:0,totalCount:0};
 const {items}=pullMany(12,model,15,()=>0.5,1,[1211501]);
 assert.equal(items.length,15);
 for(const [id] of items){
  assert.notEqual(id,1211501);
  assert.ok(isPersonalityItem(id));
 }
});

test('POST personality displace pay/save/cancel',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+a.token};
 const itemId=1211501;
 try{
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,2)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=2`,
   [a.id,itemId],
  );
  const info=await app.inject({url:`/v1/inventory/personality/displace?itemId=${itemId}`,headers});
  assert.equal(info.statusCode,200,info.body);
  assert.equal(info.json().eligible,true);
  assert.equal(info.json().cost.amount,25);
  assert.ok(info.json().currency.amount>=25);
  const before=info.json().currency.amount;
  const pull=await app.inject({
   method:'POST',url:'/v1/inventory/personality/displace',headers,
   payload:{itemId},
  });
  assert.equal(pull.statusCode,200,pull.body);
  assert.equal(pull.json().currency.amount,before-25);
  assert.equal(pull.json().pending.oldItemId,itemId);
  assert.notEqual(pull.json().pending.newItemId,itemId);
  const newId=pull.json().pending.newItemId as number;
  // bag still has old until save
  const bag=(await app.inject({url:'/v1/inventory',headers})).json().items as {itemId:number;amount:string}[];
  assert.equal(bag.find(i=>i.itemId===itemId)?.amount,'2');
  const save=await app.inject({
   method:'POST',url:'/v1/inventory/personality/displace/save',headers,
   payload:{itemId,newItemId:newId},
  });
  assert.equal(save.statusCode,200,save.body);
  assert.equal(save.json().swapped.to,newId);
  assert.equal(save.json().owned.old,1);
  assert.equal(save.json().owned.neu,1);
  // cancel path
  const before2=(await app.inject({url:`/v1/inventory/personality/displace?itemId=${itemId}`,headers})).json().currency.amount;
  const pull2=await app.inject({
   method:'POST',url:'/v1/inventory/personality/displace',headers,
   payload:{itemId},
  });
  assert.equal(pull2.statusCode,200,pull2.body);
  const cancel=await app.inject({method:'POST',url:'/v1/inventory/personality/displace/cancel',headers});
  assert.equal(cancel.statusCode,200,cancel.body);
  assert.equal(cancel.json().currency.amount,before2-25);
  // still own old item
  const bag2=(await app.inject({url:'/v1/inventory',headers})).json().items as {itemId:number;amount:string}[];
  assert.ok(Number(bag2.find(i=>i.itemId===itemId)?.amount??0)>=1);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
