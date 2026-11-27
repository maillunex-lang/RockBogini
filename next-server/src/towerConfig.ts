/** Original TestTowerType + MapTestTower + MapBase protobuf exports, not invented balance. */
import {readFileSync} from 'node:fs';
import {calculateHero} from './heroAttrs.js';
import {heroCatalog} from './heroCatalog.js';
import {skillConfig,initial} from './unitConfig.js';
import type {Fighter} from './battle/simulation.js';

type TowerType={id:number;mapIdPrefix:number;maxCount:number;maxRewardCount:number;openTime:number[];rankId:number};
type TowerFloor={id:number;firstClearRewards:number[][];dailyRewards:number[][];extraRewards:number[][];quickBattlePower:number;distance:number;isKeyNode:number};
type TowerMap={id:number;type:number;bg:string;heroes:number[][];strength:number[];attributeAddon:number[][];battlePower:number;isBoss:number};
export const towerTypes=JSON.parse(readFileSync(new URL('../../data/tower-types.json',import.meta.url),'utf8')) as Record<string,TowerType>;
const FLOORS=JSON.parse(readFileSync(new URL('../../data/tower-maps.json',import.meta.url),'utf8')) as Record<string,TowerFloor>;
const MAPS=JSON.parse(readFileSync(new URL('../../data/tower-map-base.json',import.meta.url),'utf8')) as Record<string,TowerMap>;
const HEROES=new Map(heroCatalog.map(h=>[h.Id,h]));
const LIMITS=JSON.parse(readFileSync(new URL('../../data/tower-limits.json',import.meta.url),'utf8')) as {
 maxDailyWins:number;extraAttemptCosts:number[][];diamondItemId:number;hardTowerModules:Record<string,[number,number,number]>;
};
export const TOWER_DIAMOND_ITEM=LIMITS.diamondItemId;
export const TOWER_EXTRA_ATTEMPT_STEPS=LIMITS.extraAttemptCosts;
export const TOWER_HARD_MODULES=LIMITS.hardTowerModules;
export function towerRequiredModule(type:number):number|null{
 if(type===199)return 2034;
 if(type>=101&&type<=105)return 2028+(type-100);
 return null;
}
export function towerExtraCost(n:number,alreadyBought:number):number|null{
 if(!Number.isSafeInteger(n)||n<1||n>100||!Number.isSafeInteger(alreadyBought)||alreadyBought<0||alreadyBought+n>1000000)return null;
 let remaining=alreadyBought+n,total=0;
 for(const [from,unitPrice] of [...TOWER_EXTRA_ATTEMPT_STEPS].reverse()){
  if(remaining>alreadyBought&&remaining>=from){
   const prior=Math.max(from-1,alreadyBought);
   total+=(remaining-prior)*unitPrice;
   remaining=prior;
  }
 }
 return Number.isSafeInteger(total)?total:null;
}
export function towerAttemptState(battleCount:number,extraCount:number){
 const freeLeft=Math.max(0,TOWER_MAX_DAILY_BATTLES-battleCount);
 return {freeLeft,paidLeft:extraCount,available:freeLeft+extraCount>0};
}
export const normalTower=99;
export const hardTower=199;
export const TOWER_MAX_DAILY_BATTLES=LIMITS.maxDailyWins;
export function towerType(type:number){return towerTypes[String(type)];}
export function towerFloor(type:number,index:number){
 const cfg=towerType(type);
 if(!cfg||!Number.isInteger(index)||index<1||index>cfg.maxCount)return null;
 const mapId=cfg.mapIdPrefix+index;
 const floor=FLOORS[String(mapId)],map=MAPS[String(mapId)];
 return floor&&map?{mapId,floor,map}:null;
}
export function towerWeekday(now=new Date()){
 // Original Game.Pve.Common.weekday: Asia/Tokyo; ISO Monday=1...Sunday=7.
 const local=new Date(now.getTime()+9*60*60*1000);
 return ((local.getUTCDay()+6)%7)+1;
}
export function towerOpen(type:number,now=new Date()){
 const t=towerType(type);
 return !!t&&(!t.openTime.length||t.openTime.includes(towerWeekday(now)));
}
export function towerRewards(rows:number[][]):[number,number][]{
 const m=new Map<number,number>();
 for(const [item,count] of rows){
  if(!Number.isSafeInteger(item)||!Number.isSafeInteger(count)||item<=0||count<=0)continue;
  m.set(item,(m.get(item)??0)+count);
 }
 return [...m.entries()];
}
export function sourceDefenderAttrs(heroId:number,level:number,star:number,addon:number[][]){
 const h=calculateHero(heroId,level,star);
 const attrs:Record<number,number>={...h.attrs};
 for(const [k,v] of addon)if(Number.isSafeInteger(k)&&Number.isSafeInteger(v)){
  attrs[k]=(attrs[k]??0)+v;
 }
 // Original Unit.battle_layer: 200s and 210s update 0..3 at battle time.
 for(const p of [200,210])for(let i=0;i<4;i++){
  const pct=attrs[p+4+i]??0,flat=attrs[p+i]??0;
  if(pct!==0||flat!==0)attrs[i]=Math.max(Math.floor((attrs[i]??0)*(1+pct/1000)+flat),1);
 }
 for(const k of Object.keys(attrs).map(Number))if(k>=200&&k<220)delete attrs[k];
 for(const [k,v] of Object.entries(initial))attrs[Number(k)]=(attrs[Number(k)]??0)+v;
 return {attrs,skills:h.skills};
}
/** Shared MapBase defender importer: originals are read-only and use 9-slot stations. */
export function sourceDefenders(map:{heroes:number[][];strength:number[];attributeAddon:number[][];isBoss:number}):Fighter[]|null{
 const star=map.strength[0]??5,level=map.strength[1]??1;
 const units:Fighter[]=[];
 for(const [position,id] of map.heroes){
  if(!Number.isInteger(position)||position<1||position>9||!HEROES.has(id))return null;
  const hero=HEROES.get(id)!;
  const {attrs,skills}=sourceDefenderAttrs(id,level,star,map.attributeAddon);
  const actives=skills.filter(x=>skillConfig[x]?.active);
  const hp=Math.max(1,attrs[1]??1);
  units.push({
   id:101+position,hero_id:id,sid:0,camp:-1,station:position-1,level,star,
   model:hero.Model,element:hero.ElementType,career:hero.Career,
   attrs,hp,hp_max:hp,normal:hero.NormalAttackId,actives,skills,
   passives:skills.filter(x=>skillConfig[x]?.passive),
   cd:Object.fromEntries(actives.map(x=>[x,skillConfig[x].start])),
   buffs:[],is_boss:map.isBoss,hurt:0,damage:0,cure:0,
  } as Fighter);
 }
 return units.length?units:null;
}
export function towerDefenders(type:number,index:number):Fighter[]|null{
 const config=towerFloor(type,index);
 if(!config)return null;
 const {map}=config;
 return sourceDefenders(map);
}
