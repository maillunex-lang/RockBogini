import {effectiveAttr,hasTag,holdAfterDeath,type Buff} from './buffs.js';
import {removeBuff} from './applyBuff.js';
import {baseValue,type PeriodicUnit,type EffectContext} from './periodic.js';
export type HealthUnit=PeriodicUnit&{cure:number};
export type DefenseBuff=Buff&{shield?:number;cshield?:number;immunity?:boolean;ratioReduce?:number;flatReduce?:number;hurtLimit?:number;guard?:[number,number]};
export function dealDamage(a:PeriodicUnit,d:PeriodicUnit,raw:number){
 if(!Number.isSafeInteger(raw)||raw<0)throw Error('invalid_damage');
 let n=raw,absorbed=0,guardSkill=0,guardKey:number|undefined,guardBuffId:number|undefined;
 if(d.hp<=0||n===0)return {damage:0,absorbed,guardSkill,guardBuffId:undefined as number|undefined,killed:false};
 const buffs=d.buffs as DefenseBuff[];
 const counted=buffs.find(b=>(b.cshield??0)>0);
 if(buffs.some(b=>b.immunity)){absorbed=n;n=0}
 else if(counted){absorbed=n;n=0;counted.cshield!--;if(!counted.cshield&&!(counted.shield??0))removeBuff(d,counted.key)}
 else{
 const sum=(k:'ratioReduce'|'flatReduce')=>buffs.reduce((s,b)=>s+(b[k]??0),0);
 n=Math.round(n*Math.max(1-sum('ratioReduce')/1000,0))-sum('flatReduce');
 const limit=buffs.find(b=>b.hurtLimit!==undefined)?.hurtLimit;
 if(limit!==undefined)n=Math.min(n,Math.max(Math.trunc(d.hp_max*limit/1000),1));n=Math.max(n,0);
 for(const b of buffs){if(n<=0)break;if((b.shield??0)<=0)continue;const take=Math.min(b.shield!,n);b.shield!-=take;n-=take;absorbed+=take;if(b.shield===0&&!(b.cshield??0))removeBuff(d,b.key)}
 if(n>0&&n>=d.hp){const b=(d.buffs as DefenseBuff[]).find(b=>b.guard);if(b?.guard){const [v,sid]=b.guard;const keep=Math.min(Math.max(Math.trunc(d.hp_max*v/1000),1),d.hp);n=Math.max(d.hp-keep,0);guardSkill=sid;guardKey=b.key;guardBuffId=b.id;delete b.guard}}
 }
 const damage=Math.min(n,d.hp);d.hp-=damage;d.hurt+=damage;a.damage+=damage;if(guardKey!==undefined)removeBuff(d,guardKey);
 return {damage,absorbed,guardSkill,guardBuffId,killed:d.hp===0};
}
export function heal(a:HealthUnit,d:HealthUnit,raw:number){const amount=hasTag(d,10)?0:Math.max(Math.round(raw*(1+(effectiveAttr(a,12)+effectiveAttr(d,13))/1000)),0);if(amount<=0||d.hp<=0)return {healed:0,overflow:0};const healed=Math.min(amount,d.hp_max-d.hp);d.hp+=healed;a.cure+=healed;return {healed,overflow:amount-healed}}
export function revive(a:PeriodicUnit,d:PeriodicUnit,params:number[],ctx:EffectContext={}){if(d.hp>0||hasTag(d,5))return 0;const hp=params.length>=2?Math.trunc(baseValue(a,d,params[1],ctx)*params[0]/1000):1;d.buffs=d.buffs.filter(holdAfterDeath);d.hp=Math.min(Math.max(hp,1),d.hp_max);return d.hp}
