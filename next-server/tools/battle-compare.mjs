import fs from 'node:fs';
import {simulate} from '../dist/src/battle/simulation.js';
import {battleRandom} from '../dist/src/battle/random.js';
const eventTypes=process.argv[2].includes('hitpoints')?[1,2,3,6,21]:process.argv[2].includes('health-events')?[1,2,3,4,5,6,7,21,22,27]:/buff-events|instant-events/.test(process.argv[2])?[1,2,3,4,5,6,7,21,22,25,26,27]:null;
const selected=events=>eventTypes?events.filter(e=>eventTypes.includes(e.type)):events;
const fixtures=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const rows=fixtures.map(f=>{
 const random=battleRandom(f.seed);
 const r=simulate(f.input.map(u=>({...u,buffs:[],hurt:u.hurt??0,damage:u.damage??0,cure:u.cure??0})),random,f.maxRounds,f.roundBuffs);
 const actual={resultCode:r.summary.resultCode,rounds:r.rounds,heroes:r.units.map(u=>({id:u.id,hp:u.hp,hp_max:u.hp_max,damage:u.damage,hurt:u.hurt,cure:u.cure})).sort((a,b)=>a.id-b.id)};
 return {seed:f.seed,mapId:f.mapId,lineup:f.lineup,level:f.level,boss:f.boss,expected:f.expected,actual,matchResult:actual.resultCode===f.expected.resultCode,matchRounds:actual.rounds===f.expected.rounds,matchActions:f.actions?JSON.stringify(f.actions.map(a=>[a.round,a.actor,a.skillId,a.targets]))===JSON.stringify(r.actions.map(a=>[a.round,a.actor,a.skillId,a.targets])):undefined,matchDamageEvents:f.actions?.every(a=>Array.isArray(a.events))?JSON.stringify(f.actions.map(a=>a.events.map(e=>[e.index,e.target,e.type,e.value])))===JSON.stringify(r.actions.map(a=>selected([...a.events]).sort((x,y)=>x.index-y.index).map(e=>[e.index,e.target,e.type,e.value]))):undefined,matchPages:f.pages?JSON.stringify(f.pages.map(p=>[p.dataType,p.round,p.events.map(e=>[e.index,e.target,e.type,e.value])]))===JSON.stringify(r.pages.map(p=>[p.dataType,p.round,selected([...p.events]).sort((a,b)=>a.index-b.index).map(e=>[e.index,e.target,e.type,e.value])])):undefined,matchRoundBuffs:f.roundBuffs?JSON.stringify(f.pages.filter(p=>p.dataType===1).map(p=>p.roundBuffId))===JSON.stringify(r.pages.filter(p=>p.dataType===1).map(p=>p.roundBuffId)):undefined,issues:r.issues};
});
console.log(JSON.stringify({rng:'OTP exsss; draw ordering still requires verification',rows},null,2));
