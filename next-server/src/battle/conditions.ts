import {effectiveAttr,hasTag,tagCount,layers,type BuffUnit} from './buffs.js';
type Unit=BuffUnit&{camp:number;hp:number;hp_max:number};
export function compare(a:number,op:number,b:number){switch(op){case 0:return a===b;case 1:return a>=b;case 2:return a<=b;case 3:return a>b;case 4:return a<b;default:return false}}
export function evaluate(rows:readonly number[][],predicate:(r:number[])=>boolean){
 const marker=rows[0]?.length===1&&[1,2,999].includes(rows[0][0])?rows[0][0]:0;
 const rest=marker?rows.slice(1):rows;
 return marker===2?rest.length===0||rest.some(predicate):rest.every(predicate);
}
export function effectCondition(rows:readonly number[][],a:Unit,acted:ReadonlySet<number>,unknown:(code:number)=>void=()=>{}){
 // Record unknown rows even when logical evaluation would short circuit.
 for(const r of rows)if(![1,2,3,4,5,999].includes(r[0]))unknown(r[0]);
 return evaluate(rows,([code,x,y,z])=>{
 switch(code){
 case 1:return hasTag(a,y)===(x===1);
 case 2:return x===undefined||(!acted.has(a.camp))===(x===1);
 case 3:return layers(a,x)>=y;
 case 4:return (z===undefined?hasTag(a,y):tagCount(a,y)>=z)===(x===1);
 case 5:return compare(Math.trunc(a.hp*1000/Math.max(a.hp_max,1)),x,y);
 default:return false;
 }
 });
}
type Target=Unit&{element?:number;career?:number;id:number};
export function startCondition(rows:readonly number[][],a:Target,t:Target,overflow:Record<number,number>={},unknown:(code:number)=>void=()=>{}){
 for(const r of rows)if(![1,2,3,4,5,6,7,10,11,999].includes(r[0]))unknown(r[0]);
 return evaluate(rows,([code,x,y,...rest])=>{
 const flag=(b:boolean)=>b===(x===1);
 switch(code){
 case 1:return flag([y,...rest].includes(t.element??-1));
 case 2:return x===undefined||compare(Math.trunc(t.hp*1000/Math.max(t.hp_max,1)),x===1?2:1,y);
 case 3:return flag(tagCount(t,y)>=Math.max(rest[0]??1,1));
 case 4:return flag([y,...rest].some(k=>hasTag(t,k)));
 case 5:return flag([y,...rest].includes(t.career??-1));
 case 6:return flag(t.hp<=0);
 case 7:return flag(effectiveAttr(t,3)>effectiveAttr(a,3));
 case 10:return flag((overflow[t.id]??0)>0);
 case 11:return flag(a.camp===t.camp);
 default:return false;
 }
 });
}
export type ConditionEvent={subject?:number;other?:number;value?:number;atype?:number;skill?:{Type:number;EffectType:number[]};buff?:{Tags:number[];StartEffect:{Items:number[]}[];TriggerEffect:{Items:number[]}[]}};
export function triggerCondition(rows:readonly number[][],owner:Target,units:readonly Target[],round:number,ev:ConditionEvent,unknown:(code:number)=>void=()=>{}){
 const who=(w:number)=>w===0?owner:w===1?units.find(u=>u.id===ev.other):units.find(u=>u.id===ev.subject)??owner;
 const supported=[1,2,3,4,5,6,7,8,9,10,12,13,14,15,16,18,20,21,25,26,27,28,29,31,33,34,999];
 for(const r of rows)if(!supported.includes(r[0]))unknown(r[0]);
 return evaluate(rows,([k,x,y,...rest])=>{
 const s=who(2)!,o=who(1),flag=(b:boolean,v=x)=>b===(v===1);
 const hp=(u:Target)=>Math.trunc(u.hp*1000/Math.max(u.hp_max,1));
 const skill=(f:number,vals:number[])=>f===1?!!ev.skill?.EffectType.some(v=>vals.includes(v)):f===2?vals.includes(ev.atype??-1):f===3?vals.includes(ev.skill?.Type??-1):false;
 switch(k){
 case 1:return flag(hasTag(s,y));
 case 2:return x===undefined||!o||flag(hasTag(o,y));
 case 3:return skill(1,[x,y,...rest]);
 case 4:return skill(2,[x,y,...rest]);
 case 5:return flag(s.hp<=0);
 case 6:return !o||flag(o.hp<=0);
 case 7:return !o||flag(effectiveAttr(o,3)>effectiveAttr(s,3));
 case 8:return compare(hp(s),x===1?2:3,y);
 case 9:return skill(3,[x,y,...rest]);
 case 10:return compare(Math.trunc((ev.value??0)*1000/Math.max(s.hp_max,1)),x===1?1:4,y);
 case 12:case 13:case 14:case 15:{const u=k===12||k===14?s:o;return flag([y,...rest].includes((k<=13?u?.career:u?.element)??-1))}
 case 16:return flag(units.some(u=>u.camp===owner.camp&&u.hp<=0));
 case 18:return !o||flag(s.camp===o.camp);
 case 20:case 21:return flag(ev.buff?.Tags.includes(y)??false);
 case 25:{const u=who(x);return !u||flag(u.hp<=0,y)}
 case 26:return units.filter(u=>u.camp===(x===0?owner.camp:-owner.camp)&&u.hp>0).length>=y;
 case 27:return flag([...(ev.buff?.StartEffect??[]),...(ev.buff?.TriggerEffect??[])].some(v=>v.Items[0]===y));
 case 28:{const u=who(x);return !!u&&compare(tagCount(u,rest[0]),[1,3,4,1,2,0][y]??1,rest[1]??1)}
 case 29:return flag(skill(x,rest),y);
 case 31:{const u=who(x);if(!u)return false;const v=y===-2?hp(u):y===-1?u.hp:y===-5?u.hp_max:y>=0?effectiveAttr(u,y):0;return compare(v,rest[2],rest[1])}
 case 33:return rest.length?flag(rest[0]===0,y):[0,1].includes(y);
 case 34:return x===3?y>0&&round%y===0:compare(round,[0,2,1,0,3][x]??-1,y);
 default:return false;
 }
 });
}
