import {selectTargets,type TargetSpec,type TargetUnit} from './target.js';
export type ActionSkill=TargetSpec&{Id:number;Type:number;ActionIndex:number;Cooldown:number;EffectType:number[];Effects:{Items:number[]}[]};
export type ActionUnit=TargetUnit&{model:string;normal:number;actives:number[];cd:Record<number,number>};
export function planAction(units:readonly ActionUnit[],actor:ActionUnit,skills:Record<number,ActionSkill>,counts:Record<string,Record<number,number>>,random:()=>number,options:{disabled?:boolean;normalOnly?:boolean;taunt?:number}={}){
 if(actor.hp<=0||options.disabled)return null;
 const taunt=units.find(u=>u.id===options.taunt&&u.hp>0&&u.camp!==actor.camp);
 const ready=actor.actives.find(id=>(actor.cd[id]??0)<=0);
 const choices=options.normalOnly||taunt?[actor.normal]:[ready,actor.normal];
 for(const id of choices){
 if(id===undefined)continue;
 const skill=skills[id];if(!skill||skill.ActionIndex<=0)continue;
 const targets=taunt&&skill.TargetSide===-1?[taunt.id]:selectTargets(units,actor,skill,[],random);
 if(!targets.length)continue;
 const hits=Math.max(1,counts[actor.model]?.[skill.ActionIndex]??1);
 const groups=skill.Effects.map(x=>x.Items);
 return {actor:actor.id,skillId:id,targets,hits,attack:skill.EffectType.some(t=>[1,2,3].includes(t)),groups:groups.map((effects,i)=>({effects,at:groups.length===1?hits:Math.min(i+1,hits),split:groups.length===1})),cooldown:skill.Type===1?null:skill.Cooldown};
 }
 return null;
}
export function consumeAction(actor:ActionUnit,plan:NonNullable<ReturnType<typeof planAction>>){if(plan.actor!==actor.id)throw Error('wrong_actor');if(plan.cooldown!==null)actor.cd[plan.skillId]=plan.cooldown}
export function tickCooldowns(units:readonly ActionUnit[]){for(const u of units)for(const k of Object.keys(u.cd))u.cd[Number(k)]=Math.max(u.cd[Number(k)]-1,0)}
export function splitDamage(total:number,n:number){if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(n)||n<1)throw Error('invalid_split');const base=Math.floor(total/n);return Array.from({length:n},(_,i)=>i===n-1?total-base*(n-1):base)}
