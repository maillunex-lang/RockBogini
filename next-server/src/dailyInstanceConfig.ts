/** NEXT-021.2: 5 original DailyInstance types, 55 MapDailyInstance and MapBase rows. */
import {readFileSync} from 'node:fs';
import {sourceDefenders,towerRewards} from './towerConfig.js';
type InstanceType={id:number;maps:number[];battlePrice:number};
type InstanceStage={id:number;requirePower:number;rewards:number[][]};
type MapBase={id:number;type:number;bg:string;heroes:number[][];strength:number[];attributeAddon:number[][];battlePower:number;isBoss:number};
export const dailyInstanceTypes=JSON.parse(readFileSync(new URL('../../data/daily-instance-types.json',import.meta.url),'utf8')) as Record<string,InstanceType>;
const STAGES=JSON.parse(readFileSync(new URL('../../data/daily-instance-stages.json',import.meta.url),'utf8')) as Record<string,InstanceStage>;
const MAPS=JSON.parse(readFileSync(new URL('../../data/daily-instance-maps.json',import.meta.url),'utf8')) as Record<string,MapBase>;
const SETTINGS=JSON.parse(readFileSync(new URL('../../data/daily-instance-settings.json',import.meta.url),'utf8')) as Record<string,number>;
export const FREE_DAILY=SETTINGS.DailyInstanceFreeBattleCountDaily;
export const MAX_DAILY=SETTINGS.DailyInstanceMaxBattleCountDaily;
export const PAID_DAILY=MAX_DAILY-FREE_DAILY;
export function instanceType(type:number){return dailyInstanceTypes[String(type)];}
export function instanceStage(type:number,mapId:number){
 const cfg=instanceType(type),index=cfg?.maps.indexOf(mapId)??-1;
 if(!cfg||index<0)return null;
 const stage=STAGES[String(mapId)],map=MAPS[String(mapId)];
 return stage&&map?{cfg,index,stage,map}:null;
}
export function dailyDay(now=new Date()){
 return new Date(now.getTime()+9*60*60*1000).toISOString().slice(0,10);
}
export function dailyInstanceDefenders(type:number,mapId:number){
 const s=instanceStage(type,mapId);return s?sourceDefenders(s.map):null;
}
export function dailyRewards(type:number,mapId:number,count=1,bonus=0){
 const s=instanceStage(type,mapId);
 if(!s||!Number.isInteger(count)||count<=0||!Number.isSafeInteger(bonus)||bonus<0)throw Error('invalid_daily_rewards');
 // Original scaled/4: integer rounding before multiplying by the clear count.
 return towerRewards(s.stage.rewards.map(([id,n])=>[id,Math.floor((1000+bonus)*n/1000)*count]));
}
