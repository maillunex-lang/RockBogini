import test from 'node:test';
import assert from 'node:assert/strict';
import {dealDamage,heal,revive,type HealthUnit,type DefenseBuff} from '../src/battle/health.js';
const u=(id:number):HealthUnit=>({id,camp:id===1?1:-1,hp:1000,hp_max:1000,attrs:{0:100},buffs:[],cd:{},level:1,is_boss:0,hurt:0,damage:0,cure:0});
const b=(key:number,extra:Partial<DefenseBuff>):DefenseBuff=>({id:key,key,from:1,rounds:2,stacks:1,max:1,attrs:{},tags:[],...extra});
test('immunity, counted shield, ratio/flat mitigation and absorption',()=>{const a=u(1),d=u(2);d.buffs=[b(1,{immunity:true}),b(2,{cshield:1}),b(3,{ratioReduce:200,flatReduce:20}),b(4,{shield:100})];assert.equal(dealDamage(a,d,200).absorbed,200);d.buffs.shift();assert.equal(dealDamage(a,d,200).damage,0);assert.equal(dealDamage(a,d,200).damage,40);assert.equal(d.hp,960);assert.equal(a.damage,40);assert.deepEqual(d.buffs.map(x=>x.key),[3])});
test('lethal guard consumed once and hit cap',()=>{const a=u(1),d=u(2);d.buffs=[b(1,{hurtLimit:200})];assert.equal(dealDamage(a,d,2000).damage,200);d.buffs=[b(2,{guard:[100,123]})];const r=dealDamage(a,d,2000);assert.equal(r.guardSkill,123);assert.equal(d.hp,100);assert.equal(dealDamage(a,d,2000).killed,true)});
test('healing modifiers, overflow, prohibition and revival',()=>{const a=u(1),d=u(2);d.hp=900;a.attrs[12]=500;assert.deepEqual(heal(a,d,100),{healed:100,overflow:50});assert.equal(a.cure,100);d.hp=500;d.buffs=[b(1,{tags:[10]})];assert.equal(heal(a,d,100).healed,0);d.hp=0;d.buffs=[b(2,{tags:[5]})];assert.equal(revive(a,d,[300,103]),0);d.buffs=[b(3,{tags:[2]}),b(4,{})];assert.equal(revive(a,d,[300,103]),300);assert.deepEqual(d.buffs.map(x=>x.key),[3])});
test('combined counted and numeric shield persists until both exhausted',()=>{
 const a=u(1),d=u(2);d.buffs=[b(1,{cshield:1,shield:80}),b(2,{shield:30})];
 assert.equal(dealDamage(a,d,150).absorbed,150);assert.equal(d.buffs.length,2);
 assert.equal(dealDamage(a,d,100).absorbed,100);assert.equal(d.hp,1000);
 assert.equal(dealDamage(a,d,20).damage,10);assert.equal(d.buffs.length,0);
});
test('guard cannot raise current HP and reports consumed buff identity',()=>{
 const a=u(1),d=u(2);d.hp=30;d.buffs=[b(7,{guard:[100,0]})];
 const r=dealDamage(a,d,200);assert.equal(r.damage,0);assert.equal(r.guardBuffId,7);assert.equal(d.hp,30);assert.equal(d.buffs.length,0);
});
