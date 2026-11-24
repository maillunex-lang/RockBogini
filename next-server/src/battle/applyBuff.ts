import {battleAttr,effectiveAttr,immune,listener,maxCount,type Buff,type BuffConfig,type BuffUnit} from './buffs.js';
export type EffectUnit=BuffUnit&{id:number;camp:number;cd:Record<number,number>};
type AppliedBuff=Buff&{hpBonus?:number;shield?:number;cshield?:number;immunity?:boolean;ratioReduce?:number;flatReduce?:number;hurtLimit?:number;guard?:[number,number];dmgAddon?:[number,number[]][];hurtAddon?:[number,number[]][]};
const pairs=(p:number[]):[number,number][]=>Array.from({length:Math.floor(p.length/2)},(_,i)=>[p[i*2],p[i*2+1]]);
export function changeMaxHp(u:BuffUnit,delta:number){const max=Math.max(u.hp_max+delta,1);u.hp=u.hp>0?Math.min(max,Math.max(1,Math.trunc(u.hp*max/Math.max(u.hp_max,1)))):0;u.hp_max=max}
export function applyBuff(actor:EffectUnit,target:EffectUnit,cfg:BuffConfig,opts:{random:()=>number;key:()=>number;fresh:boolean;chance?:number;condition?:(rows:number[][])=>boolean;baseValue?:(param:number)=>number;instant?:(items:number[])=>void;allowRevive?:boolean;unchecked?:boolean}){
 const supported=new Set([601,111,371,345,117,405,411,412,413,501,502,504,602,603,122]);
 const unsupported=cfg.StartEffect.map(x=>x.Items[0]).filter(k=>k!==undefined&&!supported.has(k)&&!opts.instant);
 if(unsupported.length)return {status:'unsupported' as const,codes:unsupported};
 if(cfg.StartEffect.some(x=>x.Items[0]===501||(x.Items[0]===412&&x.Items.length>2))&&!opts.baseValue)return {status:'unsupported_base' as const};
 if(cfg.StartWorkCondition.length&&!opts.condition)return {status:'unsupported_condition' as const};
 let p=opts.chance||cfg.StartWorkChance||1000;
 if(cfg.Tags.includes(3)&&actor.camp!==target.camp)p+=effectiveAttr(actor,6)-effectiveAttr(target,7);
 if(!opts.unchecked&&(p<=0||(p<1000&&opts.random()*1000>=p)||(target.hp<=0&&!opts.allowRevive)||immune(target,cfg)|| (cfg.StartWorkCondition.length&&!opts.condition!(cfg.StartWorkCondition.map(x=>x.Items)))))return {status:'blocked' as const};
 const bonus:Record<string,number>={},temp:Record<string,number>={},im:number[]=[],dyn:NonNullable<Buff['dyn']>=[];
 const props:Partial<AppliedBuff>={};let replacement:number|undefined;
 const add=(dest:Record<string,number>,ps:[number,number][])=>{for(const [k,v] of ps){const [a,d]=battleAttr(target.attrs,k,v);dest[a]=(dest[a]??0)+d}};
 for(const {Items:[code,...ps]} of cfg.StartEffect){
 if(code===601){const pp:[number,number][]=ps.length&&ps.length%3===0?Array.from({length:ps.length/3},(_,i)=>{const [a,v,m]=ps.slice(i*3,i*3+3);return [a>=0&&a<=3&&m===1?104+a:a,v]}):pairs(ps);add(bonus,pp)}
 else if(code===111)add(temp,pairs(ps));
 else if(code===371)im.push(...ps);
 else if(code===345)dyn.push({step:ps[0],pairs:pairs(ps.slice(1))});
 else if(code===117){for(const k of Object.keys(target.cd))if(!ps.length||ps.includes(Number(k)))target.cd[Number(k)]=0;}
 else if(code===405)props.hurtLimit=ps[0];
 else if(code===411)props.guard=[ps[0],ps[1]??0];
 else if(code===412)props.flatReduce=Math.trunc((ps.length>1?opts.baseValue!(ps[1]):effectiveAttr(actor,0))*ps[0]/1000);
 else if(code===413)props.ratioReduce=ps[0];
 else if(code===501)props.shield=(props.shield??0)+Math.trunc(opts.baseValue!(ps[1])*ps[0]/1000);
 else if(code===502)props.cshield=(props.cshield??0)+ps[0];
 else if(code===504)props.immunity=true;
 else if(code===602)(props.dmgAddon??=[]).unshift([ps[0],ps.slice(1)]);
 else if(code===603)(props.hurtAddon??=[]).unshift([ps[0],ps.slice(1)]);
 else if(code===122)replacement=ps[0];
 else opts.instant?.([code,...ps]);
 }
 if(target.hp<=0)return {status:"applied" as const,added:0};
 if(cfg.Round<=0){if(Object.keys(temp).length)target.buffs.push({id:cfg.Id,key:opts.key(),rounds:0,stacks:1,max:1,attrs:temp,tags:[],from:actor.id,temp:true});return {status:'applied' as const,added:0}}
 for(const [k,v] of Object.entries(temp))bonus[k]=(bonus[k]??0)+v;
 const hpBonus=bonus[1]??0;delete bonus[1];
 const old=target.buffs.find(b=>b.id===cfg.Id&&!b.temp) as AppliedBuff|undefined,max=maxCount(cfg);
 let added=1;
 if(old){const stacks=Math.min(old.stacks+1,max);added=stacks-old.stacks;old.stacks=stacks;old.fresh=old.fresh||(cfg.Round>=old.rounds&&opts.fresh);old.rounds=Math.max(old.rounds,cfg.Round);old.from=actor.id;const shield=(old.shield??0)+(props.shield??0),cshield=(old.cshield??0)+(props.cshield??0);Object.assign(old,props);if(shield)old.shield=shield;if(cshield)old.cshield=cshield;if(im.length)old.immune=im;if(dyn.length)old.dyn=dyn}
 else {const b:AppliedBuff={...props,id:cfg.Id,key:opts.key(),rounds:cfg.Round,stacks:1,max,attrs:bonus,tags:cfg.Tags,from:actor.id,fresh:opts.fresh,trig:listener(cfg),immune:im,dyn,hpBonus};target.buffs.push(b)}
 if(hpBonus&&added>0)changeMaxHp(target,hpBonus*added);
 return {status:'applied' as const,added,replacement};
}
export function removeBuff(u:BuffUnit,key:number,count=Infinity){const b=u.buffs.find(x=>x.key===key) as AppliedBuff|undefined;if(!b||count<=0)return false;const n=Math.min(count,b.stacks);if(n===b.stacks)u.buffs=u.buffs.filter(x=>x.key!==key);else b.stacks-=n;if(b.hpBonus&&u.hp>0)changeMaxHp(u,-b.hpBonus*n);return true}
