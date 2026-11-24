import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../src/app.js';
import {heroCatalog} from '../src/heroCatalog.js';
test('original hero catalog and lookup',async()=>{
 const app=await buildApp();
 try{
 const r=await app.inject('/v1/heroes/catalog');assert.equal(r.statusCode,200);
 const heroes=r.json().heroes;assert.equal(heroes.length,354);
 assert.equal(new Set(heroes.map((h:{Id:number})=>h.Id)).size,354);
 assert.deepEqual(heroes,heroCatalog);
 const h=await app.inject('/v1/heroes/catalog/4001');assert.equal(h.statusCode,200);assert.equal(h.json().NormalAttackId,710001);
 assert.equal((await app.inject('/v1/heroes/catalog/invalid')).statusCode,404);
 }finally{await app.close()}
});
