/** Original PveAbyss.buffed/heal/pick_buff rules from the inspected read-only Elixir handler. */
import {abyssBuff,abyssBuffs} from './abyssConfig.js';
import {actionSkills} from './battle/actionData.js';
import {skillConfig} from './unitConfig.js';
import type {Fighter} from './battle/simulation.js';
export function applyAbyssBuffs(unit:Fighter,buffIds:readonly number[]):Fighter{
 const source=unit as Fighter&{skills?:number[]};
 const u={...unit,attrs:{...unit.attrs},skills:[...source.skills??[]],actives:[...unit.actives],
  passives:[...unit.passives??[]],cd:{...unit.cd}};
 const known=new Set([...u.skills,...u.actives,...u.passives]);
 for(const id of buffIds){
  const cfg=abyssBuff(id);
  if(!cfg)throw Error('abyss_buff_unknown');
  if(cfg.type===3)for(const [attr,value] of cfg.attrs){
   // Elixir original maps a<100 to attr a; a<200 to attr a-100;
   // IDs >=200 (e.g. original buff #6, attr205) are deliberately ignored.
   if(!Number.isSafeInteger(attr)||!Number.isSafeInteger(value))throw Error('abyss_buff_data_invalid');
   const target=attr<100?attr:attr<200?attr-100:-1;
   if(target>=0)u.attrs[target]=(u.attrs[target]??0)+value;
  }
  if(cfg.type===2)for(const [sid] of cfg.attrs){
   if(!actionSkills[sid]||!skillConfig[sid]||known.has(sid))continue;
   known.add(sid);
   u.skills.push(sid);
   // Original source adds the skill to unit.skills; this combat engine
   // separates battle-time passive hooks from active cooldown skills.
   if(skillConfig[sid].active){
    u.actives.push(sid);u.cd[sid]=skillConfig[sid].start;
   }
   if(skillConfig[sid].passive)u.passives.push(sid);
  }
 }
 return u;
}
export function abyssBuffOptions(owned:readonly number[],randomIndex:(max:number)=>number):number[]{
 const available=Object.values(abyssBuffs).filter(x=>x.count!==1||!owned.includes(x.id));
 // Original offers 3 distinct buffs, Count=1 excludes already taken skills.
 for(let i=available.length-1;i>0;i--){
  const j=randomIndex(i+1);
  if(!Number.isInteger(j)||j<0||j>i)throw Error('invalid_random_index');
  [available[i],available[j]]=[available[j],available[i]];
 }
 return available.slice(0,3).map(x=>x.id);
}
export function abyssHeal(hp:Readonly<Record<string,number>>,roster:readonly Fighter[],per:number):Record<string,number>{
 if(!Number.isSafeInteger(per)||per<0)throw Error('abyss_heal_invalid');
 const maxBySid=new Map(roster.map(u=>[String((u as Fighter&{sid?:number}).sid??0),u.hp_max]));
 const next={...hp};
 for(const [sid,current] of Object.entries(hp)){
  const maximum=maxBySid.get(sid);
  // Elixir original heals only the stored HP entries, and never revives dead units.
  if(maximum===undefined||current<=0)continue;
  next[sid]=Math.min(maximum,current+Math.floor(maximum*per/1000));
 }
 return next;
}
