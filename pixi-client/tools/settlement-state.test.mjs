import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const dir=dirname(fileURLToPath(import.meta.url));
const src=readFileSync(join(dir,'../src/battle/settlementState.ts'),'utf8');
const out='/tmp/rockbogini-settlement-state.mjs';
writeFileSync(out,transformSync(src,{loader:'ts',format:'esm'}).code);
const m=await import(pathToFileURL(out).href+'?t='+Date.now());

test('auto-settle only from idle when finished and ready',()=>{
 assert.equal(m.canAutoSettle('idle',true,true,true),true);
 assert.equal(m.canAutoSettle('pending',true,true,true),false);
 assert.equal(m.canAutoSettle('error',true,true,true),false);
 assert.equal(m.canAutoSettle('success',true,true,true),false);
 assert.equal(m.canAutoSettle('idle',false,true,true),false);
 assert.equal(m.canAutoSettle('idle',true,false,true),false);
 assert.equal(m.canAutoSettle('idle',true,true,false),false);
});

test('retry only from error; start blocks parallel pending',()=>{
 assert.equal(m.canRetrySettle('error'),true);
 assert.equal(m.canRetrySettle('idle'),false);
 assert.equal(m.nextPhaseOnStart('idle'),'pending');
 assert.equal(m.nextPhaseOnStart('error'),'pending');
 assert.equal(m.nextPhaseOnStart('pending'),null);
 assert.equal(m.nextPhaseOnStart('success'),null);
 assert.equal(m.nextPhaseOnResult(true),'success');
 assert.equal(m.nextPhaseOnResult(false),'error');
 assert.equal(m.resetSettlement(),'idle');
});

test('failed settle does not re-enter auto path without reset',()=>{
 // After error, canAutoSettle stays false — prevents infinite settle loops.
 assert.equal(m.canAutoSettle('error',true,true,true),false);
 assert.equal(m.canRetrySettle('error'),true);
 // Manual retry moves error -> pending once.
 assert.equal(m.nextPhaseOnStart('error'),'pending');
});
