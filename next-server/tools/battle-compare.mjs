import fs from 'node:fs';
import {simulate} from '../dist/src/battle/simulation.js';
import {battleRandom} from '../dist/src/battle/random.js';
const fixtures=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const rows=fixtures.map(f=>{
 const random=battleRandom(f.seed);
 const r=simulate(f.input.map(u=>({...u,buffs:[],hurt:u.hurt??0,damage:u.damage??0,cure:u.cure??0})),random,f.maxRounds);
 const actual={resultCode:r.summary.resultCode,rounds:r.rounds,heroes:r.units.map(u=>({id:u.id,hp:u.hp,hp_max:u.hp_max,damage:u.damage,hurt:u.hurt,cure:u.cure})).sort((a,b)=>a.id-b.id)};
 return {seed:f.seed,mapId:f.mapId,lineup:f.lineup,level:f.level,boss:f.boss,expected:f.expected,actual,matchResult:actual.resultCode===f.expected.resultCode,matchRounds:actual.rounds===f.expected.rounds,matchActions:f.actions?JSON.stringify(f.actions.map(a=>[a.round,a.actor,a.skillId,a.targets]))===JSON.stringify(r.actions.map(a=>[a.round,a.actor,a.skillId,a.targets])):undefined,issues:r.issues};
});
console.log(JSON.stringify({rng:'OTP exsss; draw ordering still requires verification',rows},null,2));
