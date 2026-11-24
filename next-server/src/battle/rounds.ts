export type RoundUnit={id:number;camp:1|-1;station:number;hp:number;attrs:Record<string,number>};
export type Outcome='attacker_win'|'defender_win'|'timeout';
export type RoundEvent={kind:'round_start'|'turn'|'round_end';round:number;actor?:number};
export function winner(units:readonly RoundUnit[]):Outcome|null{
 if(!units.some(u=>u.camp===-1&&u.hp>0))return 'attacker_win';
 if(!units.some(u=>u.camp===1&&u.hp>0))return 'defender_win';
 return null;
}
export function turnOrder(units:readonly RoundUnit[],speed:(u:RoundUnit)=>number=u=>u.attrs[3]??0){
 return units.filter(u=>u.hp>0).sort((a,b)=>speed(b)-speed(a)||b.camp-a.camp||a.station-b.station).map(u=>u.id);
}
export function runRounds<T extends RoundUnit>(input:readonly T[],maxRounds:number,hooks:{start?:(units:T[],round:number)=>void;action:(units:T[],actor:T,round:number)=>void;end?:(units:T[],round:number)=>void;speed?:(u:RoundUnit)=>number}){
 if(!Number.isSafeInteger(maxRounds)||maxRounds<1)throw Error('invalid_round_limit');
 if(new Set(input.map(u=>u.id)).size!==input.length||!input.some(u=>u.camp===1)||!input.some(u=>u.camp===-1))throw Error('invalid_battle_units');
 const units=structuredClone([...input]),events:RoundEvent[]=[];
 for(let round=1;round<=maxRounds;round++){
 hooks.start?.(units,round);
 const order=turnOrder(units,hooks.speed);
 events.push({kind:'round_start',round});
 for(const id of order){
 if(winner(units))break;
 const actor=units.find(u=>u.id===id);
 if(!actor||actor.hp<=0)continue;
 events.push({kind:'turn',round,actor:id});hooks.action(units,actor,round);
 }
 hooks.end?.(units,round);events.push({kind:'round_end',round});
 const result=winner(units)??(round===maxRounds?'timeout':null);
 if(result)return {units,events,result,rounds:round};
 }
 throw Error('unreachable');
}
