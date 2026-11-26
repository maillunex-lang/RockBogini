import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {getProfile} from '../src/profile.js';

test('tasks list login progress claim and point chest',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  const list=await app.inject({url:'/v1/tasks',headers});
  assert.equal(list.statusCode,200,list.body);
  const body=list.json();
  assert.ok(body.daily.length>=5);
  assert.ok(body.weekly.length>=5);
  assert.equal(body.points.length,2);
  const login=body.daily.find((t:{id:number})=>t.id===1001);
  assert.ok(login);
  assert.equal(login.ready,true);
  assert.ok(login.progress>=1);

  const claim=await app.inject({
   method:'POST',url:'/v1/tasks/claim',headers,payload:{taskIds:[1001]},
  });
  assert.equal(claim.statusCode,200,claim.body);
  assert.deepEqual(claim.json().claimed,[1001]);
  assert.ok(claim.json().rewards.length);
  assert.equal(claim.json().points['2'].point,20);

  const again=await app.inject({
   method:'POST',url:'/v1/tasks/claim',headers,payload:{taskIds:[1001]},
  });
  assert.equal(again.statusCode,409);

  // bump points enough for first daily chest (need 25)
  await s.pg.query(
   `UPDATE player_task_meta SET points=$2::jsonb WHERE account_id=$1`,
   [a.id,JSON.stringify({'2':{point:25,drawn:[]},'3':{point:0,drawn:[]}})],
  );
  const chest=await app.inject({
   method:'POST',url:'/v1/tasks/points',headers,payload:{type:2,index:0},
  });
  assert.equal(chest.statusCode,200,chest.body);
  assert.ok(chest.json().rewards.length);
  const chestAgain=await app.inject({
   method:'POST',url:'/v1/tasks/points',headers,payload:{type:2,index:0},
  });
  assert.equal(chestAgain.statusCode,409);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('shop buy advances weekly shop task',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  await app.inject({url:'/v1/tasks',headers});
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,1,100000000),($1,3,100000)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,[a.id],
  );
  // Weekly 2001 tracks shop type 1 (condition [1046,1]).
  const shelf=await app.inject({url:'/v1/shop/1',headers});
  assert.equal(shelf.statusCode,200,shelf.body);
  const slot=shelf.json().goods.find((g:{vipLimit:number;price:number})=>g.vipLimit===0&&g.price>0)
   ??shelf.json().goods[0];
  const buy=await app.inject({
   method:'POST',url:'/v1/shop/1/buy',headers,payload:{id:slot.slot,count:1},
  });
  assert.equal(buy.statusCode,200,buy.body);
  const list=await app.inject({url:'/v1/tasks',headers});
  const weekly=list.json().weekly.find((t:{id:number})=>t.id===2001);
  assert.ok(weekly);
  assert.ok(weekly.progress>=1);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('hang-up claim advances hang-up task',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);await getProfile(s,a.id);
 const app=await buildApp(s);const headers={authorization:'Bearer '+a.token};
 try{
  await app.inject({url:'/v1/tasks',headers});
  await s.pg.query(
   `INSERT INTO campaign_idle(account_id,received_at,settled_at,points,rewards)
    SELECT id,now()-interval '70 minutes',now()-interval '70 minutes','{}'::jsonb,'{}'::jsonb FROM accounts WHERE id=$1
    ON CONFLICT(account_id) DO UPDATE SET received_at=EXCLUDED.received_at,settled_at=EXCLUDED.settled_at,rewards='{}'::jsonb,points='{}'::jsonb`,
   [a.id],
  );
  const claim=await app.inject({method:'POST',url:'/v1/campaign/idle/claim',headers});
  assert.equal(claim.statusCode,200,claim.body);
  const list=await app.inject({url:'/v1/tasks',headers});
  const hang=list.json().daily.find((t:{id:number})=>t.id===1002);
  assert.ok(hang);
  assert.ok(hang.progress>=1);
  assert.equal(hang.ready,true);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
