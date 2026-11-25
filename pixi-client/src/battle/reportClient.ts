export type BattleEvent={index:number;target:number;type:number;value:number;params?:number[]};
export type HeroStatus={id:number;hp:number;hpMax:number;isDead:boolean;buffs:{id:number;count:number}[]};
export type BattlePage={dataType:number;round:number;actor:number;skillId:number;targets:number[];hits:number;events:BattleEvent[];heroStatus:HeroStatus[]};
export type BattleReport={version:1;battleId:string;mapId:number;background:string;preview:boolean;heroes:({heroId:number;camp:number;stationId:number;model:string;statDamage?:number;statHurt?:number;statCure?:number}&HeroStatus)[];initialUnits:{id:number;model:string}[];pages:BattlePage[];summary:{resultCode:number;rounds:number}};
export type Settlement={battleId:string;result:number;rewards:number[][];stage:number;level:number;mapId?:number;unlockedModules?:number[];playerLevel?:number};
/** Hit-point order: index asc; same index keeps Revive(7) before Cure(5/22) like server emit order. */
export function orderedEvents(page:BattlePage){
 const rank=(t:number)=>t===7?0:HEAL_TYPES.has(t)?1:2;
 return [...page.events].sort((a,b)=>a.index-b.index||rank(a.type)-rank(b.type));
}
const HEAL_TYPES=new Set([5,22]);
export function validateReport(value:unknown):BattleReport{
 const r=value as BattleReport;
 if(!r||r.version!==1||typeof r.battleId!=='string'||!Array.isArray(r.heroes)||!Array.isArray(r.pages)||!r.summary)throw Error('Некорректный боевой отчёт');
 const ids=new Set(r.heroes.map(h=>h.id));
 for(const p of r.pages)if(![1,2,3].includes(p.dataType)||!Array.isArray(p.events)||!Array.isArray(p.heroStatus)||p.heroStatus.some(h=>!ids.has(h.id))||p.events.some(e=>!ids.has(e.target)))throw Error('Некорректное событие боя');
 return {...r,heroes:r.heroes.map(h=>{
  const model=String(r.initialUnits.find(u=>u.id===h.id)?.model??h.model??'');
  return {...h,model,hp:h.hp??0,hpMax:h.hpMax??h.hp??0,isDead:h.isDead??h.hp<=0,buffs:Array.isArray(h.buffs)?h.buffs:[]};
 })};
}
export function battleClient(api:string,token:string){
 async function request(path:string,body?:object){const res=await fetch(api.replace(/\/$/,'')+'/v1/battle/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(!res.ok)throw Error('Ошибка сервера: '+res.status);return res.json()}
 return {pending:async()=>{const r=await request('pending');return r.report?validateReport(r.report):null},challenge:async(mapId:number)=>validateReport(await request('challenge',{mapId})),settle:async(battleId:string):Promise<Settlement>=>request('settle',{battleId}),cancel:async(battleId:string)=>request('cancel',{battleId})};
}
