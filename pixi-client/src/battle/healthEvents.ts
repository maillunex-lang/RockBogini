import type {BattleEvent,HeroStatus} from './reportClient';

const DAMAGE=new Set([1,2,3,8,21]);
const HEAL=new Set([5,22]);

/** Intermediate HP/buff reconciliation from original AJBattleViewPort hit events. */
export function applyHealth(h:HeroStatus,e:BattleEvent):HeroStatus{
 let hp=h.hp;
 let isDead=h.isDead;
 let buffs=h.buffs.map(b=>({...b}));
 if(DAMAGE.has(e.type))hp-=Math.abs(e.value);
 else if(HEAL.has(e.type))hp+=Math.abs(e.value);
 else if(e.type===27){hp=0;isDead=true}
 else if(e.type===7){isDead=false}
 else if(e.type===25){
  const id=e.value;const cur=buffs.find(b=>b.id===id);
  if(cur)cur.count+=1;else buffs.push({id,count:1});
 }else if(e.type===26){
  const id=e.value;const cur=buffs.find(b=>b.id===id);
  if(cur){cur.count-=1;if(cur.count<=0)buffs=buffs.filter(b=>b.id!==id)}
 }
 // Types 4/6/28 (shield, dodge, shield-sp) intentionally leave HP unchanged.
 return {...h,hp:Math.max(0,Math.min(h.hpMax,hp)),isDead,buffs};
}
