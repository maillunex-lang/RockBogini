import {calculateHit} from './damage.js';
import {effectiveAttr,type Buff} from './buffs.js';
import {dealDamage,heal,revive,type HealthUnit} from './health.js';
import {baseValue,specialDamage,type EffectContext} from './periodic.js';
export type CombatUnit=HealthUnit&{element:number};
export type ExecutionContext=EffectContext&{random:()=>number;pvp?:boolean;banCrit?:boolean};
export function executeEffect(a:CombatUnit,t:CombatUnit,b:Pick<Buff,'tags'>&{params?:number[]},items:number[],ctx:ExecutionContext){
 const [code,coef,param,cap=0]=items;
 if([101,102,105,106,137,118].includes(code)){
 if(!Number.isFinite(coef))throw Error('invalid_coefficient');
 const attr=(u:{attrs:Record<string,number>},k:number)=>effectiveAttr(u===a?a:t,k);
 const raw106=Math.trunc((b.params?.[0]===102?a.hp_max:t.hp_max)*coef/1000);
 const hit=code===106?{damage:Math.max(1,b.params?.[0]!==102&&t.is_boss>0?Math.min(raw106,Math.trunc(effectiveAttr(a,0)*coef*20/1000)):raw106),event:'hit'}:code===118?{damage:specialDamage(a,t,coef,param,cap,b.tags,ctx),event:'special'}:calculateHit(a,t,code===137?Math.trunc(baseValue(a,t,param,ctx)*coef/Math.max(effectiveAttr(a,0),1)):coef,code===105?'real':code===137?'element':code as 101|102,ctx.random,{attr,pvp:ctx.pvp,banCrit:ctx.banCrit});
 const result=dealDamage(a,t,hit.damage);
 if(result.damage){ctx.dealt??={};ctx.dealt[t.id]=(ctx.dealt[t.id]??0)+result.damage}
 return {status:'damage' as const,event:hit.event,...result};
 }
 if([103,104,119].includes(code)){
 let raw=Math.trunc((code===103?effectiveAttr(a,0):code===104?t.hp_max:baseValue(a,t,param,ctx))*coef/1000);
 if(code===119&&cap>0)raw=Math.min(raw,Math.trunc(effectiveAttr(a,0)*cap/1000));
 const result=heal(a,t,raw);
 if(result.healed+result.overflow>0&&t.hp>0){ctx.overflow??={};ctx.overflow[t.id]=result.overflow;ctx.cured=(ctx.cured??0)+result.healed}
 return {status:'heal' as const,...result};
 }
 if(code===112)return {status:'revive' as const,hp:revive(a,t,items.slice(1),ctx)};
 return {status:'unsupported' as const,code};
}
