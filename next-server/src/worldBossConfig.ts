/** NEXT-021.3B: captured original WorldBoss events; no invented event schedule or drops. */
import {readFileSync} from 'node:fs';
import {sourceDefenders,towerRewards,towerWeekday} from './towerConfig.js';
import type {Fighter} from './battle/simulation.js';
type RankReward={rank1:number[];rank2:number[];rewards:number[][]};
export type BossEvent={id:number;name:string;mapId:number;kind:number;startTime:number;durationDays:number;attempts:number;openWeekdays:number[];bonus:number[];participationRewards:number[][];bossHpBands:number[][];randomSkills:number[][];rankRewards:RankReward[];tasks:{id:number;condition:number[];totalCount:number;rewards:number[][];isDaily:number}[]};
type BossMap={id:number;type:number;isBoss:number;attributeAddon:number[][];heroes:number[][];strength:number[];battlePower:number};
type MapType={id:number;maxRound:number;bossMaxRound:number;attackerFormation:number[];defenderFormation:number[]};
export const worldBossEvents=JSON.parse(readFileSync(new URL('../../data/world-boss-events.json',import.meta.url),'utf8')) as Record<string,BossEvent>;
const MAPS=JSON.parse(readFileSync(new URL('../../data/world-boss-maps.json',import.meta.url),'utf8')) as Record<string,BossMap>;
const MAP_TYPES=JSON.parse(readFileSync(new URL('../../data/world-boss-map-types.json',import.meta.url),'utf8')) as Record<string,MapType>;
export function worldBossEvent(id:number){return worldBossEvents[String(id)];}
export function worldBossOpen(e:BossEvent,now=new Date()){
 const t=now.getTime();
 return t>=e.startTime&&t<e.startTime+e.durationDays*86400000&&e.openWeekdays.includes(towerWeekday(now));
}
export function worldBossHp(event:BossEvent){
 const hp=event.bossHpBands.reduce((sum,[capacity,count])=>sum+capacity*count,0);
 return Number.isSafeInteger(hp)&&hp>0?hp:1_000_000_000_000;
}
export function worldBossDefenders(event:BossEvent):Fighter[]|null{
 const map=MAPS[String(event.mapId)];
 if(!map)return null;
 const roster=sourceDefenders(map);
 if(!roster?.length)return null;
 const bossId=map.heroes.find(r=>r[2]===1)?.[1]??(map.heroes.length===1?map.heroes[0][1]:null);
 const cap=worldBossHp(event);
 return roster.map(u=>{
  if((u as Fighter&{hero_id:number}).hero_id!==bossId)return u;
  const hp=Math.min(cap,1_000_000_000_000);
  return {...u,is_boss:1,hp,hp_max:hp,attrs:{...u.attrs,1:hp}};
 });
}
export function worldBossRounds(event:BossEvent){
 const map=MAPS[String(event.mapId)],typ=map&&MAP_TYPES[String(map.type)];
 return typ?.bossMaxRound||typ?.maxRound||15;
}
export function worldBossRewards(e:BossEvent){return towerRewards(e.participationRewards);}
export function worldBossWeekday(e:BossEvent,now=new Date()){return e.openWeekdays.includes(towerWeekday(now));}
