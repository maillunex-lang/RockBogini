/** NEXT-021.3B: original SecretAreaMap/MonsterType/Props/MapPowerLevel exports. */
import {readFileSync} from 'node:fs';
import {randomInt} from 'node:crypto';
import {sourceDefenders,towerRewards} from './towerConfig.js';
import type {Fighter} from './battle/simulation.js';
type Floor={id:number;type:number;propsCount:number;grassCount:number;inletAndOutlet:number[][];monsters:number[][];rewards:number[][];map:number[][]};
type MonsterType={id:number;ratio:number;type:number;monsters:number[];rewards:number[][];randomRewards:number[][];propProbability:number[][]};
type PowerLevel={id:number;level:number;starLevel:number;power:number;type:number;powerLimit:number;attrs:number[][]};
type Props={id:number;count:number;param:number[]};
type MapBase={id:number;type:number;bg:string;heroes:number[][];strength:number[];attributeAddon:number[][];battlePower:number;isBoss:number};
export const secretFloors=JSON.parse(readFileSync(new URL('../../data/secret-levels.json',import.meta.url),'utf8')) as Record<string,Floor>;
export const secretMonsters=JSON.parse(readFileSync(new URL('../../data/secret-monsters.json',import.meta.url),'utf8')) as Record<string,MonsterType>;
const PROPS=JSON.parse(readFileSync(new URL('../../data/secret-props.json',import.meta.url),'utf8')) as Record<string,Props>;
const POWERS=JSON.parse(readFileSync(new URL('../../data/secret-power.json',import.meta.url),'utf8')) as Record<string,PowerLevel>;
const MAPS=JSON.parse(readFileSync(new URL('../../data/secret-enemies.json',import.meta.url),'utf8')) as Record<string,MapBase>;
export const GRASS_OUTCOMES=JSON.parse(readFileSync(new URL('../../data/secret-grass-outcomes.json',import.meta.url),'utf8')) as number[][];
export const RESURRECTION_PRICES=JSON.parse(readFileSync(new URL('../../data/secret-resurrection-prices.json',import.meta.url),'utf8')) as number[];

export type SecretCell=number[];
export const SECRET_PERIOD_MS=2*86400000;
export const secretFloor=(id:number)=>secretFloors[String(id)];
export const secretMonster=(id:number)=>secretMonsters[String(id)];
export const secretProp=(id:number)=>PROPS[String(id)];
export const secretMap=(id:number)=>MAPS[String(id)];
export function selectPower(power:number){
 return Object.values(POWERS).filter(p=>p.type===1&&p.powerLimit<=power).sort((a,b)=>b.powerLimit-a.powerLimit||b.id-a.id)[0]??POWERS['10001'];
}
export function randomOf<T>(arr:T[]):T{if(!arr.length)throw Error('empty_secret_source');return arr[randomInt(arr.length)];}
export function shuffle<T>(arr:T[]):T[]{
 const copy=[...arr];for(let i=copy.length-1;i>0;i--){const j=randomInt(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;
}
export function monsterCell(coords:number[],state:number,type:number,boss=false):SecretCell{
 const cfg=secretMonster(type);
 if(!cfg?.monsters.length)throw Error('secret_monster_missing');
 return [...coords,state,boss?3:2,randomOf(cfg.monsters),type,0,1000,1000,1000,1000,1000,0,0];
}
/** Cell types match PveSecret @monster=2 @boss=3 @portal=6. */
export function defeatSecretCell(cell:SecretCell):SecretCell{
 if(cell[3]!==1||![2,3].includes(cell[4]))throw Error('secret_cell_not_monster');
 return [...cell.slice(0,3),1,cell[4]===3?6:1];
}
export function survivingMonsterHp(oldHp:number[],final:{station:number;hp:number;hpMax:number}[],roster:number[][]):number[]{
 // The original keeps defeated members at 0 so repeated fights cannot resurrect them.
 return Array.from({length:5},(_,i)=>{
  const previous=oldHp[i]??1000;
  if(i>=roster.length)return 0;
  if(previous<=0)return 0;
  const unit=final.find(x=>x.station===roster[i][0]-1);
  return unit?Math.max(0,Math.min(1000,Math.floor(unit.hp/Math.max(1,unit.hpMax)*1000))):previous;
 });
}
export function neighbours(cells:SecretCell[],index:number):SecretCell[]{
 const original=cells[index];if(!original)return cells;
 const [x,y,z]=original;
 return cells.map((c,i)=>{
  if(i===index||c[3]!==0)return c;
  const distance=Math.abs(c[0]-x)+Math.abs(c[1]-y)+Math.abs(c[2]-z);
  return distance===2?[...c.slice(0,3),2,...c.slice(4)]:c;
 });
}
export function makeFloor(floorId:number,powerLevel:number):{cells:SecretCell[];view:number}{
 const cfg=secretFloor(floorId);
 if(!cfg||cfg.type!==1)throw Error('invalid_secret_floor');
 const offset=powerLevel-10000;
 const choices=cfg.inletAndOutlet.filter(r=>r[0]<=offset).sort((a,b)=>b[0]-a[0]);
 const row=choices[0]??cfg.inletAndOutlet[0];
 if(!row||row.length<3)throw Error('secret_no_portal');
 const inlet=row[1],portal=randomOf(row.slice(2));
 if(inlet<0||portal<0||inlet>=cfg.map.length||portal>=cfg.map.length||inlet===portal)throw Error('invalid_secret_portal');
 const free=shuffle(Array.from({length:cfg.map.length},(_,i)=>i).filter(i=>i!==inlet&&i!==portal));
 const monsterPool=cfg.monsters.flatMap(([type,count])=>Array.from({length:Math.max(0,count)},()=>type));
 const content=new Map<number,{kind:number;id?:number}>();
 monsterPool.forEach((type,i)=>{if(free[i]!==undefined)content.set(free[i],{kind:2,id:type})});
 let start=monsterPool.length;
 free.slice(start,start+cfg.propsCount).forEach(i=>content.set(i,{kind:4,id:randomInt(1,6)}));
 start+=cfg.propsCount;
 free.slice(start,start+cfg.grassCount).forEach(i=>content.set(i,{kind:5}));
 content.set(portal,{kind:3,id:4});
 const cells=cfg.map.map((coords,i)=>{
  const state=i===inlet?1:0,c=content.get(i);
  if(c?.kind===2)return monsterCell(coords,state,c.id!);
  if(c?.kind===3)return monsterCell(coords,state,c.id!,true);
  if(c?.kind===4)return [...coords,state,4,c.id!];
  if(c?.kind===5)return [...coords,state,5];
  return [...coords,state,1];
 });
 return {cells:neighbours(cells,inlet),view:inlet};
}
export function weighted<T>(rows:T[],weight:(row:T)=>number):T{
 const total=rows.reduce((n,r)=>n+Math.max(0,weight(r)||0),0);
 if(total<=0)return randomOf(rows);
 let choice=randomInt(total);
 for(const row of rows){choice-=Math.max(0,weight(row)||0);if(choice<0)return row;}
 return rows[rows.length-1];
}
export function monsterRewards(type:number):[number,number][]{
 const cfg=secretMonster(type);if(!cfg)throw Error('secret_monster_missing');
 const random=cfg.randomRewards.length?weighted(cfg.randomRewards,r=>r[2]??0):null;
 return towerRewards([...cfg.rewards,...(random?[random.slice(0,2)]:[])]);
}
export function secretDefenders(mapId:number,monsterType:number,levelId:number,oldHp:number[],poison=false):Fighter[]|null{
 const map=secretMap(mapId),cfg=secretMonster(monsterType);
 const power=POWERS[String(levelId)];
 if(!map||!cfg||!power)return null;
 // MapPowerLevel overrides MapBase's default level/star; original SecretAreaMonsterType
 // ratio and poison are applied after reconstructing the attributes.
 const units=sourceDefenders({...map,strength:[Math.max(1,power.starLevel),Math.max(1,power.level)],attributeAddon:[...map.attributeAddon,...power.attrs]});
 if(!units)return null;
 return units.map((u,i)=>{
  const permille=cfg.ratio;
  const attrs={...u.attrs};
  for(const key of [0,1,2,3])attrs[key]=Math.max(1,Math.floor((attrs[key]??1)*permille/1000));
  if(poison){attrs[14]=(attrs[14]??0)-300;attrs[10]=(attrs[10]??0)-300;}
  const hpMax=Math.max(attrs[1]??1,1);
  return {...u,attrs,hp_max:hpMax,hp:Math.max(0,Math.floor(hpMax*(oldHp[i]??1000)/1000))};
 }).filter(u=>u.hp>0);
}
export function startOfSecretPeriod(now=new Date()){
 // Original reset is a 2-day interval since JST day start when a run began.
 return Date.parse(new Date(now.getTime()+9*3600000).toISOString().slice(0,10)+'T00:00:00.000Z')-9*3600000;
}
