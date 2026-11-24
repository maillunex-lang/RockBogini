import {effectCondition,startCondition,triggerCondition} from './conditions.js';
import {summarizeBattle} from './result.js';
import {runRounds,turnOrder,winner} from './rounds.js';
import {planAction,consumeAction,type ActionUnit} from './actions.js';
import {actionSkills,hitCounts} from './actionData.js';
import {SkillEffect} from './SkillEffect.js';
import {BuffBase} from './BuffBase.js';
import {executeEffect,type CombatUnit,type ExecutionContext} from './execute.js';
import {applyBuff} from './applyBuff.js';
import {effectiveAttr,immune,hasTag,dropTemp,holdAfterDeath} from './buffs.js';
import {selectTargets} from './target.js';
import {baseValue} from './periodic.js';
import {TriggerEngine,type BattleEvent} from './triggers.js';
export type Fighter=CombatUnit&ActionUnit&{passives?:number[]};
export function simulate(input:readonly Fighter[],random:()=>number,maxRounds=15){
 const acted=new Set<number>();let key=0,extra=0;let engine:TriggerEngine;const queue:{actor:Fighter;sid:number;atype:number}[]=[];const issues=new Set<string>();const journal:{round:number;actor:number;target:number;code:number;hp:number}[]=[];
 const instant=new Set([101,102,105,137,118,103,104,119,112]);
 const chance=(p:number)=>p===0||p>=1000||(p>0&&random()*1000<p);
 const resolve=(a:Fighter,t:Fighter,b:{tags:number[]},items:number[],ctx:ExecutionContext,round:number,metadata:Partial<BattleEvent>={})=>{
 const r=executeEffect(a,t,b,items,ctx);
 if(r.status==='unsupported'){issues.add('trigger:'+items[0]);return}
 journal.push({round,actor:a.id,target:t.id,code:items[0],hp:t.hp});
 const emit=(code:number,subject:Fighter,other:Fighter)=>engine.emit({...metadata,code,subject:subject.id,other:other.id,value:r.status==="damage"?r.damage:r.status==="heal"?r.healed:undefined,atype:metadata.atype??0});
 if(r.status==='damage'){
 if(r.damage>0)emit(173,t,a);
 if(items[0]===118)emit(147,t,a);
 else if(r.event!=='dodge'){emit(143,t,a);if(items[0]===101||items[0]===102)emit(items[0]===101?121:122,a,t);emit(129,a,t);if(r.event==='crit'){emit(128,a,t);emit(145,t,a)}}
 if(r.guardSkill>0)queue.push({actor:t,sid:r.guardSkill,atype:0});
 if(r.killed&&t.hp<=0){if(items[0]!==118)emit(148,t,a);emit(150,t,a);if(t.hp<=0){emit(151,t,a);if(items[0]!==118)emit(149,t,a);if(t.hp<=0)t.buffs=t.buffs.filter(holdAfterDeath);emit(125,a,t);if(items[0]===101||items[0]===102)emit(items[0]===101?126:127,a,t)}}
 }else if(r.status==='heal'&&r.healed>0)emit(172,t,a);else if(r.status==='revive'&&r.hp>0)emit(152,t,a);
 };
 const perform=(units:Fighter[],a:Fighter,round:number,plan:{atype?:number;skillId?:number;targets:number[];groups:{effects:number[]}[]})=>{
 const ctx:ExecutionContext={random,banCrit:hasTag(a,9)};
 const walk=(id:number,depth:number)=>{
 if(depth>16){issues.add('effect_depth:'+id);return}
 const e=SkillEffect[id];if(!e){issues.add('missing_effect:'+id);return}
 if(!effectCondition(e.WorkCondition.map(x=>x.Items),a,acted,code=>issues.add('effect_condition:'+code+':'+id)))return;
 if(!chance(e.WorkChance))return;
 const targets=[2,3].includes(e.TargetType)?plan.targets:selectTargets(units,a,e,plan.targets,random);
 for(const {Items:[bid,ch]} of e.BuffList){
 const b=BuffBase[bid];if(!b){issues.add('missing_buff:'+bid);continue}
 for(const tid of targets){const t=units.find(u=>u.id===tid);if(!t)continue;
 if(!startCondition(b.StartWorkCondition.map(x=>x.Items),a,t,ctx.overflow,code=>issues.add('buff_condition:'+code+':'+bid)))continue;
 if(b.StartEffect.every(x=>instant.has(x.Items[0]))&&b.Round<=0){
 if(!chance(ch||b.StartWorkChance)||immune(t,b))continue;
 for(const {Items} of b.StartEffect){if(t.hp<=0&&Items[0]!==112)continue;resolve(a,t,{tags:b.Tags},Items,ctx,round,{skill:plan.skillId===undefined?undefined:actionSkills[plan.skillId],buff:b,atype:plan.atype??0})}
 }else{const r=applyBuff(a,t,b,{random,key:()=>++key,fresh:false,chance:ch,condition:rows=>startCondition(rows,a,t,ctx.overflow),baseValue:p=>baseValue(a,t,p,ctx)});if(r.status.startsWith('unsupported'))issues.add('buff:'+bid)}
 }}
 for(const child of e.ChildEffects)walk(child,depth+1);
 };
 for(const g of plan.groups)for(const id of g.effects)walk(id,0);
 };
 const makeEngine=(units:Fighter[],round:number)=>new TriggerEngine(units,round,{random,condition:(owner,event,rows)=>triggerCondition(rows,owner,units,round,event,code=>issues.add("trigger_condition:"+code)),execute:(a,t,b,fx,event)=>{if(fx[0]===120){queue.push({actor:a as Fighter,sid:fx[1],atype:fx[2]??0});return}resolve(a as Fighter,t as Fighter,b,fx,{random},round,{skill:event.skill,buff:BuffBase[b.id],atype:event.atype})}});
 const drain=(units:Fighter[],round:number)=>{while(queue.length){const q=queue.shift()!;if(extra>=12||winner(units)||q.actor.hp<=0||hasTag(q.actor,4))continue;const skill=actionSkills[q.sid];if(!skill){issues.add('extra_skill:'+q.sid);continue}extra++;perform(units,q.actor,round,{skillId:q.sid,atype:q.atype,targets:selectTargets(units,q.actor,skill,[],random),groups:skill.Effects.map(x=>({effects:x.Items}))});acted.add(q.actor.camp)}};
 const result=runRounds(input,maxRounds,{
 speed:u=>effectiveAttr(u as Fighter,3),
 start:(units,round)=>{acted.clear();engine=makeEngine(units,round);extra=0;
 if(round===1)for(const id of turnOrder(units,u=>effectiveAttr(u as Fighter,3))){const a=units.find(u=>u.id===id)!;for(const sid of a.passives??[]){if(a.hp<=0)break;const skill=actionSkills[sid];if(!skill){issues.add('missing_passive:'+sid);continue}perform(units,a,round,{skillId:sid,targets:selectTargets(units,a,skill,[],random),groups:skill.Effects.map(x=>({effects:x.Items}))})}}
 engine.emit({code:501});for(const u of units)dropTemp(u);drain(units,round);
 },
 action:(units,a,round)=>{
 extra=0;engine.emit({code:163,subject:a.id});for(const u of units)dropTemp(u);
 drain(units,round);if(winner(units))return;
 const plan=planAction(units,a,actionSkills,hitCounts,random,{disabled:hasTag(a,4),normalOnly:hasTag(a,6)||hasTag(a,7)});if(!plan)return;
 consumeAction(a,plan);perform(units,a,round,{...plan,atype:1});acted.add(a.camp);drain(units,round);
 },
 end:(units,round)=>{extra=0;engine.endRound();drain(units,round)}
 });
 return {...result,summary:summarizeBattle(result.units,result.result,result.rounds),journal,issues:[...issues],parityReady:false};
}
