import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
test('original formation, ownership, duplicates, persistence and power',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s),b=await createGuest(s);const app=await buildApp(s);
 try{
 const get=(token:string)=>app.inject({url:'/v1/formation',headers:{authorization:'Bearer '+token}});
 const put=(hero_ids:number[],formation_type=101)=>app.inject({method:'PUT',url:'/v1/formation',headers:{authorization:'Bearer '+a.token},payload:{formation_type,hero_ids}});
 assert.equal((await app.inject('/v1/formation')).statusCode,401);
 assert.deepEqual((await get(a.token)).json(),{formation_type:101,hero_ids:[1001,1002,0,0,0,0]});
 assert.equal((await put([1001,1001,0,0,0,0])).statusCode,400);
 assert.equal((await put([9999,0,0,0,0,0])).statusCode,400);
 assert.equal((await put([1001,0,0,0,0,0],905)).statusCode,400);
 const r=await put([1003,0,1001,0,0,0],102);assert.equal(r.statusCode,200);assert.equal(r.json().power,686);
 assert.deepEqual((await get(a.token)).json(),{formation_type:102,hero_ids:[1003,0,1001,0,0,0]});
 assert.deepEqual((await get(b.token)).json().hero_ids,[1001,1002,0,0,0,0]);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await app.close()}
});
