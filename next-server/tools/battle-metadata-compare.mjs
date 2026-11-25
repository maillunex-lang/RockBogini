import fs from 'node:fs';
import {simulate} from '../dist/src/battle/simulation.js';
import {battleRandom} from '../dist/src/battle/random.js';
import {reportHeroes} from '../dist/src/battle/reportHeroes.js';
const fixtures=JSON.parse(fs.readFileSync(process.argv[2]));
const norm=e=>[e.index,e.target,e.type,e.value,e.params??[]];
const keys=['Id','HeroId','StationId','Camp','HpMax','Hp','StarLevel','Level','Sid','IsBoss','SkinId','Attrs','Skills','StatDamage','StatHurt','StatCure','StatHp','StatHpMax'];
const lower=k=>k[0].toLowerCase()+k.slice(1);
let heroes=0,heroMatches=0,rounds=0,roundMatches=0,events=0,eventMatches=0;const failures=[];
for(const f of fixtures){
 const input=f.input.map(u=>({...u,buffs:[]})),r=simulate(input,battleRandom(f.seed),f.maxRounds);
 const actual=reportHeroes(input,r.units),expected=f.heroInfo.sort((a,b)=>a.Id-b.Id);
 for(let i=0;i<expected.length;i++){heroes++;const bad=keys.filter(k=>JSON.stringify(expected[i][k])!==JSON.stringify(actual[i]?.[lower(k)]));if(!bad.length)heroMatches++;else if(failures.length<10)failures.push({map:f.mapId,hero:expected[i].Id,bad,expected:expected[i],actual:actual[i]})}
 for(let i=0;i<f.pages.length;i++){const e=f.pages[i],a=r.pages[i];if(e.dataType===1){rounds++;if(JSON.stringify(e.roundSkills)===JSON.stringify(a?.roundSkills)&&e.roundBuffId===a?.roundBuffId)roundMatches++;else if(failures.length<10)failures.push({map:f.mapId,round:e.round,expected:e.roundSkills,actual:a?.roundSkills})}
 const x=e.events.map(norm),y=a?.events.slice().sort((a,b)=>a.index-b.index).map(norm)??[];events+=Math.max(x.length,y.length);for(let j=0;j<Math.max(x.length,y.length);j++)if(JSON.stringify(x[j])===JSON.stringify(y[j]))eventMatches++;
 }
}
console.log(JSON.stringify({battles:fixtures.length,heroes,heroMatches,rounds,roundMatches,events,eventMatches,failures},null,2));
