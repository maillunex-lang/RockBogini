import {randomInt} from 'node:crypto';
import {readFileSync} from 'node:fs';
const load=<T>(name:string):T=>{for(const base of ['../data/','../../data/']){try{return JSON.parse(readFileSync(new URL(base+name,import.meta.url),'utf8')) as T}catch{}}throw Error('Missing box table '+name)};
const types=load<Record<string,{libs:number[][]}>>('box-CardSummonType.json');
const libs=load<Record<string,{startChance:number;randomLib:number[][]}>>('box-CardRandomLib.json');
export type BoxRng=(max:number)=>number;
const pick=(rows:number[][],rng:BoxRng,show=false)=>{
 const entries=rows.filter(r=>r.length>0).map(r=>({reward:[r[0],show&&r.length<3?1:r[1]??1],weight:show&&r.length===2?r[1]:r[2]??1}));
 if(!entries.length)return undefined;
 const total=entries.reduce((n,r)=>n+Math.max(0,r.weight),0);
 if(total<=0)return entries[rng(entries.length)].reward;
 let roll=rng(total);
 for(const e of entries){const w=Math.max(0,e.weight);if(roll<w)return e.reward;roll-=w}
};
export function rollBox(type:number,show:number[][],rng:BoxRng=randomInt){
 const slots=types[String(type)]?.libs.filter(r=>r.length>1).map(r=>r.slice(1));
 if(!slots?.length)return pick(show,rng,true);
 for(let i=0;i<slots.length;i++){
  const ids=slots[i],lib=libs[String(ids[rng(ids.length)])];
  if(lib&&(i===slots.length-1||rng(1000000)<lib.startChance)){
   const reward=pick(lib.randomLib,rng);if(reward)return reward;
  }
 }
}
