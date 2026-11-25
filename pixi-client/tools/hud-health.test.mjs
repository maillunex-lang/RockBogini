import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {transformSync} from 'esbuild';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';

const dir=dirname(fileURLToPath(import.meta.url));
const src=readFileSync(join(dir,'../src/battle/healthEvents.ts'),'utf8')
  .replace(/import type \{[^}]+\} from '\.\/reportClient';\n/,'');
const out='/tmp/rockbogini-health-events.mjs';
writeFileSync(out,transformSync(src,{loader:'ts',format:'esm'}).code);
const {applyHealth}=await import(pathToFileURL(out).href+'?t='+Date.now());
const base=()=>({id:1,hp:100,hpMax:100,isDead:false,buffs:[]});

test('damage and share damage reduce HP',()=>{
 assert.equal(applyHealth(base(),{index:1,target:1,type:1,value:30}).hp,70);
 assert.equal(applyHealth(base(),{index:1,target:1,type:8,value:12}).hp,88);
 assert.equal(applyHealth(base(),{index:1,target:1,type:3,value:40}).hp,60);
 assert.equal(applyHealth(base(),{index:1,target:1,type:21,value:5}).hp,95);
});

test('shield and dodge do not change HP',()=>{
 assert.equal(applyHealth(base(),{index:1,target:1,type:4,value:50}).hp,100);
 assert.equal(applyHealth(base(),{index:1,target:1,type:28,value:50}).hp,100);
 assert.equal(applyHealth(base(),{index:1,target:1,type:6,value:0}).hp,100);
});

test('heal and revive/death semantics',()=>{
 assert.equal(applyHealth({...base(),hp:40},{index:1,target:1,type:5,value:25}).hp,65);
 const dead=applyHealth(base(),{index:1,target:1,type:27,value:0});
 assert.equal(dead.hp,0);assert.equal(dead.isDead,true);
 const revived=applyHealth(dead,{index:1,target:1,type:7,value:0});
 assert.equal(revived.isDead,false);assert.equal(revived.hp,0);
 assert.equal(applyHealth(revived,{index:1,target:1,type:5,value:40}).hp,40);
});

test('buff add and remove sync',()=>{
 const a=applyHealth(base(),{index:1,target:1,type:25,value:901});
 assert.deepEqual(a.buffs,[{id:901,count:1}]);
 const b=applyHealth(a,{index:1,target:1,type:25,value:901});
 assert.deepEqual(b.buffs,[{id:901,count:2}]);
 const c=applyHealth(b,{index:1,target:1,type:26,value:901});
 assert.deepEqual(c.buffs,[{id:901,count:1}]);
 const d=applyHealth(c,{index:1,target:1,type:26,value:901});
 assert.deepEqual(d.buffs,[]);
});

void createRequire;
void readFileSync;
