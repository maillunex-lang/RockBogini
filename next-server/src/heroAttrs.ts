import {modifiers} from './starterModifiers.js';
import {data,type Pair} from './heroAttrData.js';
const heroes=new Map(data.heroes.map(x=>[x.Id,x])),stars=new Map(data.stars.map(x=>[x.Id,x])),growth=new Map(data.growth.map(x=>[x.Id,x])),skills=new Map(data.skills.map(x=>[x.Id,x]));
export function calculateHero(id:number,level:number,star:number,starter=false,extra:number[][]=[],powerBonus=0){
 const h=heroes.get(id);if(!h)throw Error('unknown hero');
 const a:Record<number,number>={};
 const add=(k:number,v:number)=>{if(v!==0)a[k]=(a[k]??0)+v};
 const pairs=(p:Pair[])=>{for(const {Items:v} of p)if(v.length>=2)add(v[0],v[1])};
 pairs(h.Attrs);for(const e of extra)if(e.length>=2)add(e[0],e[1]);
 const s=stars.get(star);if(s){add(104,s.AttackAddon);add(105,s.HpAddon)}
 const g=growth.get(100*h.ElementType+10*h.Career+((starter?({2:6,3:7,4:8,5:9} as Record<number,number>)[h.CoreHero]:[0,6,7,8,9][h.CoreHero])||h.StarLevel)),d=data.stages;
 const grow=(v:number[],k:number)=>{for(let i=0;i<4;i++)a[i]=(a[i]??0)+(v[i]??0)*k};
 if(g){let c=d[0]??1;for(let i=0;i<g.LevelAttr.length;i++){if(i>=d.length||level<=d[i])break;const b=i+1<g.LevelAttr.length?Math.min(level,d[i+1]??level):level;grow(g.LevelAttr[i].Items,(b-c)/1000);c=b}
 for(let i=0;i<g.StageAttr.length;i++){if(i+1>=d.length||level<=d[i+1])break;grow(g.StageAttr[i].Items,1/1000)}}
 const unlocked:number[]=[];h.Skills.forEach(({Items:v},i)=>{const r=data.unlock[i]?.Items??[1];if(v.length&&level>=r[0]){let tier=1;while(tier<v.length&&star>=(r[tier]??99))tier++;unlocked.push(v[tier-1])}});unlocked.push(...h.ExtraSkills);
 const active=unlocked.filter(x=>skills.has(x));for(const x of active)pairs(skills.get(x)!.Attrs);
 if(starter){
 a[104]??=0;a[105]??=0;a[80]=modifiers.levels[level]??0;a[81]=modifiers.stars[star]??0;a[83]??=0;
 for(const t of modifiers.teams)if(t.Sid<=1000000&&[0,h.ElementType].includes(t.Sid%10)&&[0,h.Career].includes(Math.floor(t.Sid/10)%10))for(const [k,v] of Object.entries(t.AttrBonus))a[Number(k)]=(a[Number(k)]??0)+v;
 }
 for(let layer=0;layer<2;layer++)for(let i=0;i<4;i++){const p=100+10*layer;const v=(a[i]??0)*(1+(a[p+4+i]??0)/1000)+(a[p+i]??0);a[i]=layer===1?Math.floor(v):v}
 const power=Math.floor(Object.entries(a).reduce((sum,[k,v])=>sum+v*(data.weights[Number(k)]??0),0))+powerBonus;
 return {attrs:a,power,skills:starter?[...new Set(active.filter(x=>modifiers.effectSkills.includes(x)))].sort((a,b)=>a-b):active};
}
export function skillSlots(id:number,level:number,star:number){
 const h=heroes.get(id);if(!h)throw Error('unknown hero');
 const active=calculateHero(id,level,star).skills;
 return h.Skills.flatMap(({Items:v},i)=>v.length?[{id:active.find(x=>v.includes(x))??v[0],unlockLevel:data.unlock[i]?.Items[0]??1,unlocked:level>=(data.unlock[i]?.Items[0]??1)}]:[]);
}
