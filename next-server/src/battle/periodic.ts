import {effectiveAttr,type Buff} from './buffs.js';
import type {EffectUnit} from './applyBuff.js';
export type PeriodicUnit=EffectUnit&{level:number;is_boss:number;hurt:number;damage:number};
export type EffectContext={dealt?:Record<number,number>;overflow?:Record<number,number>;cured?:number};
export function baseValue(a:PeriodicUnit,t:PeriodicUnit,p:number,c:EffectContext={}):number{
 switch(p){case 101:return effectiveAttr(a,0);case 102:return a.hp_max;case 103:case 111:return t.hp_max;case 104:return effectiveAttr(a,3)*a.level;case 105:return effectiveAttr(a,2);case 106:return effectiveAttr(a,3);case 108:return a.hp;case 110:return a.hurt;case 114:return a.attrs[0]??0;case 115:return effectiveAttr(t,0);case 116:return a.damage;case 117:return t.damage;case 201:case 202:case 205:case 209:case 210:case 214:case 215:return Object.values(c.dealt??{}).reduce((x,y)=>x+y,0);case 203:return c.overflow?.[t.id]??0;case 204:return c.cured??0;case 212:return t.hp;case 213:return Math.max(t.hp_max-t.hp,0);default:return effectiveAttr(a,0)}
}
type TaggedBuff=Buff&{dmgAddon?:[number,number[]][];hurtAddon?:[number,number[]][]};
export function specialDamage(a:PeriodicUnit,t:PeriodicUnit,coef:number,param:number,cap:number,tags:number[],ctx:EffectContext={}){
 const atk=effectiveAttr(a,0);let raw=Math.trunc(baseValue(a,t,param,ctx)*coef/1000);
 if(t.is_boss>0&&[103,111,212,213].includes(param))raw=Math.min(raw,Math.trunc(atk*coef*20/1000));
 if(cap>0)raw=Math.min(raw,Math.trunc(atk*cap/1000));
 const addon=(u:PeriodicUnit,k:'dmgAddon'|'hurtAddon')=>u.buffs.reduce((n,b)=>n+((b as TaggedBuff)[k]??[]).reduce((s,[v,list])=>s+(list.some(x=>tags.includes(x))?v:0),0),0);
 return Math.max(0,Math.round(raw*Math.max(1+(effectiveAttr(a,28)-effectiveAttr(t,29)+addon(a,'dmgAddon')+addon(t,'hurtAddon'))/1000,0)));
}
// Isolated HP sink for tests; production must supply mitigation/death pipeline.
export function applyUnmitigated(a:PeriodicUnit,t:PeriodicUnit,damage:number){if(!Number.isSafeInteger(damage)||damage<0)throw Error('invalid_damage');const dealt=Math.min(Math.max(t.hp,0),damage);t.hp-=dealt;t.hurt+=dealt;a.damage+=dealt;return dealt}
export function executePeriodic(a:PeriodicUnit,t:PeriodicUnit,b:Buff,effect:number[],sink:(a:PeriodicUnit,t:PeriodicUnit,n:number)=>number,ctx:EffectContext={}){
 if(effect[0]!==118||effect.length<3)return {status:'unsupported' as const};
 const n=specialDamage(a,t,effect[1],effect[2],effect[3]??0,b.tags,ctx);
 return {status:'applied' as const,damage:n>0&&t.hp>0?sink(a,t,n):0};
}
