import fs from 'node:fs';
import {simulate} from '../dist/src/battle/simulation.js';
const fixtures=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const rows=fixtures.map(f=>{
 let seed=f.seed>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const r=simulate(f.input.map(u=>({...u,buffs:[],hurt:u.hurt??0,damage:u.damage??0,cure:u.cure??0})),random,f.maxRounds);
 const actual={resultCode:r.summary.resultCode,rounds:r.rounds,heroes:r.units.map(u=>({id:u.id,hp:u.hp,hp_max:u.hp_max,damage:u.damage,hurt:u.hurt,cure:u.cure})).sort((a,b)=>a.id-b.id)};
 return {seed:f.seed,expected:f.expected,actual,matchResult:actual.resultCode===f.expected.resultCode,matchRounds:actual.rounds===f.expected.rounds,issues:r.issues};
});
console.log(JSON.stringify({rng:'Different algorithms: reference exsss vs port LCG; not exact differential parity',rows},null,2));
