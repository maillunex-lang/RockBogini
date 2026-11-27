import React,{useCallback,useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import '../tower/tower.css';
type Rewards=[number,number][];
type Window={open:boolean;startTime:string|null;endTime:string|null;reason:string|null};
type State={id:number;name:string;window:Window;clearedStage:number;attempts:number;maxAttempts:number;remainingAttempts:number;rank:number;
 bonus:{drop:number;attribute:number};nextStage:{id:number;mapId:number;recommendPower:number;rewards:Rewards;bg:string;battlePower:number}|null;
 canChallenge:boolean;canQuick:boolean};
type Formation={heroIds:number[];formationType:number;sid:number;usesMainFallback:boolean;
 layouts:{id:number;positions:number[]}[];heroOptions:{sid:number;heroId:number;power:number;star:number}[]};
type Report={battleId:string;stage:number;mapId:number;summary:{resultCode:number};pages:unknown[]};
type Result={rewards:Rewards;result?:number;stage:number};
const rewards=(r:Rewards)=>r?.length?r.map(([id,n])=>itemDisplayName(id)+' ×'+n.toLocaleString('ru-RU')).join(' · '):'Нет наград';
export function HeroDungeonScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [state,setState]=useState<State|null>(null);
 const [form,setForm]=useState<Formation|null>(null);
 const [ids,setIds]=useState<number[]>([0,0,0,0,0,0]);
 const [type,setType]=useState(101);
 const [dirty,setDirty]=useState(false);
 const [quickStage,setQuickStage]=useState(1);
 const [battle,setBattle]=useState<Report|null>(null);
 const [result,setResult]=useState<Result|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const request=useCallback(async<T,>(path:string,method:'GET'|'POST'|'PUT'='GET',body?:unknown):Promise<T>=>{
  const res=await fetch(api+'/v1/hero-dungeon'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json() as T&{error?:string};
  if(!res.ok)throw Error(data.error??'hero_dungeon_'+res.status);
  return data;
 },[api,token]);
 const load=useCallback(async()=>{
  const [s,f]=await Promise.all([request<State>(''),request<Formation>('/formation')]);
  setState(s);setForm(f);setIds(f.heroIds);setType(f.formationType);setDirty(false);
  setQuickStage(x=>Math.max(1,Math.min(x,Math.max(1,s.clearedStage))));
 },[request]);
 useEffect(()=>{load().catch(e=>setMessage(String(e)))},[load]);
 const run=(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');
  void fn().catch(e=>setMessage(e instanceof Error?e.message:String(e))).finally(()=>setBusy(false));};
 const save=()=>run(async()=>{
  await request('/formation','PUT',{heroIds:ids,formationType:type});
  setMessage(ids.some(Boolean)?'Отряд сохранён':'Включён основной отряд');
  await load();
 });
 const reset=()=>run(async()=>{
  await request('/formation','PUT',{heroIds:[0,0,0,0,0,0],formationType:101});
  await load();setMessage('Теперь используется основной отряд');
 });
 const start=()=>run(async()=>{
  if(!state?.nextStage||dirty)return;
  setBattle(await request<Report>('/challenge','POST',{stage:state.nextStage.id}));setResult(null);
 });
 const settle=()=>run(async()=>{
  if(!battle)return;
  const r=await request<Result>('/settle','POST',{battleId:battle.battleId});
  setResult(r);setBattle(null);await load();
 });
 const cancel=()=>run(async()=>{
  if(!battle)return;await request('/cancel','POST',{battleId:battle.battleId});setBattle(null);await load();
 });
 const resume=()=>run(async()=>{
  const r=await request<{report:Report|null}>('/pending');setBattle(r.report);
  if(!r.report)setMessage('Незавершённого боя нет');
 });
 const quick=()=>run(async()=>{
  const r=await request<Result>('/quick','POST',{stage:quickStage});
  setResult(r);await load();
 });
 return <main className="tower-shell">
  <header className="tower-header"><div><small>RockBogini Next / PvE</small><h2>Подземелье героев</h2></div>
   <div className="tower-actions"><button disabled={busy} onClick={()=>run(load)}>Обновить</button><button onClick={onClose}>В город</button></div>
  </header>
  {message&&<p role="status" className="tower-message">{message}</p>}
  {state&&!battle&&<section className="tower-panel">
   <h3>Оригинальное событие №{state.id}</h3>
   <p>{state.window.open?'Событие доступно':'Событие закрыто: '+(state.window.reason??'расписание')}</p>
   <p>Период: {state.window.startTime?new Date(state.window.startTime).toLocaleString('ru-RU'):'неизвестен'}
    {' → '}{state.window.endTime?new Date(state.window.endTime).toLocaleString('ru-RU'):'неизвестен'}</p>
   <p>Пройдено этапов: {state.clearedStage}/35 · Попытки: {state.remainingAttempts}/{state.maxAttempts}
    {' · '}Рейтинг: {state.rank.toLocaleString('ru-RU')}</p>
   <p>Бонус награды: +{state.bonus.drop/10}% · Изменение характеристик: {state.bonus.attribute/10}%</p>
   {state.nextStage&&<><h3>Следующий этап #{state.nextStage.id}</h3>
    <p>Карта {state.nextStage.mapId} · рекомендуемая мощность {state.nextStage.recommendPower.toLocaleString('ru-RU')}</p>
    <p>Награды: {rewards(state.nextStage.rewards)}</p></>}
   <div className="tower-actions">
    <button disabled={busy||!state.canChallenge||dirty} onClick={start}>⚔️ Начать бой</button>
    <button disabled={busy} onClick={resume}>Продолжить бой</button>
   </div>
   {state.clearedStage>0&&<div className="tower-quick">
    <label>Пройденный этап для быстрой зачистки
     <input type="number" min={1} max={state.clearedStage} value={quickStage}
      onChange={e=>setQuickStage(Number(e.target.value))}/>
    </label>
    <button disabled={busy||!state.canQuick||quickStage<1||quickStage>state.clearedStage||!Number.isInteger(quickStage)}
     onClick={quick}>Быстрая зачистка</button>
   </div>}
  </section>}
  {form&&!battle&&<section className="tower-panel">
   <h3>Отряд подземелья · Sid {form.sid}</h3>
   <p>{form.usesMainFallback?'Используется основной отряд':'Используется отдельный отряд'} · выбранные герои не меняют основной состав</p>
   <label>Построение
    <select value={type} disabled={busy} onChange={e=>{setType(Number(e.target.value));setDirty(true)}}>
     {form.layouts.map(f=><option key={f.id} value={f.id}>Построение {f.id}</option>)}
    </select>
   </label>
   <div className="tower-formation-grid">
    {[0,1,2,3,4,5].map(i=><label key={i}>
     Позиция {form.layouts.find(f=>f.id===type)?.positions[i]??i+1}
     <select value={ids[i]??0} aria-label={'Герой подземелья '+(i+1)} disabled={busy}
      onChange={e=>{const sid=Number(e.target.value);setIds(old=>old.map((v,n)=>n===i?sid:sid>0&&v===sid?0:v));setDirty(true)}}>
      <option value={0}>Не выбран</option>
      {form.heroOptions.map(h=><option key={h.sid} value={h.sid}>#{h.sid} · герой {h.heroId} · {h.star}★</option>)}
     </select>
    </label>)}
   </div>
   <div className="tower-actions"><button disabled={busy||!dirty} onClick={save}>Сохранить отряд</button>
    <button disabled={busy||form.usesMainFallback&&!dirty} onClick={reset}>Вернуть основной отряд</button></div>
  </section>}
  {battle&&<section className="tower-panel"><h3>⚔️ Бой за этап {battle.stage}</h3>
   <p>Карта {battle.mapId} · результат {battle.summary.resultCode} · событий {battle.pages.length}</p>
   <div className="tower-actions"><button disabled={busy} onClick={settle}>Завершить бой</button>
    <button disabled={busy} onClick={cancel}>Отменить</button></div>
  </section>}
  {result&&<section className="tower-panel" role="status"><h3>Результат этапа #{result.stage}</h3>
   <p>Награды: {rewards(result.rewards)}</p><button onClick={()=>setResult(null)}>Закрыть</button>
  </section>}
 </main>;
}
