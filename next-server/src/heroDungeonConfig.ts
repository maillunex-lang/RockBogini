/** NEXT-021.12: HeroDungeon original activity snapshot, MapBase and documented handlers. */
import {readFileSync} from 'node:fs';
import {sourceDefenders,towerRewards} from './towerConfig.js';
import type {Fighter} from './battle/simulation.js';
type Stage={id:number;mapId:number;recommendPower:number;rewards:number[][]};
type MapRow={id:number;type:number;bg:string;heroes:number[][];strength:number[];attributeAddon:number[][];battlePower:number;isBoss:number};
export type HeroDungeonEvent={id:number;name:string;common:{isZoneOpen:number;startTime:number;durationDays:number;requireOpenDays:number};custom:{heroId:number;count:number;attrWeaken:number;powerWeaken:number;bonus:number[][]};stages:Stage[]};
export const heroDungeonEvent=JSON.parse(readFileSync(new URL('../../data/hero-dungeon-event.json',import.meta.url),'utf8')) as HeroDungeonEvent;
const MAPS=JSON.parse(readFileSync(new URL('../../data/hero-dungeon-maps.json',import.meta.url),'utf8')) as Record<string,MapRow>;
const ZONE=JSON.parse(readFileSync(new URL('../../data/hero-dungeon-zone.json',import.meta.url),'utf8')) as {
 zoneId:number;originalCapturedAt:number;originalZoneOpenTime:number};
export function capturedHeroDungeonWindow(now:Date){
 // Preserve original zone age, shifting by whole days exactly as the reference Templates.shift_times.
 const delta=Math.trunc((now.getTime()-ZONE.originalCapturedAt)/86400000)*86400000;
 return heroDungeonWindow(now,new Date(ZONE.originalZoneOpenTime+delta));
}
export const HERO_DUNGEON_FORMATION_SID=1006;
export function heroDungeonStage(index:number){return Number.isSafeInteger(index)&&index>0?heroDungeonEvent.stages[index-1]??null:null}
export function heroDungeonMap(stage:Stage){return MAPS[String(stage.mapId)]??null}
export function heroDungeonDefenders(stage:Stage){const map=heroDungeonMap(stage);return map?sourceDefenders(map):null}
export function heroDungeonWindow(now:Date,zoneOpen?:Date){
 const c=heroDungeonEvent.common,open=c.isZoneOpen>0?zoneOpen?.getTime():c.startTime;
 if(open===undefined||!Number.isFinite(open))return {open:false,startTime:null,endTime:null,reason:'zone_open_time_unavailable'};
 const start=open+(Math.max(1,c.requireOpenDays)-1)*86400000;
 const end=c.durationDays>0?start+c.durationDays*86400000:Infinity;
 return {open:now.getTime()>=start&&now.getTime()<end,startTime:new Date(start).toISOString(),
  endTime:Number.isFinite(end)?new Date(end).toISOString():null,reason:now.getTime()<start?'not_started':now.getTime()>=end?'event_closed':null};
}
export function heroDungeonBonus(star:number){
 const cfg=heroDungeonEvent.custom;
 if(star>=5&&cfg.bonus.length){
  const [drop,attr]=cfg.bonus[Math.min(star-5,cfg.bonus.length-1)];
  return {drop,attribute:attr};
 }
 return {drop:0,attribute:-cfg.attrWeaken};
}
export function heroDungeonRewards(index:number,drop=0):[number,number][]{
 const stage=heroDungeonStage(index);
 if(!stage||!Number.isSafeInteger(drop)||drop<0||drop>1000)throw Error('invalid_dungeon_rewards');
 return towerRewards(stage.rewards.map(([item,count])=>[item,count+Math.floor(count*drop/1000)]));
}
export function heroDungeonRank(cleared:number,rounds:number){
 if(cleared===0)return 0;
 return cleared*100+(100-Math.min(99,Math.max(1,rounds)));
}
export function heroDungeonUnitsBonus(units:Fighter[],attribute:number):Fighter[]{
 return units.map(u=>{
  const attrs={...u.attrs};
  for(const key of [0,1,2])attrs[key]=Math.max(1,Math.floor((attrs[key]??1)*(1000+attribute)/1000));
  const hp=Math.max(1,attrs[1]??u.hp_max);
  return {...u,attrs,hp,hp_max:hp};
 });
}
