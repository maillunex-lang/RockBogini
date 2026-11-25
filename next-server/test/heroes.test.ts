import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {starterHeroes} from '../src/starterHeroes.js';

const strip=(h:any)=>{const {base,skillSlots,maxLevel,maxStar,starPreview,talent,jobs,luck,equipExtra,...rest}=h;return rest};

test('starter collection is atomic, persistent and isolated',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s),b=await createGuest(s);const app=await buildApp(s);
 try{
  const get=(token:string)=>app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+token}});
  assert.equal((await app.inject('/v1/heroes')).statusCode,401);
  const rs=await Promise.all([get(a.token),get(a.token)]);
  for(const r of rs){
   assert.equal(r.statusCode,200);
   assert.deepEqual(r.json().heroes.map(strip),starterHeroes);
   assert.equal(r.json().heroes[0].skillSlots[1].unlockLevel,31);
   assert.equal(r.json().heroes[0].skillSlots[1].unlocked,false);
   assert.equal(r.json().heroes[0].maxLevel,60);
   assert.equal(r.json().heroes[0].maxStar,3);
  }
  await s.pg.query('UPDATE player_heroes SET locked=true WHERE account_id=$1 AND sid=1001',[a.id]);
  assert.equal((await get(a.token)).json().heroes[0].Locked,true);
  assert.deepEqual((await get(b.token)).json().heroes.map(strip),starterHeroes);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await app.close()}
});

test('POST /v1/heroes/:sid/level spends HeroLevel materials',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,22,100),($1,1,200)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const r=await app.inject({method:'POST',url:'/v1/heroes/1001/level',headers:{authorization:'Bearer '+a.token},payload:{newLevel:2}});
  assert.equal(r.statusCode,200);
  const body=r.json();
  assert.equal(body.hero.Level,2);
  assert.ok(body.cost.some((c:[number,number])=>c[0]===22&&c[1]===12));
  const cap=await app.inject({method:'POST',url:'/v1/heroes/1001/level',headers:{authorization:'Bearer '+a.token},payload:{newLevel:999}});
  assert.equal(cap.statusCode,409);
  assert.equal(cap.json().error,'level_cap');
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/heroes/:sid/star respects MaxStarLevel and free ★ path',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  // 11303 maxStar=3 → cannot go to ★4
  const capped=await app.inject({method:'POST',url:'/v1/heroes/1001/star',headers:{authorization:'Bearer '+a.token},payload:{}});
  assert.equal(capped.statusCode,409);
  assert.equal(capped.json().error,'star_cap');
  // Insert 12402 at ★3 (maxStar 5) for free ★4
  const state={Sid:3001,HeroId:12402,Level:1,StarLevel:3,Power:0,Locked:false,Attrs:{},Skills:[]};
  await s.pg.query(
   'INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,3001,12402,1,3,0,false,$2)',
   [a.id,JSON.stringify(state)],
  );
  const r=await app.inject({method:'POST',url:'/v1/heroes/3001/star',headers:{authorization:'Bearer '+a.token},payload:{}});
  assert.equal(r.statusCode,200);
  assert.equal(r.json().hero.StarLevel,4);
  assert.deepEqual(r.json().cost,[]);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/heroes/:sid/star consumes fodder heroes for ★5',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  // Target: starter 1003 is 12402 ★4 (element 2, maxStar 5)
  // Need: 2× same ★4, 5× elem ★4, 4× elem ★3  → insert fodder outside formation
  const inserts:[number,number,number][]=[];
  let sid=4001;
  for(let i=0;i<2;i++)inserts.push([sid++,12402,4]);
  for(let i=0;i<5;i++)inserts.push([sid++,12301,4]);
  for(let i=0;i<4;i++)inserts.push([sid++,12301,3]);
  for(const [fsid,hid,star] of inserts){
   const st={Sid:fsid,HeroId:hid,Level:1,StarLevel:star,Power:0,Locked:false,Attrs:{},Skills:[]};
   await s.pg.query(
    'INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,$2,$3,1,$4,0,false,$5)',
    [a.id,fsid,hid,star,JSON.stringify(st)],
   );
  }
  const missing=await app.inject({method:'POST',url:'/v1/heroes/1003/star',headers:{authorization:'Bearer '+a.token},payload:{}});
  // without enough? we inserted enough — auto should work
  assert.equal(missing.statusCode,200,JSON.stringify(missing.json()));
  assert.equal(missing.json().hero.StarLevel,5);
  assert.equal(missing.json().fodder.length,11);
  const left=(await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}})).json().heroes;
  assert.ok(!left.some((h:{Sid:number})=>h.Sid>=4001&&h.Sid<4012));
  assert.ok(left.some((h:{Sid:number;StarLevel:number})=>h.Sid===1003&&h.StarLevel===5));
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/heroes/:sid/talent upgrades PVE talent with common items',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  // hero 4001 maxStar 12 at ★10 unlocks talents
  const st={Sid:5001,HeroId:4001,Level:1,StarLevel:10,Power:0,Locked:false,PVETalentLevel:0,PVPTalentLevel:0,Attrs:{},Skills:[]};
  await s.pg.query(
   'INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,5001,4001,1,10,0,false,$2)',
   [a.id,JSON.stringify(st)],
  );
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,3,500),($1,75,500)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const locked=await app.inject({method:'POST',url:'/v1/heroes/1001/talent',headers:{authorization:'Bearer '+a.token},payload:{type:1}});
  assert.equal(locked.statusCode,409);
  assert.equal(locked.json().error,'talent_locked');
  const r=await app.inject({method:'POST',url:'/v1/heroes/5001/talent',headers:{authorization:'Bearer '+a.token},payload:{type:1,count:1}});
  assert.equal(r.statusCode,200,JSON.stringify(r.json()));
  assert.equal(r.json().hero.PVETalentLevel,1);
  assert.ok(r.json().cost.some((c:[number,number])=>c[0]===3&&c[1]===50));
  const reset=await app.inject({method:'POST',url:'/v1/heroes/5001/talent/reset',headers:{authorization:'Bearer '+a.token},payload:{type:1}});
  assert.equal(reset.statusCode,200);
  assert.equal(reset.json().hero.PVETalentLevel,0);
  assert.ok(reset.json().refund.some((c:[number,number])=>c[0]===3&&c[1]===50));
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/heroes/:sid/job unlocks root at ★12 and resets branches',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  // 11501 job tree roots need ★12 + item 5500001
  const low={Sid:6000,HeroId:11501,Level:1,StarLevel:11,Power:0,Locked:false,Job:0,JobMap:{},Attrs:{},Skills:[]};
  await s.pg.query(
   'INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,6000,11501,1,11,0,false,$2)',
   [a.id,JSON.stringify(low)],
  );
  const st={Sid:6001,HeroId:11501,Level:1,StarLevel:12,Power:0,Locked:false,Job:0,JobMap:{},Attrs:{},Skills:[]};
  await s.pg.query(
   'INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,6001,11501,1,12,0,false,$2)',
   [a.id,JSON.stringify(st)],
  );
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,5500001,5),($1,5500101,5)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const locked=await app.inject({method:'POST',url:'/v1/heroes/6000/job',headers:{authorization:'Bearer '+a.token},payload:{index:0}});
  assert.equal(locked.statusCode,409);
  assert.equal(locked.json().error,'job_locked');
  const root=await app.inject({method:'POST',url:'/v1/heroes/6001/job',headers:{authorization:'Bearer '+a.token},payload:{index:0}});
  assert.equal(root.statusCode,200,JSON.stringify(root.json()));
  assert.equal(root.json().unlocked,true);
  assert.equal(root.json().hero.Job,500001);
  assert.equal(root.json().hero.JobMap['500001'],1);
  const branch=await app.inject({method:'POST',url:'/v1/heroes/6001/job',headers:{authorization:'Bearer '+a.token},payload:{index:1}});
  assert.equal(branch.statusCode,200,JSON.stringify(branch.json()));
  assert.equal(branch.json().hero.Job,500101);
  const reset=await app.inject({method:'POST',url:'/v1/heroes/6001/job/reset',headers:{authorization:'Bearer '+a.token},payload:{}});
  assert.equal(reset.statusCode,200);
  assert.equal(reset.json().hero.JobMap['500001'],1);
  assert.equal(reset.json().hero.JobMap['500101'],undefined);
  assert.ok(reset.json().refund.some((c:[number,number])=>c[0]===5500101&&c[1]===1));
  const switchRoot=await app.inject({method:'POST',url:'/v1/heroes/6001/job',headers:{authorization:'Bearer '+a.token},payload:{index:0}});
  assert.equal(switchRoot.statusCode,200);
  assert.equal(switchRoot.json().switched,true);
  assert.equal(switchRoot.json().hero.Job,500001);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});

test('POST /v1/heroes/:sid/luck studies and clears slot1 at ★11',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);const app=await buildApp(s);
 try{
  await app.inject({url:'/v1/heroes',headers:{authorization:'Bearer '+a.token}});
  const low={Sid:7000,HeroId:11501,Level:1,StarLevel:10,Power:0,Locked:false,LuckSkill1:0,LuckSkill2:0,Attrs:{},Skills:[]};
  await s.pg.query(
   'INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,7000,11501,1,10,0,false,$2)',
   [a.id,JSON.stringify(low)],
  );
  const st={Sid:7001,HeroId:11501,Level:1,StarLevel:11,Power:0,Locked:false,LuckSkill1:0,LuckSkill2:0,Attrs:{},Skills:[]};
  await s.pg.query(
   'INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,7001,11501,1,11,0,false,$2)',
   [a.id,JSON.stringify(st)],
  );
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,3,50000)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=EXCLUDED.amount`,
   [a.id],
  );
  const locked=await app.inject({method:'POST',url:'/v1/heroes/7000/luck',headers:{authorization:'Bearer '+a.token},payload:{index:1,type:1,param:101}});
  assert.equal(locked.statusCode,409);
  assert.equal(locked.json().error,'luck_locked');
  const study=await app.inject({method:'POST',url:'/v1/heroes/7001/luck',headers:{authorization:'Bearer '+a.token},payload:{index:1,type:1,param:101}});
  assert.equal(study.statusCode,200,JSON.stringify(study.json()));
  assert.equal(study.json().hero.LuckSkill1,101);
  assert.ok(study.json().cost.some((c:[number,number])=>c[0]===3&&c[1]===2000));
  const up=await app.inject({method:'POST',url:'/v1/heroes/7001/luck',headers:{authorization:'Bearer '+a.token},payload:{index:1,type:1,param:201}});
  assert.equal(up.statusCode,200,JSON.stringify(up.json()));
  assert.equal(up.json().hero.LuckSkill1,201);
  assert.ok(up.json().cost.some((c:[number,number])=>c[0]===3&&c[1]===5000));
  const clear=await app.inject({method:'POST',url:'/v1/heroes/7001/luck/clear',headers:{authorization:'Bearer '+a.token},payload:{index:1,type:1}});
  assert.equal(clear.statusCode,200);
  assert.equal(clear.json().hero.LuckSkill1,0);
  assert.ok(clear.json().refund.some((c:[number,number])=>c[0]===3&&c[1]===3500));
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await app.close()}
});
