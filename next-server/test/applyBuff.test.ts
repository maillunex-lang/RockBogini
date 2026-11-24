import test from 'node:test';
import assert from 'node:assert/strict';
import {applyBuff,removeBuff,type EffectUnit} from '../src/battle/applyBuff.js';
import {effectiveAttr,type BuffConfig} from '../src/battle/buffs.js';
const u=(id:number,camp:number):EffectUnit=>({id,camp,attrs:{0:100,1:100,6:0,7:0},hp:50,hp_max:100,buffs:[],cd:{10:3}});
const cfg:BuffConfig={Id:1,Round:2,MaxCount:2,Tags:[],StartEffect:[{Items:[601,0,200,1,1,100,1]}],StartWorkChance:1000,StartWorkCondition:[],TriggerCondition:[],TriggerWorkCondition:[],TriggerEffect:[]};
test('stack, cap, refresh, proportional health and removal',()=>{const a=u(1,1),d=u(2,-1),o={random:()=>.5,key:()=>1,fresh:false};assert.equal(applyBuff(a,d,cfg,o).status,'applied');assert.equal(effectiveAttr(d,0),120);assert.equal(d.hp_max,110);assert.equal(d.hp,55);applyBuff(a,d,cfg,o);applyBuff(a,d,cfg,o);assert.equal(d.buffs[0].stacks,2);assert.equal(effectiveAttr(d,0),140);assert.equal(d.hp_max,120);removeBuff(d,1);assert.equal(d.hp_max,100);assert.equal(d.hp,50)});
test('control chance, temporary attributes, reset and fail closed',()=>{const a=u(1,1),d=u(2,-1),o={random:()=>.5,key:()=>1,fresh:true};assert.equal(applyBuff(a,d,{...cfg,StartWorkChance:300,Tags:[3]},o).status,'blocked');assert.equal(applyBuff(a,d,{...cfg,StartEffect:[{Items:[101,1000]}]},o).status,'unsupported');assert.equal(d.buffs.length,0);applyBuff(a,d,{...cfg,Round:0,StartEffect:[{Items:[111,0,20]},{Items:[117,10]}]},o);assert.equal(effectiveAttr(d,0),120);assert.equal(d.cd[10],0);assert.equal(d.buffs[0].temp,true)});
