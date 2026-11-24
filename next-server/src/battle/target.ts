import type {RoundUnit} from './rounds.js';
export type TargetUnit=RoundUnit&{hp_max:number};
export type TargetSpec={TargetType?:number;TargetSide?:number;TargetCount?:number;TargetPriority?:number[]};
const row=(s:number)=>Math.floor(s/3),col=(s:number)=>s%3;
export function selectTargets(units:readonly TargetUnit[],actor:TargetUnit,spec:TargetSpec,previous:readonly number[]=[],random?:()=>number):number[]{
 const t=spec.TargetType??0,camp=spec.TargetSide===1?actor.camp:-actor.camp;
 let pool=units.filter(u=>u.camp===camp&&(t===13?u.hp<=0:t===14||u.hp>0));
 const rows=(p:TargetUnit[],n:number,back=false)=>{const r=[...new Set(p.map(u=>row(u.station)))].sort((a,b)=>back?b-a:a-b).slice(0,n);return p.filter(u=>r.includes(row(u.station)))};
 const fixed=(wanted:number[])=>{const p=pool.filter(u=>wanted.includes(row(u.station)));return p.length?p:rows(pool,wanted.length)};
 const nearest=(p:TargetUnit[])=>[...p].sort((a,b)=>Math.abs(col(a.station)-col(actor.station))-Math.abs(col(b.station)-col(actor.station))||a.station-b.station);
 const neighbors=(stations:number[])=>pool.filter(u=>stations.some(s=>Math.abs(row(s)-row(u.station))<=1&&Math.abs(col(s)-col(u.station))<=1));
 switch(t){
 case 1:pool=[actor];break;
 case 2:case 3:pool=pool.filter(u=>previous.includes(u.id));break;
 case 4:pool=pool.filter(u=>!previous.includes(u.id));break;
 case 6:pool=neighbors(units.filter(u=>previous.includes(u.id)).map(u=>u.station));break;
 case 12:pool=pool.filter(u=>u.id!==actor.id);break;
 case 15:pool=neighbors([actor.station]);break;
 case 21:pool=nearest(rows(pool,1)).slice(0,1);break;
 case 22:pool=rows(pool,1);break;
 case 23:pool=rows(pool,2);break;
 case 24:pool=rows(pool,1,true);break;
 case 25:pool=rows(pool,2,true);break;
 case 26:{const first=nearest(pool)[0];pool=first?pool.filter(u=>col(u.station)===col(first.station)):[];break}
 case 27:{const counts=[0,0,0];for(const u of pool)counts[col(u.station)]++;const c=counts.indexOf(Math.max(...counts));pool=pool.filter(u=>col(u.station)===c);break}
 case 31:case 32:case 33:pool=fixed([t-31]);break;
 case 34:pool=fixed([0,1]);break;
 case 35:pool=fixed([1,2]);break;
 }
 const priority=spec.TargetPriority?.[0]??0;
 if(priority===1){if(!random)throw Error('random_source_required');pool=pool.map(u=>({u,key:random()})).sort((a,b)=>a.key-b.key||a.u.id-b.u.id).map(x=>x.u)}
 else pool.sort((a,b)=>{
 const d=priority===2?(b.attrs[0]??0)-(a.attrs[0]??0):priority===3?a.hp/Math.max(a.hp_max,1)-b.hp/Math.max(b.hp_max,1):priority===7?(b.attrs[3]??0)-(a.attrs[3]??0):row(a.station)-row(b.station)||Math.abs(col(a.station)-col(actor.station))-Math.abs(col(b.station)-col(actor.station));
 return d||a.station-b.station;
 });
 return (spec.TargetCount&&spec.TargetCount>0?pool.slice(0,spec.TargetCount):pool).map(u=>u.id);
}

export type TargetEvent={subject?:number;other?:number;targets?:number[]};
export function eventTargets(units:readonly TargetUnit[],actor:TargetUnit,spec:TargetSpec,event:TargetEvent,random:()=>number):number[]{
 if(spec.TargetType!==2&&spec.TargetType!==7)return selectTargets(units,actor,spec,event.targets??[],random);
 const first=spec.TargetType===7?[event.subject,event.other]:[event.other,event.subject];
 const ids=[...new Set([...first,...(event.targets??[])])].filter((id):id is number=>id!==undefined&&units.some(u=>u.id===id&&u.hp>0&&(spec.TargetSide===1?u.camp===actor.camp:u.camp!==actor.camp)));
 return (spec.TargetCount??0)>0?ids.slice(0,spec.TargetCount):ids;
}
