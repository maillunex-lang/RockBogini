import {hasTag,dispellable,limitOk,countFire,type Buff} from './buffs.js';
import {removeBuff,type EffectUnit} from './applyBuff.js';
import type {ConditionEvent} from "./conditions.js";
export type BattleEvent=ConditionEvent&{code:number;subject?:number;other?:number;only?:number;targets?:number[]};
export type TriggerHooks={random:()=>number;condition?:(owner:EffectUnit,event:BattleEvent,conditions:number[][])=>boolean;execute:(source:EffectUnit,target:EffectUnit,buff:Buff,effect:number[],event:BattleEvent)=>void};
export class TriggerEngine{
 private depth=0;
 private firing=new Set<string>();
 constructor(readonly units:EffectUnit[],public round:number,readonly hooks:TriggerHooks){}
 emit(e:BattleEvent){
 if(this.depth>=4)return;
 const snapshot=[...this.units].sort((a,b)=>a.id-b.id).flatMap(u=>u.buffs.filter(b=>b.trig&&(e.only===undefined||e.only===b.key)).map(b=>({u,key:b.key})));
 for(const {u,key} of snapshot){
 const b=u.buffs.find(x=>x.key===key),t=b?.trig;if(!b||!t)continue;
 const subject=this.units.find(x=>x.id===e.subject);
 const code=[501,502,503].includes(e.code)||e.code>=1000||e.code<100||!subject||subject.id===u.id?e.code:e.code+(subject.camp===u.camp?100:200);
 const firingKey=u.id+':'+key;
 if(!t.events.includes(code)||(u.hp<=0&&!(e.subject===u.id&&[148,149,150,151].includes(e.code)))||(b.from===u.id&&hasTag(u,8))||this.firing.has(firingKey))continue;
 const target=e.subject===undefined||e.subject===u.id?e.other??0:e.subject;
 if(!limitOk(t,this.round,target)||(t.conds.length&&(!this.hooks.condition||!this.hooks.condition(u,e,t.conds))))continue;
 if(t.chance>0&&t.chance<1000&&this.hooks.random()*1000>=t.chance)continue;
 countFire(t,this.round,target);this.depth++;this.firing.add(firingKey);
 try{for(const effect of t.effects){if(effect[0]===127)removeBuff(u,key);else if(u.hp>0&&effect[0]===117){for(const k of Object.keys(u.cd))if(effect.length===1||effect.slice(1).includes(Number(k)))u.cd[Number(k)]=0}else if([111,601].includes(effect[0])){/* Reference discards the temporary property accumulator in fire(). */}else if(effect[0]===120||u.hp>0)this.hooks.execute(effect[0]===120?u:this.units.find(x=>x.id===b.from)??u,u,b,effect,e)}}finally{this.depth--;this.firing.delete(firingKey)}
 }
 }
 removeMatching(u:EffectUnit,kind:number,n:number,list:number[]){
 let left=n>0?n:Infinity;
 const matches=u.buffs.filter(b=>!b.temp&&(kind===116?list.includes(b.id):b.tags.some(t=>list.includes(t)))&&(kind!==113||dispellable(b)));
 for(const b of matches){if(left<=0)break;const stacks=b.stacks;if(kind===113)this.emit({code:2,subject:u.id,only:b.key});removeBuff(u,b.key,left);left-=stacks}
 }
 endRound(){
 const before=new Set(this.units.flatMap(u=>u.buffs.map(b=>u.id+':'+b.key)));
 this.emit({code:502});
 for(const u of [...this.units].sort((a,b)=>b.camp-a.camp||((a as EffectUnit&{station?:number}).station??a.id)-((b as EffectUnit&{station?:number}).station??b.id))){
 for(const b of [...u.buffs]){
 if(!before.has(u.id+':'+b.key)||u.hp<=0||!u.buffs.includes(b))continue;
 if(b.fresh)b.fresh=false;
 else if(b.rounds<=1){this.emit({code:1,subject:u.id,only:b.key});removeBuff(u,b.key)}
 else b.rounds--;
 }
 u.buffs=u.buffs.filter(b=>!b.temp);
 for(const k of Object.keys(u.cd))u.cd[Number(k)]=Math.max(u.cd[Number(k)]-1,0);
 }
 }
}
