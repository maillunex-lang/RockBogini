import test from 'node:test';
import assert from 'node:assert/strict';
import {TriggerEngine} from '../src/battle/triggers.js';
import {listener,type BuffConfig,type Buff} from '../src/battle/buffs.js';
import type {EffectUnit} from '../src/battle/applyBuff.js';
const unit=(id:number,camp:number):EffectUnit=>({id,camp,hp:100,hp_max:100,attrs:{},buffs:[],cd:{1:2}});
const buff=(key:number,from:number,events:number[],effects:number[][],rounds=2):Buff=>({id:key,key,from,rounds,stacks:1,max:1,attrs:{},tags:[],trig:listener({Id:key,Round:rounds,MaxCount:1,Tags:[],StartEffect:[],StartWorkChance:1000,StartWorkCondition:[],TriggerCondition:[{Items:events}],TriggerWorkCondition:[],TriggerEffect:effects.map(Items=>({Items}))} as BuffConfig)});
test('relative event codes, source attribution and recursion guard',()=>{const a=unit(1,1),d=unit(101,-1);d.buffs.push(buff(1,1,[301],[[118,100,1]]));let calls=0;const e=new TriggerEngine([d,a],1,{random:()=>.5,execute:(source,target)=>{assert.equal(source.id,1);assert.equal(target.id,101);calls++;e.emit({code:101,subject:1})}});e.emit({code:101,subject:1});assert.equal(calls,1)});
test('round end trigger before expiry, new buff preserved, cooldown tick',()=>{const a=unit(1,1),d=unit(101,-1);d.buffs.push(buff(1,1,[502,1],[[118,100,1]],1));const seen:number[]=[];const e=new TriggerEngine([a,d],1,{random:()=>.5,execute:(_s,t,_b,_fx,ev)=>{seen.push(ev.code);if(ev.code===502)t.buffs.push(buff(2,1,[],[],2))}});e.endRound();assert.deepEqual(seen,[502,1]);assert.deepEqual(d.buffs.map(b=>[b.key,b.rounds]),[[2,2]]);assert.equal(d.cd[1],1)});
test('dispel respects protected tags, stack budget and before-dispel event',()=>{const a=unit(1,1),b=buff(1,1,[2],[[118,100,1]]);b.tags=[3];b.stacks=3;b.max=3;const protectedBuff=buff(2,1,[],[]);protectedBuff.tags=[1,3];a.buffs.push(b,protectedBuff);let calls=0;const e=new TriggerEngine([a],1,{random:()=>.5,execute:()=>{calls++}});e.removeMatching(a,113,2,[3]);assert.equal(b.stacks,1);assert.equal(calls,1);e.removeMatching(a,113,0,[3]);assert.deepEqual(a.buffs.map(x=>x.id),[2]);e.removeMatching(a,116,0,[2]);assert.equal(a.buffs.length,0)});
test('passive silence blocks self sourced listeners but not external buffs; extra skill uses owner',()=>{
 const a=unit(1,1),d=unit(101,-1);
 a.buffs.push({...buff(1,1,[],[]),tags:[8]},buff(2,1,[501],[[120,9]]),buff(3,101,[501],[[120,10]]));
 const seen:number[]=[];
 const e=new TriggerEngine([a,d],1,{random:()=>.5,execute:(s,t,_b,fx)=>{assert.equal(s.id,1);assert.equal(t.id,1);seen.push(fx[1])}});
 e.emit({code:501});assert.deepEqual(seen,[10]);
});
test('death listeners can queue extra skills but cannot execute ordinary damage while dead',()=>{
 const a=unit(1,1);a.hp=0;a.buffs.push(buff(1,1,[150],[[118,100,1],[120,9]]));
 const seen:number[]=[];new TriggerEngine([a],1,{random:()=>.5,execute:(_s,_t,_b,fx)=>seen.push(fx[0])}).emit({code:150,subject:1});
 assert.deepEqual(seen,[120]);
});
test('reference trigger cooldown reset and discarded attribute accumulators',()=>{
 const a=unit(1,1);a.cd={1:3,2:4};a.buffs.push(buff(1,1,[501],[[117,1],[111,0,50],[601,0,100,0]]));
 const seen:number[]=[];const e=new TriggerEngine([a],1,{random:()=>.5,execute:(_s,_t,_b,fx)=>seen.push(fx[0])});
 e.emit({code:501});assert.deepEqual(a.cd,{1:0,2:4});assert.deepEqual(a.attrs,{});assert.deepEqual(seen,[]);
 a.buffs.push(buff(2,1,[502],[[117]]));e.emit({code:502});assert.deepEqual(a.cd,{1:0,2:0});
});
