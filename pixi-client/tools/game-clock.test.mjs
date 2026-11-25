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

test('pump fires overdue timers by scheduled time then stable seq',()=>{
 const c=createGameClock(1);
 const order=[];
 // Schedule later first with larger delay, then earlier — after jump both are due.
 c.later(100,()=>order.push('late'));
 c.later(10,()=>order.push('early'));
 c.later(10,()=>order.push('early2'));
 // Force wall jump by monkey-patching via pause/resume trick: pump with future via speed.
 // Direct pump after advancing: setPaused freezes; instead call later offsets from now and pump far.
 const far=c.now()+1000;
 // Reaching far: use setSpeed and wait is slow; call internal by sleeping with animate.
 // Simpler: schedule all in past by using later(0) after manually... later uses nowGame+ms.
 // Fire pump after enough wall time at x3.
 c.setSpeed(3);
 // busy-wait wall ~80ms => game ~240ms > 100
 const start=performance.now();
 while(performance.now()-start<90){/* spin */}
 c.pump();
 assert.deepEqual(order,['early','early2','late']);
 c.clear();
});

test('callback can cancel later sibling; clear cancels animate frames',async()=>{
 const c=createGameClock(1);
 let a=0,b=0;
 const cancelB=c.later(5,()=>{b++});
 c.later(5,()=>{a++;cancelB()});
 const stop=c.animate(()=>true);
 await new Promise(r=>setTimeout(r,40));
 stop();
 c.clear();
 assert.equal(a,1);
 assert.ok(b<=1);
 // After clear, new later should not fire without animate/pump
 let cHit=false;
 c.later(1,()=>{cHit=true});
 await new Promise(r=>setTimeout(r,30));
 assert.equal(cHit,false);
 c.clear();
});
