import {effectCondition,startCondition,triggerCondition} from './conditions.js';
import {summarizeBattle} from './result.js';
import {runRounds,turnOrder,winner} from './rounds.js';
import {planAction,consumeAction,type ActionUnit} from './actions.js';
import {actionSkills,hitCounts} from './actionData.js';
import {SkillEffect} from './SkillEffect.js';
import {BuffBase} from './BuffBase.js';
import {executeEffect,type CombatUnit,type ExecutionContext} from './execute.js';
import {modifiedGroups} from "./skillMods.js";
import {applyBuff,removeBuff} from './applyBuff.js';
import {effectiveAttr,immune,hasTag,dropTemp,holdAfterDeath} from './buffs.js';
import {selectTargets,eventTargets,type TargetEvent} from './target.js';
import {baseValue} from './periodic.js';
import {TriggerEngine,type BattleEvent} from './triggers.js';
export type Fighter=CombatUnit&ActionUnit&{passives?:number[]};
export function simulate(input:readonly Fighter[],random:()=>number,maxRounds=15){
 const acted=new Set<number>();const done=new Set<number>();let ending=false;let skillDepth=0;type Acc={crit:boolean;attacked:Map<number,number>;healed:Set<number>};let acc:Acc|undefined;let key=0,extra=0;let engine:TriggerEngine;const queue:{actor:Fighter;sid:number;atype:number;event?:TargetEvent}[]=[];const issues=new Set<string>();const journal:{round:number;actor:number;target:number;code:number;hp:number}[]=[];
 const instant=new Set([101,102,105,106,137,118,103,104,119,112,113,115,116,131,121,120]);
 const chance=(p:number)=>p===0||p>=1000||(p>0&&random()*1000<p);
 const resolve=(a:Fighter,t:Fighter,b:{tags:number[];params?:number[]},items:number[],ctx:ExecutionContext,round:number,metadata:Partial<BattleEvent>={})=>{
 if([113,115,116,131].includes(items[0])){engine.removeMatching(t,items[0],items[1],items.slice(3));return}
 if(items[0]===120){useSkill(a,items[1],items[2]??0,{subject:t.id,other:a.id,targets:[t.id]},round);return}
 if(items[0]===121){engine.emit({code:items[1],subject:t.id});return}
 const r=executeEffect(a,t,b,items,ctx);
 if(r.status==='unsupported'){issues.add('trigger:'+items[0]);return}
 journal.push({round,actor:a.id,target:t.id,code:items[0],hp:t.hp});
 const emit=(code:number,subject:Fighter,other:Fighter)=>engine.emit({...metadata,code,subject:subject.id,other:other.id,value:r.status==="damage"?r.damage:r.status==="heal"?r.healed:undefined,atype:metadata.atype??0});
 if(r.status==='damage'){
 if(acc&&items[0]!==118&&r.event!=='dodge'){acc.attacked.set(t.id,(acc.attacked.get(t.id)??0)+r.damage);if(r.event==='crit')acc.crit=true}
 if(r.damage>0)emit(173,t,a);
 if(items[0]===118)emit(147,t,a);
 else if(r.event!=='dodge'){emit(143,t,a);if(items[0]===101||items[0]===102)emit(items[0]===101?121:122,a,t);emit(129,a,t);if(r.event==='crit'){emit(128,a,t);emit(145,t,a)}}
 if(r.guardSkill>0)useSkill(t,r.guardSkill,0,{subject:t.id,other:a.id,targets:[a.id]},round);
 if(r.killed&&t.hp<=0){if(items[0]!==118)emit(148,t,a);emit(150,t,a);if(t.hp<=0){emit(151,t,a);if(items[0]!==118)emit(149,t,a);if(t.hp<=0)t.buffs=t.buffs.filter(holdAfterDeath);emit(125,a,t);if(items[0]===101||items[0]===102)emit(items[0]===101?126:127,a,t)}}
 }else if(r.status==='heal'&&r.healed>0){acc?.healed.add(t.id);emit(172,t,a);}else if(r.status==='revive'&&r.hp>0)emit(152,t,a);
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
 const attach=(cfg:typeof b,depth:number,checked:boolean)=>{
 if(depth>16){issues.add('replacement_depth:'+cfg.Id);return}
 const metadata={skill:plan.skillId===undefined?undefined:actionSkills[plan.skillId],buff:cfg,atype:plan.atype??0};
 const r=applyBuff(a,t,cfg,{random,key:()=>++key,fresh:ending||done.has(t.id),chance:ch,unchecked:checked,allowRevive:cfg.StartEffect.some(x=>x.Items[0]===112),condition:rows=>checked||startCondition(rows,a,t,ctx.overflow),baseValue:p=>baseValue(a,t,p,ctx),instant:items=>{if(instant.has(items[0]))resolve(a,t,{tags:cfg.Tags,params:cfg.Params},items,ctx,round,metadata);else issues.add('start_effect:'+items[0])}});
 if(r.status.startsWith('unsupported'))issues.add('buff:'+cfg.Id);
 else if(r.status==='applied'&&cfg.Round>0&&t.hp>0){
 engine.emit({code:157,subject:t.id,other:a.id,buff:cfg});
 if(cfg.Tags.includes(13)||cfg.Tags.includes(4)){engine.emit({code:124,subject:a.id,other:t.id,buff:cfg});engine.emit({code:146,subject:t.id,other:a.id,buff:cfg})}
 if('replacement' in r&&r.replacement!==undefined){const old=t.buffs.find(x=>x.id===cfg.Id);const next=BuffBase[r.replacement];if(old&&next){removeBuff(t,old.key);if(t.hp>0)attach(next,depth+1,true)}else if(!next)issues.add('missing_replacement:'+r.replacement)}
 }
 };
 attach(b,0,false);
 }}
 for(const child of e.ChildEffects)walk(child,depth+1);
 };
 const types=plan.skillId===undefined?[]:actionSkills[plan.skillId]?.EffectType??[];
 const groups=modifiedGroups(a.buffs,types,plan.groups.map(g=>g.effects));
 for(const g of groups)for(const id of g)walk(id,0);
 };
 const useSkill=(actor:Fighter,sid:number,atype:number,event:TargetEvent,round:number)=>{
 sid=sid===-2?actor.normal:sid===-1?(actor.actives[0]??actor.normal):sid;
 const skill=actionSkills[sid];if(!skill){issues.add('extra_skill:'+sid);return}
 if(skill.ActionIndex>0){queue.push({actor,sid,atype,event});return}
 if(skillDepth>=8){issues.add('instant_skill_depth:'+sid);return}
 skillDepth++;try{const units=engine.units as Fighter[];perform(units,actor,round,{skillId:sid,atype:0,targets:eventTargets(units,actor,skill,event,random),groups:skill.Effects.map(x=>({effects:x.Items}))})}finally{skillDepth--}
 };
 const makeEngine=(units:Fighter[],round:number)=>new TriggerEngine(units,round,{random,condition:(owner,event,rows)=>triggerCondition(rows,owner,units,round,event,code=>issues.add("trigger_condition:"+code)),execute:(a,t,b,fx,event)=>{if(fx[0]===120){useSkill(a as Fighter,fx[1],fx[2]??0,event,round);return}resolve(a as Fighter,t as Fighter,b,fx,{random},round,{skill:event.skill,buff:BuffBase[b.id],atype:event.atype})}});
 const animated=(units:Fighter[],a:Fighter,round:number,plan:{skillId:number;atype:number;targets:number[];groups:{effects:number[]}[]},turn:boolean)=>{
 const skill=actionSkills[plan.skillId],base={skill,atype:plan.atype,targets:plan.targets};
 const previous=acc;const current:Acc={crit:false,attacked:new Map(),healed:new Set()};acc=current;
 try{
 if(skill.EffectType.some(t=>[1,2,3].includes(t)))for(const target of plan.targets)engine.emit({...base,code:153,subject:target,other:a.id});
 perform(units,a,round,plan);
 for(const u of units)dropTemp(u);acted.add(a.camp);
 engine.emit({...base,code:101,subject:a.id,other:plan.targets[0]});
 if(current.crit)engine.emit({...base,code:102,subject:a.id});
 for(const [target,value] of current.attacked){engine.emit({...base,code:154,subject:target,other:a.id,value});engine.emit({...base,code:155,subject:target,other:a.id,value})}
 if(current.healed.size){engine.emit({...base,code:123,subject:a.id,targets:[...current.healed]});for(const target of current.healed)engine.emit({...base,code:144,subject:target,other:a.id})}
 if(turn){engine.emit({...base,code:162,subject:a.id});engine.emit({...base,code:161,subject:a.id})}
 engine.emit({...base,code:503,subject:a.id});
 }finally{acc=previous;for(const u of units)dropTemp(u)}
 };
 const drain=(units:Fighter[],round:number)=>{while(queue.length){const q=queue.shift()!;if(extra>=12||winner(units)||q.actor.hp<=0||hasTag(q.actor,4))continue;const skill=actionSkills[q.sid];if(!skill){issues.add('extra_skill:'+q.sid);continue}const targets=q.event?eventTargets(units,q.actor,skill,q.event,random):selectTargets(units,q.actor,skill,[],random);if(!targets.length)continue;extra++;animated(units,q.actor,round,{skillId:q.sid,atype:q.atype,targets,groups:skill.Effects.map(x=>({effects:x.Items}))},false)}};
 const result=runRounds(input,maxRounds,{
 speed:u=>effectiveAttr(u as Fighter,3),
 start:(units,round)=>{acted.clear();done.clear();ending=false;engine=makeEngine(units,round);extra=0;
 if(round===1)for(const id of turnOrder(units,u=>effectiveAttr(u as Fighter,3))){const a=units.find(u=>u.id===id)!;for(const sid of a.passives??[]){if(a.hp<=0)break;const skill=actionSkills[sid];if(!skill){issues.add('missing_passive:'+sid);continue}perform(units,a,round,{skillId:sid,targets:selectTargets(units,a,skill,[],random),groups:skill.Effects.map(x=>({effects:x.Items}))})}}
 engine.emit({code:501});for(const u of units)dropTemp(u);drain(units,round);
 },
 action:(units,a,round)=>{
 extra=0;done.add(a.id);engine.emit({code:163,subject:a.id});for(const u of units)dropTemp(u);
 drain(units,round);if(winner(units))return;
 const plan=planAction(units,a,actionSkills,hitCounts,random,{disabled:hasTag(a,4),normalOnly:hasTag(a,6)||hasTag(a,7),taunt:a.buffs.find(b=>b.tags.includes(15)&&units.some(u=>u.id===b.from&&u.hp>0&&u.camp!==a.camp))?.from});if(!plan)return;
 consumeAction(a,plan);animated(units,a,round,{...plan,atype:1},true);drain(units,round);
 },
 end:(units,round)=>{extra=0;ending=true;engine.endRound();drain(units,round)}
 });
 return {...result,summary:summarizeBattle(result.units,result.result,result.rounds),journal,issues:[...issues],parityReady:false};
}
