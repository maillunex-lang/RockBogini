/** NEXT-021.3 original EndlessAbyssType / MapEndlessAbyss / MapBase / buff exports. */
import {readFileSync} from 'node:fs';
import {sourceDefenders,towerRewards,towerWeekday} from './towerConfig.js';
type AbyssType={id:number;mapIdPrefix:number;openTime:number[]};
export type AbyssStage={id:number;monsters:number[];recommendPower:number;heroId:number;pointReward:number[][];dailyReward:number[][]};
export type AbyssBuff={id:number;count:number;type:number;attrs:number[][]};
type MapBase={id:number;type:number;bg:string;heroes:number[][];strength:number[];attributeAddon:number[][];battlePower:number;isBoss:number};
export const abyssTypes=JSON.parse(readFileSync(new URL('../../data/abyss-types.json',import.meta.url),'utf8')) as Record<string,AbyssType>;
const STAGES=JSON.parse(readFileSync(new URL('../../data/abyss-stages.json',import.meta.url),'utf8')) as Record<string,AbyssStage>;
const MAPS=JSON.parse(readFileSync(new URL('../../data/abyss-maps.json',import.meta.url),'utf8')) as Record<string,MapBase>;
export const abyssBuffs=JSON.parse(readFileSync(new URL('../../data/abyss-buffs.json',import.meta.url),'utf8')) as Record<string,AbyssBuff>;
export const abyssParams=JSON.parse(readFileSync(new URL('../../data/abyss-params.json',import.meta.url),'utf8')) as {
 pointWaves:number[];buffWaves:number[];mapTypes:Record<string,{maxRound:number;attackerFormation:number[]}>;
};
export function abyssType(type:number){return abyssTypes[String(type)];}
export function abyssOpen(type:number,now=new Date()){const t=abyssType(type);return !!t&&t.openTime.includes(towerWeekday(now));}
export function abyssStage(type:number,index:number){
 const cfg=abyssType(type);
 if(!cfg||!Number.isInteger(index)||index<1||index>70)return null;
 const stage=STAGES[String(cfg.mapIdPrefix+index)];
 return stage?{cfg,stage}:null;
}
export function abyssWave(type:number,index:number,wave:number){
 const result=abyssStage(type,index);if(!result||!Number.isInteger(wave)||wave<1||wave>result.stage.monsters.length)return null;
 const mapId=result.stage.monsters[wave-1],map=MAPS[String(mapId)];
 return map?{mapId,map,...result}:null;
}
export function abyssDefenders(type:number,index:number,wave:number){
 const cfg=abyssWave(type,index,wave);
 return cfg?sourceDefenders(cfg.map):null;
}
export function abyssPointRewards(type:number,index:number,slot:number){
 const cfg=abyssStage(type,index);
 return cfg?towerRewards([cfg.stage.pointReward[slot]??[]]):[];
}
export function abyssBuff(id:number){return abyssBuffs[String(id)];}
