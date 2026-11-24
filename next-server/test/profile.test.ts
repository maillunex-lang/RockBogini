import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {buildApp} from '../src/app.js';
import {createGuest} from '../src/auth.js';
test('profile initialization, persistence and account isolation',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const app=await buildApp(s);
 const a=await createGuest(s),b=await createGuest(s);
 try{
 const read=(token:string)=>app.inject({url:'/v1/profile',headers:{authorization:'Bearer '+token}});
 assert.equal((await app.inject('/v1/profile')).statusCode,401);
 const r=await read(a.token);assert.equal(r.statusCode,200);
 const p=r.json();assert.equal(p.account_id,a.id);assert.equal(p.level,1);assert.equal(p.avatar,11303);assert.equal(p.power,1372);assert.equal(p.stage,100101);assert.equal(p.currencies.diamond,'0');
 assert.equal((await read(b.token)).json().account_id,b.id);
 assert.deepEqual((await read(a.token)).json(),p);
 assert.equal((await s.pg.query('SELECT amount::text FROM player_items WHERE account_id=$1 AND item_id=110010',[a.id])).rows[0].amount,'3');

 const patch=(payload:object)=>app.inject({method:'PATCH',url:'/v1/profile',headers:{authorization:'Bearer '+a.token},payload});
 assert.equal((await patch({nickname:'ab'})).statusCode,400);
 assert.equal((await patch({nickname:'Герой'})).statusCode,200);
 assert.equal((await patch({nickname:'Воин'})).statusCode,409);
 assert.equal((await patch({avatar:999999})).statusCode,400);
 await s.pg.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,3,400)',[a.id]);
 assert.equal((await patch({nickname:'Воин',avatar:11302,frame:3102})).statusCode,200);
 assert.equal((await patch({nickname:'Рыцарь'})).statusCode,200);
 const final=(await read(a.token)).json();
 assert.equal(final.nickname,'Рыцарь');assert.equal(final.currencies.diamond,'0');assert.equal(final.avatar,11302);assert.equal(final.frame,3102);
 assert.equal((await read(b.token)).json().nickname.startsWith('User'),true);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await app.close()}
});
