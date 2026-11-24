import test from 'node:test';
import assert from 'node:assert/strict';
import {applyBuff} from '../src/battle/applyBuff.js';
import {dealDamage,type HealthUnit} from '../src/battle/health.js';
import {baseValue} from '../src/battle/periodic.js';
import type {BuffConfig} from '../src/battle/buffs.js';
const u=(id:number):HealthUnit=>({id,camp:1,hp:1000,hp_max:1000,attrs:{0:100},buffs:[],cd:{},level:1,is_boss:0,hurt:0,damage:0,cure:0});
test('configured shield attaches, stacks and absorbs actual damage',()=>{const a=u(1),d=u(2);const cfg:BuffConfig={Id:1,Round:2,MaxCount:2,Tags:[],StartEffect:[{Items:[501,200,103]},{Items:[502,1]}],StartWorkChance:1000,StartWorkCondition:[],TriggerCondition:[],TriggerWorkCondition:[],TriggerEffect:[]};const o={random:()=>.5,key:()=>1,fresh:false,baseValue:(p:number)=>baseValue(a,d,p)};applyBuff(a,d,cfg,o);applyBuff(a,d,cfg,o);assert.equal(dealDamage(a,d,500).damage,0);assert.equal(dealDamage(a,d,500).damage,0);assert.equal(dealDamage(a,d,500).damage,100);assert.equal(d.hp,900)});
