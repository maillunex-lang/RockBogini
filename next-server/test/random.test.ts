import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleRandom} from '../src/battle/random.js';
test('OTP 27 exsss matches 3200 exported values exactly',()=>{
 for(const line of readFileSync('test/fixtures/rng-vectors.csv','utf8').trim().split('\n')){const [seed,...xs]=line.split(',').map(Number);const r=battleRandom(seed);for(const x of xs)assert.equal(r(),x)}
});
