import test from 'node:test';
import assert from 'node:assert/strict';
import {TriggerEngine} from '../src/battle/triggers.js';
import {listener,type BuffConfig,type Buff} from '../src/battle/buffs.js';
import type {EffectUnit} from '../src/battle/applyBuff.js';
const unit=(id:number,camp:number):EffectUnit=>({id,camp,hp:100,hp_max:100,attrs:{},buffs:[],cd:{1:2}});
const buff=(key:number,from:number,events:number[],effects:number[][],rounds=2):Buff=>({id:key,key,from,rounds,stacks:1,max:1,attrs:{},tags:[],trig:listener({Id:key,Round:rounds,MaxCount:1,Tags:[],StartEffect:[],StartWorkChance:1000,StartWorkCondition:[],TriggerCondition:[{Items:events}],TriggerWorkCondition:[],TriggerEffect:effects.map(Items=>({Items}))} as BuffConfig)});
test('relative event codes, source attribution and recursion guard',()=>{const a=unit(1,1),d=unit(101,-1);d.buffs.push(buff(1,1,[301],[[118,100,1]]));let calls=0;const e=new TriggerEngine([d,a],1,{random:()=>.5,execute:(source,target)=>{assert.equal(source.id,1);assert.equal(target.id,101);calls++;e.emit({code:101,subject:1})}});e.emit({code:101,subject:1});assert.equal(calls,1)});
test('round end trigger before expiry, new buff preserved, cooldown tick',()=>{const a=unit(1,1),d=unit(101,-1);d.buffs.push(buff(1,1,[502,1],[[118,100,1]],1));const seen:number[]=[];const e=new TriggerEngine([a,d],1,{random:()=>.5,execute:(_s,t,_b,_fx,ev)=>{seen.push(ev.code);if(ev.code===502)t.buffs.push(buff(2,1,[],[],2))}});e.endRound();assert.deepEqual(seen,[502,1]);assert.deepEqual(d.buffs.map(b=>[b.key,b.rounds]),[[2,2]]);assert.equal(d.cd[1],1)});
