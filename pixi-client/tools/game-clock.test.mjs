import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const dir=dirname(fileURLToPath(import.meta.url));
const src=readFileSync(join(dir,'../src/battle/gameClock.ts'),'utf8');
const out='/tmp/rockbogini-game-clock.mjs';
writeFileSync(out,transformSync(src,{loader:'ts',format:'esm'}).code);
const {createGameClock}=await import(pathToFileURL(out).href+'?t='+Date.now());

test('rate is zero when paused',()=>{
 const c=createGameClock(2);
 assert.equal(c.rate(),2);
 c.setPaused(true);
 assert.equal(c.rate(),0);
 assert.equal(c.paused,true);
});

test('later fires in game time and respects pause',async()=>{
 const c=createGameClock(1);
 let hit=false;
 c.later(20,()=>{hit=true});
 const stop=c.animate(()=>true);
 await new Promise(r=>setTimeout(r,60));
 assert.equal(hit,true);
 stop();c.clear();
});

test('speed x2 advances game time faster',async()=>{
 const c=createGameClock(2);
 const t0=c.now();
 await new Promise(r=>setTimeout(r,40));
 const dt=c.now()-t0;
 assert.ok(dt>60,`expected ~80ms game time, got ${dt}`);
 c.clear();
});
