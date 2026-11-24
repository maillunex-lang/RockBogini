import type {Outcome} from './rounds.js';
import type {Fighter} from './simulation.js';
export const resultCodes:Record<Outcome,2|3|4>={attacker_win:2,defender_win:3,timeout:4};
export function summarizeBattle(units:readonly Fighter[],result:Outcome,rounds:number){
 const heroes=[...units].sort((a,b)=>a.id-b.id).map(u=>({id:u.id,camp:u.camp,station:u.station,hp:u.hp,hpMax:u.hp_max,isDead:u.hp<=0,damage:u.damage,hurt:u.hurt,healing:u.cure,buffs:u.buffs.filter(b=>!b.temp).map(b=>({id:b.id,count:b.stacks}))}));
 const team=(camp:1|-1)=>{const h=heroes.filter(u=>u.camp===camp);return {camp,total:h.length,alive:h.filter(u=>!u.isDead).length,dead:h.filter(u=>u.isDead).length,damage:h.reduce((n,u)=>n+u.damage,0),hurt:h.reduce((n,u)=>n+u.hurt,0),healing:h.reduce((n,u)=>n+u.healing,0),hp:h.reduce((n,u)=>n+u.hp,0),hpMax:h.reduce((n,u)=>n+u.hpMax,0)}};
 return {version:1,result,resultCode:resultCodes[result],winnerCamp:result==='timeout'?null:result==='attacker_win'?1:-1,rounds,heroes,attacker:team(1),defender:team(-1)};
}
