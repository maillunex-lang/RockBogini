import React,{useCallback,useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import '../tower/tower.css';
import './secret.css';
type Rewards=[number,number][];
type State={floor:number;viewIndex:number;powerLevelId:number;expiresAt:string;resetAt:string;cells:number[][];props:number[][];hp:Record<string,number>;rewards:number[];finished:boolean;treasureFloor:boolean};
type Report={battleId:string;mapId:number;cellIndex:number;floor:number;summary:{resultCode:number};pages:unknown[];heroes:{heroId:number;camp:number;statDamage:number}[]};
type Result={battleId:string;result:number;rewards:Rewards;floor:number;cellIndex:number};
const propNames:Record<number,string>={1:'Яд',2:'Бомба',3:'Воскрешение',4:'Лечение',5:'Сигнальная ракета'};
const cellNames:Record<number,string>={1:'Пусто',2:'Монстр',3:'Хранитель',4:'Предмет',5:'Куст',6:'Портал'};
const itemLabel=(items:Rewards)=>items.length?items.map(([id,n])=>itemDisplayName(id)+' ×'+n.toLocaleString('ru-RU')).join(' · '):'Нет наград';
export function SecretScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [state,setState]=useState<State|null>(null);
 const [battle,setBattle]=useState<Report|null>(null);
 const [settled,setSettled]=useState<Result|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [chosen,setChosen]=useState<number|null>(null);
 const [propSlot,setPropSlot]=useState<number|null>(null);
 const request=useCallback(async<T,>(path:string,method:'GET'|'POST'='GET',body?:unknown):Promise<T>=>{
  const res=await fetch(api+'/v1/secret'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json() as T&{error?:string};
  if(!res.ok)throw Error(data.error??'secret_'+res.status);
  return data;
 },[api,token]);
 const load=useCallback(async()=>{const r=await request<State>('');setState(r);return r},[request]);
 useEffect(()=>{let mounted=true;load().catch(e=>{if(mounted)setMessage(String(e))});return()=>{mounted=false}},[load]);
 const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
 const reload=()=>void run(async()=>{await load()});
 const click=()=>void run(async()=>{if(chosen===null)return;setState(await request<State>('/click','POST',{index:chosen}));setChosen(null)});
 const challenge=()=>void run(async()=>{if(chosen===null)return;setBattle(await request<Report>('/challenge','POST',{index:chosen}));setSettled(null)});
 const settle=()=>void run(async()=>{if(!battle)return;const x=await request<Result>('/settle','POST',{battleId:battle.battleId});setSettled(x);setBattle(null);await load()});
 const cancel=()=>void run(async()=>{if(!battle)return;await request('/cancel','POST',{battleId:battle.battleId});setBattle(null)});
 const resume=()=>void run(async()=>{const p=await request<{report:Report|null}>('/pending');setBattle(p.report);if(!p.report)setMessage('Незавершённого боя нет')});
 const useProp=()=>void run(async()=>{
  if(propSlot===null)return;
  const type=state?.props[propSlot]?.[0];
  const body:Record<string,number>={slot:propSlot};
  if([1,2,5].includes(type??0)){if(chosen===null)throw Error('Выберите клетку карты');body.index=chosen;}
  const result=await request<State&{rewards?:Rewards}>('/use-prop','POST',body);
  setState(result);setMessage('Предмет применён. '+itemLabel(result.rewards??[]));setPropSlot(null);
 });
 const resurrect=()=>void run(async()=>{setState(await request<State>('/resurrect','POST',{}));setMessage('Герои восстановлены')});
 const treasure=(index:number)=>void run(async()=>{const r=await request<{rewards:Rewards}>('/treasure','POST',{index});setMessage('Сундук: '+itemLabel(r.rewards));await load()});
 const selected=chosen===null?null:state?.cells[chosen]??null;
 return <main className="tower-shell">
  <header className="tower-header"><div><small>RockBogini Next / PvE</small><h2>Секретная область</h2></div>
   <div className="tower-actions"><button disabled={busy} onClick={reload}>Обновить</button><button onClick={onClose}>В город</button></div>
  </header>
  {message&&<p role="status" className="tower-message">{message}</p>}
  {state&&<>
   <section className="tower-panel">
    <h3>{state.finished?'Исследование завершено':state.treasureFloor?'Сокровищница':'Этаж '+state.floor+' из 3'}</h3>
    <p>Период заканчивается: {new Date(state.expiresAt).toLocaleString('ru-RU')} · уровень силы монстров: {state.powerLevelId}</p>
    {!state.treasureFloor&&!state.finished&&<>
     <div className="secret-grid" aria-label="Карта Секретной области">
      {state.cells.map((c,i)=><button key={i}
       className={'secret-cell '+(chosen===i?'secret-selected ':'')+(c[3]===0?'secret-hidden':c[3]===2?'secret-fog':'secret-open')}
       title={c[3]===0?'Неизвестно':String(i)+': '+(cellNames[c[4]]??'Событие')}
       aria-label={'Клетка '+i+', '+(c[3]===0?'неизвестно':c[3]===2?'туман':cellNames[c[4]]??'событие')}
       aria-pressed={chosen===i} disabled={busy||c[3]===0} onClick={()=>setChosen(i)}>
       {c[3]===0?'':c[3]===2?'?':c[4]===2?'⚔':c[4]===3?'👑':c[4]===4?'🎁':c[4]===5?'🌿':c[4]===6?'🚪':'·'}
      </button>)}
     </div>
     <p>Выбрано: {chosen===null?'Ничего':chosen+', '+(selected?.[3]===2?'Открыть туман':cellNames[selected?.[4]??0]??'Событие')}</p>
     <div className="tower-actions">
      <button disabled={busy||!selected||!(selected[3]===2||(selected[3]===1&&[4,5,6].includes(selected[4])))} onClick={click}>Исследовать клетку</button>
      <button disabled={busy||!selected||selected[3]!==1||![2,3].includes(selected[4])} onClick={challenge}>⚔️ Сражаться</button>
      <button disabled={busy} onClick={resume}>Продолжить бой</button>
     </div>
     <h3>Предметы исследования</h3>
     <div className="tower-actions">{state.props.map(([type,count],i)=><button key={i} disabled={!type||!count||busy}
      aria-pressed={propSlot===i} onClick={()=>setPropSlot(propSlot===i?null:i)}>{type?(propNames[type]??'Предмет')+' ×'+count:'Пусто'}</button>)}</div>
     {propSlot!==null&&<div className="tower-actions"><button disabled={busy} onClick={useProp}>Использовать выбранный предмет</button></div>}
     <div className="tower-actions"><button disabled={busy} onClick={resurrect}>Воскресить героев за алмазы</button></div>
    </>}
    {state.treasureFloor&&<div className="tower-actions">{[0,1,2,3].map(i=><button key={i} disabled={busy||state.rewards[i]===1} onClick={()=>treasure(i)}>{state.rewards[i]?'Получено':'🎁 Сундук '+(i+1)}</button>)}</div>}
   </section>
  </>}
  {battle&&<section className="tower-panel">
   <h3>Бой · карта {battle.mapId}</h3>
   <p>{battle.summary.resultCode===2?'Победа':'Поражение'} · событий: {battle.pages.length}</p>
   <div className="tower-stats">{battle.heroes.map((h,i)=><div key={i}><strong>{h.camp===1?'Герой':'Монстр'} {h.heroId}</strong><span>Урон: {Number(h.statDamage??0).toLocaleString('ru-RU')}</span></div>)}</div>
   <div className="tower-actions"><button disabled={busy} onClick={settle}>Завершить бой</button><button disabled={busy} onClick={cancel}>Отменить</button></div>
  </section>}
  {settled&&<section className="tower-panel" role="status"><h3>{settled.result===1?'🏆 Победа':'Поражение'}</h3><p>{itemLabel(settled.rewards)}</p>
   <button onClick={()=>setSettled(null)}>Назад к карте</button></section>}
 </main>;
}
