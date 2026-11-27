import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAbyssBuffs,abyssBuffOptions,abyssHeal} from '../src/abyssBuffRules.js';
import {abyssBuffs} from '../src/abyssConfig.js';
import {starterHeroes} from '../src/starterHeroes.js';
import {buildUnit} from '../src/battleUnits.js';
import type {Fighter} from '../src/battle/simulation.js';
const hero=()=>buildUnit(starterHeroes[0] as unknown as Parameters<typeof buildUnit>[0],4) as unknown as Fighter;
test('12 original Abyss buff entries are accounted for, including ignored attribute ID205',()=>{
 assert.equal(Object.keys(abyssBuffs).length,12);
 const base=hero(),original={...base.attrs};
 const modified=applyAbyssBuffs(base,[1,3,5,6,8,12]);
 assert.equal(modified.attrs[4],(original[4]??0)+100);
 assert.equal(modified.attrs[10],(original[10]??0)+100);
 assert.equal(modified.attrs[5],(original[5]??0)+150);
 assert.equal(modified.attrs[14],(original[14]??0)+80);
 assert.equal(modified.attrs[12],(original[12]??0)+100);
 assert.equal(modified.attrs[205],original[205]);
 assert.deepEqual(base.attrs,original);
 assert.notEqual(modified,base);
});
test('passive skills from original Abyss buffs are added once and remain operational as passives',()=>{
 const base=hero();
 const enriched=applyAbyssBuffs(base,[2,4,7,9,10]);
 for(const sid of [100011,100021,100041,100031,100001]){
  assert.ok(enriched.passives?.includes(sid),'passive '+sid);
  assert.ok((enriched as typeof enriched&{skills:number[]}).skills.includes(sid));
  assert.equal(enriched.actives.includes(sid),false);
 }
 const repeated=applyAbyssBuffs(enriched,[2,2,4]);
 assert.equal(repeated.passives?.filter(x=>x===100011).length,1);
 assert.equal(base.passives?.includes(100011),false);
 assert.throws(()=>applyAbyssBuffs(base,[991]),/abyss_buff_unknown/);
});
test('buff offers exclude Count=1 already acquired skills and never duplicate options',()=>{
 const owned=[2,4,7,9,10];
 for(let repeat=0;repeat<9;repeat++){
  const result=abyssBuffOptions(owned,max=>repeat%max);
  assert.equal(result.length,3);
  assert.equal(new Set(result).size,3);
  assert.ok(result.every(x=>!owned.includes(x)));
 }
 assert.throws(()=>abyssBuffOptions([],()=>-1),/invalid_random_index/);
});
test('healing adds per-mille of maximum HP only to tracked living heroes, without resurrecting',()=>{
 const a=hero();
 const b={...hero(),sid:1002,hp_max:600,hp:600} as Fighter&{sid:number};
 const next=abyssHeal({'1001':100,'1002':0,'9999':200},[a,b],250);
 assert.equal(next['1001'],Math.min(a.hp_max,100+Math.floor(a.hp_max/4)));
 assert.equal(next['1002'],0);
 assert.equal(next['9999'],200);
 assert.deepEqual(abyssHeal({},[a],250),{});
 assert.throws(()=>abyssHeal({'1001':10},[a],-1),/abyss_heal_invalid/);
});
