import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../src/app.js';
test('health explicitly reports migration state',async()=>{const app=await buildApp();try{const r=await app.inject('/health');assert.equal(r.statusCode,200);assert.equal(r.json().gameplayReady,false)}finally{await app.close()}});
test('no gameplay falsely advertised',async()=>{const app=await buildApp();try{const r=await app.inject('/v1/capabilities');assert.deepEqual(r.json().features,[]);assert.equal((await app.inject({method:'POST',url:'/v1/battle'})).statusCode,404)}finally{await app.close()}});
