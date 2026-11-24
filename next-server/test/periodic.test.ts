import test from 'node:test';
import assert from 'node:assert/strict';
import {specialDamage,executePeriodic,applyUnmitigated,type PeriodicUnit} from '../src/battle/periodic.js';
import {TriggerEngine} from '../src/battle/triggers.js';
import {listener,type Buff} from '../src/battle/buffs.js';
const u=(id:number,camp:number):PeriodicUnit=>({id,camp,level:1,is_boss:0,hp:1000,hp_max:1000,attrs:{0:100},buffs:[],cd:{},hurt:0,damage:0});
test('special damage bases, resistance, cap and boss limit',()=>{const a=u(1,1),d=u(101,-1);assert.equal(specialDamage(a,d,100,103,0,[]),100);d.attrs[29]=500;assert.equal(specialDamage(a,d,100,103,0,[]),50);d.attrs[29]=0;assert.equal(specialDamage(a,d,100,103,200,[]),20);d.hp_max=1000000;d.is_boss=1;assert.equal(specialDamage(a,d,100,103,0,[]),200)});
test('round end executes actual periodic damage, credits source and expires',()=>{const a=u(1,1),d=u(101,-1);const b:Buff={id:1,key:1,from:1,rounds:2,stacks:1,max:1,attrs:{},tags:[],trig:listener({Id:1,Round:2,MaxCount:1,Tags:[],StartEffect:[],StartWorkChance:1000,StartWorkCondition:[],TriggerCondition:[{Items:[502]}],TriggerWorkCondition:[],TriggerEffect:[{Items:[118,100,103]}]})};d.buffs.push(b);const e=new TriggerEngine([a,d],1,{random:()=>.5,execute:(s,t,b,fx)=>{executePeriodic(s as PeriodicUnit,t as PeriodicUnit,b,fx,applyUnmitigated)}});e.endRound();assert.equal(d.hp,900);e.round++;e.endRound();assert.equal(d.hp,800);assert.equal(a.damage,200);assert.equal(d.hurt,200);assert.equal(d.buffs.length,0);e.round++;e.endRound();assert.equal(d.hp,800)});
