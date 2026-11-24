import test from 'node:test';
import assert from 'node:assert/strict';
import {isCapabilities} from '../src/shared/contracts.js';
import {buildApp} from '../src/app.js';
test('shared protocol accepts actual API and rejects invalid versions and fields',async()=>{const app=await buildApp();try{const x=(await app.inject('/v1/capabilities')).json();assert.ok(isCapabilities(x));assert.equal(isCapabilities({...x,protocol:2}),false);assert.equal(isCapabilities({...x,features:[42]}),false);assert.equal(isCapabilities(null),false)}finally{await app.close()}});
