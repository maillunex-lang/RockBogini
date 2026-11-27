import React,{useCallback,useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import '../tower/tower.css';
type Rewards=[number,number][];
type Event={id:number;name:string;element:number;sid:number;window:{open:boolean;startTime:string;endTime:string|null;reason:string|null};
 clearedStage:number;rank:number;maximumStages:number;selectedPower:number;
 nextStage:{id:number;mapId:number;recommendPower:number;quickPower:number;heroId:number;rewards:Rewards;bg:string}|null;
 canChallenge:boolean;quickEnd:number;canQuick:boolean};
type Formation={heroIds:number[];formationType:number;sid:number;usesMainFallback:boolean;
 layouts:{id:number;positions:number[]}[];heroOptions:{sid:number;heroId:number;power:number;star:number}[]};
type Report={battleId:string;stage:number;mapId:number;eventId:number;summary:{resultCode:number};pages:unknown[]};
type Result={rewards:Rewards;result?:number;stage?:number;clearedStage?:number};
const rewards=(r:Rewards)=>r?.length?r.map(([id,n])=>itemDisplayName(id)+' ×'+n.toLocaleString('ru-RU')).join(' · '):'Нет наград';
export function ElementTestScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [events,setEvents]=useState<Event[]>([]);
 const [chosen,setChosen]=useState(15792);
 const [form,setForm]=useState<Formation|null>(null);
 const [ids,setIds]=useState<number[]>([0,0,0,0,0,0]);
 const [type,setType]=useState(101);
 const [dirty,setDirty]=useState(false);
 const [end,setEnd]=useState(1);
 const [battle,setBattle]=useState<Report|null>(null);
 const [result,setResult]=useState<Result|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const current=events.find(e=>e.id===chosen);
 const request=useCallback(async<T,>(path:string,method:'GET'|'POST'|'PUT'='GET',body?:unknown):Promise<T>=>{
  const res=await fetch(api+'/v1/element-test'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json() as T&{error?:string};
  if(!res.ok)throw Error(data.error??'element_test_'+res.status);
  return data;
 },[api,token]);
 const load=useCallback(async()=>{
  const [e,f]=await Promise.all([request<{events:Event[]}>(''),request<Formation>('/formation/'+chosen)]);
  setEvents(e.events);setForm(f);setIds(f.heroIds);setType(f.formationType);setDirty(false);
  const c=e.events.find(v=>v.id===chosen);
  if(c)setEnd(Math.max(c.clearedStage+1,c.quickEnd));
 },[request,chosen]);
 useEffect(()=>{load().catch(e=>setMessage(String(e)))},[load]);
 const run=(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');
  void fn().catch(e=>setMessage(e instanceof Error?e.message:String(e))).finally(()=>setBusy(false));};
 const save=()=>run(async()=>{
  await request('/formation','PUT',{eventId:chosen,heroIds:ids,formationType:type});
  await load();setMessage('Отряд испытания сохранён');
 });
 const start=()=>run(async()=>{
  if(!current?.nextStage||dirty)return;
  setBattle(await request<Report>('/challenge','POST',{eventId:chosen,stage:current.nextStage.id}));setResult(null);
 });
 const settle=()=>run(async()=>{
  if(!battle)return;const r=await request<Result>('/settle','POST',{battleId:battle.battleId});
  setResult(r);setBattle(null);await load();
 });
 const cancel=()=>run(async()=>{
  if(!battle)return;await request('/cancel','POST',{battleId:battle.battleId});
  setBattle(null);await load();
 });
 const resume=()=>run(async()=>{
  const r=await request<{report:Report|null}>('/pending/'+chosen);setBattle(r.report);
  if(!r.report)setMessage('Незавершённого боя нет');
 });
 const quick=()=>run(async()=>{
  const r=await request<Result>('/quick','POST',{eventId:chosen,endStage:end});
  setResult(r);await load();
 });
 return <main className="tower-shell">
  <header className="tower-header"><div><small>RockBogini Next / PvE</small><h2>Испытания стихий</h2></div>
   <div className="tower-actions"><button disabled={busy} onClick={()=>run(load)}>Обновить</button><button onClick={onClose}>В город</button></div>
  </header>
  {message&&<p role="status" className="tower-message">{message}</p>}
  {!battle&&<div className="tower-actions">{events.map(e=><button key={e.id} disabled={busy}
   aria-pressed={e.id===chosen} onClick={()=>{setChosen(e.id);setResult(null)}}>
   {e.element===1?'Сердце':'Тьма'} · {e.clearedStage}/200</button>)}</div>}
  {current&&!battle&&<section className="tower-panel">
   <h3>Событие #{current.id} · элемент {current.element}</h3>
   <p>{current.window.open?'Событие доступно':'Событие закрыто: '+(current.window.reason??'расписание')}</p>
   <p>{new Date(current.window.startTime).toLocaleString('ru-RU')} → {current.window.endTime?new Date(current.window.endTime).toLocaleString('ru-RU'):'не указано'}</p>
   <p>Пройдено: {current.clearedStage}/{current.maximumStages} · Рейтинг: {current.rank}
    {' · '}Мощность отряда: {current.selectedPower.toLocaleString('ru-RU')}</p>
   {current.nextStage&&<><h3>Следующий этап #{current.nextStage.id}</h3>
    <p>Карта #{current.nextStage.mapId} · рекомендуемая сила {current.nextStage.recommendPower.toLocaleString('ru-RU')}
     {' · '}Быстрая зачистка от {current.nextStage.quickPower.toLocaleString('ru-RU')}</p>
    <p>Награды: {rewards(current.nextStage.rewards)}</p></>}
   <div className="tower-actions">
    <button disabled={busy||!current.canChallenge||dirty} onClick={start}>⚔️ Начать бой</button>
    <button disabled={busy} onClick={resume}>Продолжить бой</button>
   </div>
   {current.canQuick&&<div className="tower-quick">
    <label>До какого этажа зачистить
     <input type="number" min={current.clearedStage+1} max={current.quickEnd} value={end}
      onChange={e=>setEnd(Number(e.target.value))}/>
    </label>
    <button disabled={busy||dirty||!Number.isSafeInteger(end)||end<=current.clearedStage||end>current.quickEnd}
     onClick={quick}>Быстрая зачистка до #{end}</button>
   </div>}
  </section>}
  {form&&!battle&&<section className="tower-panel">
   <h3>Отряд элемента · Sid {form.sid}</h3>
   <p>{form.usesMainFallback?'Пока используется основной отряд':'Сохранён отдельный отряд'} · неподходящие герои получают ослабление</p>
   <label>Построение
    <select value={type} disabled={busy} onChange={e=>{setType(Number(e.target.value));setDirty(true)}}>
     {form.layouts.map(f=><option key={f.id} value={f.id}>Построение {f.id}</option>)}
    </select>
   </label>
   <div className="tower-formation-grid">
    {[0,1,2,3,4,5].map(i=><label key={i}>
     Позиция {form.layouts.find(f=>f.id===type)?.positions[i]??i+1}
     <select value={ids[i]??0} aria-label={'Герой испытания '+(i+1)} disabled={busy}
      onChange={e=>{const sid=Number(e.target.value);setIds(old=>old.map((v,n)=>n===i?sid:sid>0&&v===sid?0:v));setDirty(true)}}>
      <option value={0}>Не выбран</option>
      {form.heroOptions.map(h=><option key={h.sid} value={h.sid}>#{h.sid} · герой {h.heroId} · {h.star}★</option>)}
     </select>
    </label>)}
   </div>
   <div className="tower-actions"><button disabled={busy||!dirty} onClick={save}>Сохранить отряд</button></div>
  </section>}
  {battle&&<section className="tower-panel"><h3>⚔️ Бой за этап {battle.stage}</h3>
   <p>Карта {battle.mapId} · результат {battle.summary.resultCode} · событий {battle.pages.length}</p>
   <div className="tower-actions"><button disabled={busy} onClick={settle}>Завершить бой</button>
    <button disabled={busy} onClick={cancel}>Отменить</button></div>
  </section>}
  {result&&<section className="tower-panel" role="status"><h3>Результат испытания</h3>
   <p>Награды: {rewards(result.rewards)}</p><button onClick={()=>setResult(null)}>Закрыть</button>
  </section>}
 </main>;
}
