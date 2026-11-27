/** NEXT-021.13: source ActivityConfig_ElementTest, Maps, MapBase, HeroBase. */
import {readFileSync} from 'node:fs';
import {sourceDefenders,towerRewards} from './towerConfig.js';
import {heroCatalog} from './heroCatalog.js';
import type {Fighter} from './battle/simulation.js';
type Stage={id:number;mapId:number;recommendPower:number;quickPower:number;heroId:number;rewards:number[][]};
type MapRow={id:number;type:number;bg:string;heroes:number[][];strength:number[];attributeAddon:number[][];battlePower:number;isBoss:number};
export type ElementEvent={id:number;name:string;common:{isZoneOpen:number;startTime:number;durationDays:number;requireOpenDays:number};custom:{element:number;powerWeaken:number;attrWeaken:number};stages:Stage[]};
export const elementEvents=JSON.parse(readFileSync(new URL('../../data/element-test-events.json',import.meta.url),'utf8')) as Record<string,ElementEvent>;
const MAPS=JSON.parse(readFileSync(new URL('../../data/element-test-maps.json',import.meta.url),'utf8')) as Record<string,MapRow>;
const SOURCE_CAPTURED_AT=1793107842155; // world.json capturedAt
export function elementEvent(id:number){return elementEvents[String(id)]??null}
export function elementStage(event:ElementEvent,index:number){return Number.isSafeInteger(index)&&index>0?event.stages[index-1]??null:null}
export function elementMap(stage:Stage){return MAPS[String(stage.mapId)]??null}
export function elementDefenders(stage:Stage){const map=elementMap(stage);return map?sourceDefenders(map):null}
export function elementWindow(event:ElementEvent,now:Date){
 const c=event.common,day=86400000;
 // Original Racon.Templates.shift_times shifts source timestamps by completed days from capturedAt.
 const delta=Math.trunc((now.getTime()-SOURCE_CAPTURED_AT)/day)*day;
 const start=c.startTime+delta+(Math.max(1,c.requireOpenDays)-1)*(c.isZoneOpen>0?day:0);
 const end=c.durationDays>0?start+c.durationDays*day:Infinity;
 return {open:now.getTime()>=start&&now.getTime()<end,startTime:new Date(start).toISOString(),
  endTime:Number.isFinite(end)?new Date(end).toISOString():null,
  reason:now.getTime()<start?'not_started':now.getTime()>=end?'event_closed':null};
}
export function elementSid(event:ElementEvent){return 1000+event.custom.element}
export function elementRewards(event:ElementEvent,from:number,to:number){
 if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to<=from||to>event.stages.length)throw Error('invalid_element_range');
 return towerRewards(event.stages.slice(from,to).flatMap(x=>x.rewards));
}
export function elementWeaken(units:Fighter[],event:ElementEvent):Fighter[]{
 const weaken=event.custom.attrWeaken;
 return units.map(u=>{
  if(u.element===event.custom.element)return {...u};
  const attrs={...u.attrs};
  for(const key of [0,1,2])attrs[key]=Math.max(1,Math.floor((attrs[key]??1)*(1000-weaken)/1000));
  const hp=Math.max(1,attrs[1]??u.hp_max);
  return {...u,attrs,hp,hp_max:hp};
 });
}
export function elementQuickPower(heroes:{heroId:number;power:number}[],event:ElementEvent){
 const matching=new Map(heroCatalog.map(h=>[h.Id,h.ElementType]));
 return heroes.reduce((total,h)=>total+Math.floor(h.power*(matching.get(h.heroId)===event.custom.element?1000:1000-event.custom.powerWeaken)/1000),0);
}
export function elementQuickEnd(event:ElementEvent,current:number,power:number){
 let end=current;
 for(const stage of event.stages.slice(current)){
  if(power<stage.quickPower)break;
  end=stage.id;
 }
 return end;
}
