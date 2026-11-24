import test from 'node:test';
import assert from 'node:assert/strict';
import {descriptionEvent} from '../src/battle/descriptionEvents.js';
import {BuffBase} from '../src/battle/BuffBase.js';
import {applyBuff} from '../src/battle/applyBuff.js';
import {modifiedGroups} from '../src/battle/skillMods.js';
test('original description codes validate IDs and preserve report types',()=>{
 const b=Object.values(BuffBase).find(b=>b.StartEffect.some(e=>e.Items[0]===125)&&descriptionEvent(b.Id,[125]))!;
 assert.ok(b);const e=descriptionEvent(b.Id,[125])!;assert.equal(e.type,23);
 assert.deepEqual(descriptionEvent(b.Id,[128,e.descriptionId]),{type:24,descriptionId:e.descriptionId});
 assert.equal(descriptionEvent(-1,[125]),undefined);assert.equal(descriptionEvent(b.Id,[128,-1]),undefined);
});
test('persistent skill modifiers are attached and applied in original order',()=>{
 const a={id:1,camp:1,cd:{},hp:100,hp_max:100,attrs:{},buffs:[]};
 const b={Id:999,Round:2,MaxCount:1,Tags:[],StartEffect:[{Items:[373,1,8]},{Items:[374,1,9]}],StartWorkChance:1000,StartWorkCondition:[],TriggerCondition:[],TriggerWorkCondition:[],TriggerEffect:[]};
 assert.equal(applyBuff(a,a,b,{random:()=>0,key:()=>1,fresh:false}).status,'applied');
 assert.deepEqual(modifiedGroups(a.buffs,[1],[[2],[3]]),[[8,2],[3,9]]);
 assert.deepEqual(modifiedGroups(a.buffs,[2],[[2]]),[[2]]);
});
