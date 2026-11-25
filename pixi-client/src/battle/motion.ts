import {fieldPosition,fieldWidth,fieldHeight} from './fieldLayout';
export type Point={x:number;y:number};
export function moveDestination(reference:number,target:{stationId:number;camp:number}|undefined,camp:number,distance:number):Point{
 let p:Point={x:fieldWidth/2,y:fieldHeight/2+260};
 if(target){if(reference===2)p=fieldPosition(target.stationId,target.camp);else if(reference===3||reference===4)p=fieldPosition(4,target.camp);else if(reference===5)p=fieldPosition(target.stationId%3,target.camp)}
 return {x:p.x-distance*camp,y:p.y};
}
export function motionSample(from:Point,to:Point,progress:number,back:boolean,blink:boolean){
 const t=Math.max(0,Math.min(1,progress));
 if(blink)return {...(t<2/3?from:to),alpha:t<1/3?1-3*t:t<2/3?0:3*t-2};
 const q=back?1-(1-t)**4:t**4;
 return {x:from.x+(to.x-from.x)*q,y:from.y+(to.y-from.y)*q,alpha:1};
}
/** Original ActionIndex is 1-based. Returns -1 when missing/out of range so callers skip playback. */
export function timelineIndex(actionIndex:number,skillCount?:number){
 const i=actionIndex-1;
 if(actionIndex<=0||i<0)return -1;
 if(skillCount!==undefined&&i>=skillCount)return -1;
 return i;
}
