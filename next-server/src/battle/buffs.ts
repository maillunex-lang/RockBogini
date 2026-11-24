type Items={Items:number[]};
export type BuffConfig={Id:number;Round:number;MaxCount:number;Tags:number[];StartEffect:Items[];StartWorkChance:number;StartWorkCondition:Items[];TriggerCondition:Items[];TriggerWorkCondition:Items[];TriggerEffect:Items[]};
export type EffectConfig={Id:number;BuffList:Items[];TargetSide:number;TargetType:number;TargetCount:number;TargetPriority:number[];WorkChance:number;WorkCondition:Items[];ChildEffects:number[]};
export type Listener={events:number[];chance:number;total:number;cd:number;perRound:number;perTarget:number;conds:number[][];effects:number[][];fired:number;last:number|null;rounds:Record<number,number>;targets:Record<string,number>};
export type Buff={id:number;key:number;rounds:number;stacks:number;max:number;attrs:Record<string,number>;tags:number[];from:number;immune?:number[];temp?:boolean;fresh?:boolean;dyn?:{step:number;pairs:[number,number][]}[];trig?:Listener|null};
export type BuffUnit={attrs:Record<string,number>;hp:number;hp_max:number;buffs:Buff[]};
export function battleAttr(attrs:Record<string,number>,k:number,v:number):[number,number]{if((k>=100&&k<=117)||(k>=200&&k<=217)){const i=k%10;if(i<=3)return [i,v];if(i<=7)return [i-4,Math.trunc((attrs[i-4]??0)*v/1000)]}return [k,v]}
export function effectiveAttr(u:BuffUnit,k:number){let v=u.attrs[k]??0;for(const b of u.buffs){v+=(b.attrs[k]??0)*b.stacks;for(const d of b.dyn??[]){const lost=Math.trunc(Math.max(u.hp_max-u.hp,0)*1000/Math.max(u.hp_max,1)),n=d.step>0?Math.trunc(lost/d.step):0;for(const [a,x] of d.pairs){const [key,value]=battleAttr(u.attrs,a,x*n);if(key===k)v+=value}}}return v}
export const hasTag=(u:BuffUnit,t:number)=>u.buffs.some(b=>b.tags.includes(t));
export const tagCount=(u:BuffUnit,t:number)=>u.buffs.reduce((n,b)=>n+(b.tags.includes(t)?b.stacks:0),0);
export const layers=(u:BuffUnit,id:number)=>u.buffs.reduce((n,b)=>n+(b.id===id?b.stacks:0),0);
export const immune=(u:BuffUnit,c:BuffConfig)=>!c.Tags.includes(25)&&u.buffs.some(b=>b.immune?.some(t=>c.Tags.includes(t)));
export const dispellable=(b:Buff)=>!b.tags.includes(1);
export const holdAfterDeath=(b:Buff)=>b.tags.includes(2);
export const maxCount=(c:BuffConfig)=>c.MaxCount>0?c.MaxCount:99;
export function listener(c:BuffConfig):Listener|null{if(!c.TriggerCondition.length)return null;const l=c.TriggerCondition[1]?.Items??[];return {events:c.TriggerCondition[0].Items,chance:l.length?l[0]:1000,total:l[1]??0,cd:l[2]??0,perRound:l[3]??0,perTarget:l[4]??0,conds:c.TriggerWorkCondition.map(x=>x.Items),effects:c.TriggerEffect.map(x=>x.Items),fired:0,last:null,rounds:{},targets:{}}}
export function limitOk(t:Listener,r:number,target:number){return (t.total<=0||t.fired<t.total)&&(t.cd<=0||t.last===null||r>=t.last+t.cd)&&(t.perRound<=0||(t.rounds[r]??0)<t.perRound)&&(t.perTarget<=0||(t.targets[r+':'+target]??0)<t.perTarget)}
export function countFire(t:Listener,r:number,target:number){t.fired++;t.last=r;t.rounds[r]=(t.rounds[r]??0)+1;const k=r+':'+target;t.targets[k]=(t.targets[k]??0)+1}
export function expireRound(u:BuffUnit,existing:ReadonlySet<number>){const expired:Buff[]=[];u.buffs=u.buffs.filter(b=>{if(!existing.has(b.key)||u.hp<=0)return true;if(b.fresh){b.fresh=false;return true}if(b.rounds<=1){expired.push(b);return false}b.rounds--;return true});return expired}
export function dropTemp(u:BuffUnit){u.buffs=u.buffs.filter(b=>!b.temp)}
