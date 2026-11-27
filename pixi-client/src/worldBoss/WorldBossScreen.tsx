import React,{useCallback,useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import '../tower/tower.css';
type Rewards=[number,number][];
type Event={id:number;name:string;kind:number;mapId:number;startTime:string;endTime:string;open:boolean;requiresGuild:boolean;canChallenge:boolean;attempts:number;attemptMax:number;bestDamage:string;totalDamage:string;bonus:number[];bossHp:number;rounds:number;participationRewards:Rewards;unavailableReason:string|null};
type Events={events:Event[];day:string};
type Report={battleId:string;eventId:number;mapId:number;damage:number;maxRounds:number;summary:{resultCode:number};pages:unknown[];heroes:{heroId:number;camp:number;statDamage:number}[]};
type Result={battleId:string;eventId:number;mapId:number;damage:number;rewards:Rewards;countedAttempt:boolean};
type Leader={rank:number;nickname:string;bestDamage:string};
const items=(r:Rewards)=>r.length?r.map(([id,n])=>itemDisplayName(id)+' ×'+n.toLocaleString('ru-RU')).join(' · '):'Нет наград';
const reason=(r:string|null)=>r==='event_closed'?'Событие завершилось':r==='guild_not_implemented'?'Гильдии пока не перенесены':r==='attempt_limit'?'Попытки исчерпаны':'';
export function WorldBossScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [events,setEvents]=useState<Events|null>(null);
 const [selected,setSelected]=useState(15802);
 const [battle,setBattle]=useState<Report|null>(null);
 const [result,setResult]=useState<Result|null>(null);
 const [ranks,setRanks]=useState<Leader[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const request=useCallback(async<T,>(path:string,method:'GET'|'POST'='GET',body?:unknown):Promise<T>=>{
  const res=await fetch(api+'/v1/world-boss'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json() as T&{error?:string};
  if(!res.ok)throw Error(data.error??'boss_'+res.status);
  return data;
 },[api,token]);
 const load=useCallback(async()=>{const r=await request<Events>('');setEvents(r);return r},[request]);
 useEffect(()=>{let mounted=true;load().catch(e=>{if(mounted)setMessage(String(e))});return()=>{mounted=false}},[load]);
 const current=events?.events.find(e=>e.id===selected)??null;
 const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
 const reload=()=>void run(async()=>{await load()});
 const challenge=()=>void run(async()=>{if(!current)return;setBattle(await request<Report>('/challenge','POST',{eventId:current.id}));setResult(null)});
 const settle=()=>void run(async()=>{if(!battle)return;setResult(await request<Result>('/settle','POST',{battleId:battle.battleId}));setBattle(null);await load()});
 const cancel=()=>void run(async()=>{if(!battle)return;await request('/cancel','POST',{battleId:battle.battleId});setBattle(null)});
 const resume=()=>void run(async()=>{const r=await request<{report:Report|null}>('/pending');setBattle(r.report);if(!r.report)setMessage('Незавершённого боя нет')});
 const ranking=()=>void run(async()=>{if(!current)return;const r=await request<{rows:Leader[]}>('/rank/'+current.id);setRanks(r.rows)});
 return <main className="tower-shell">
  <header className="tower-header"><div><small>RockBogini Next / события</small><h2>Мировые боссы</h2></div>
   <div className="tower-actions"><button disabled={busy} onClick={reload}>Обновить</button><button onClick={onClose}>В город</button></div>
  </header>
  {message&&<p role="status" className="tower-message">{message}</p>}
  {!battle&&!result&&<>
   <nav className="tower-types" aria-label="События с боссами">
    {(events?.events??[]).map(e=><button key={e.id} aria-pressed={e.id===selected} onClick={()=>{setSelected(e.id);setRanks([])}}>
     {e.kind===2?'Босс гильдии':'Босс сервера'}<small>{e.open?'Доступен':'Неактивен'}</small></button>)}
   </nav>
   {current&&<section className="tower-panel">
    <h3>{current.kind===2?'Босс гильдии':'Босс сервера'}</h3>
    <p>Оригинальное событие №{current.id} · карта {current.mapId}</p>
    <p>Начало: {new Date(current.startTime).toLocaleString('ru-RU')} · завершение: {new Date(current.endTime).toLocaleString('ru-RU')}</p>
    <p>{current.open?'Событие открыто':reason(current.unavailableReason)||'Событие закрыто'}</p>
    <p>Попыток использовано: {current.attempts}/{current.attemptMax}. Раундов: {current.rounds}.</p>
    <p>Максимальный урон: {Number(current.bestDamage).toLocaleString('ru-RU')} · суммарный урон: {Number(current.totalDamage).toLocaleString('ru-RU')}</p>
    <p>Награда за участие: {items(current.participationRewards)}</p>
    <div className="tower-actions">
     <button disabled={busy||!current.canChallenge} onClick={challenge}>⚔️ Сражаться с боссом</button>
     <button disabled={busy} onClick={resume}>Продолжить бой</button>
     <button disabled={busy} onClick={ranking}>Рейтинг урона</button>
    </div>
    {ranks.length>0&&<div className="tower-stats">{ranks.map(r=><div key={r.rank}><strong>#{r.rank} {r.nickname}</strong><span>Урон: {Number(r.bestDamage).toLocaleString('ru-RU')}</span></div>)}</div>}
    {!current.open&&<p className="tower-note">Исходное расписание события уже закончилось. Новые даты не создаются автоматически: нужен отдельный календарь событий.</p>}
   </section>}
  </>}
  {battle&&<section className="tower-panel">
   <h3>⚔️ Бой · карта {battle.mapId}</h3>
   <p>Нанесённый урон: {battle.damage.toLocaleString('ru-RU')} · событий {battle.pages.length}</p>
   <div className="tower-stats">{battle.heroes.map((h,i)=><div key={i}><strong>{h.camp===1?'Герой':'Босс'} {h.heroId}</strong><span>Урон: {Number(h.statDamage??0).toLocaleString('ru-RU')}</span></div>)}</div>
   <div className="tower-actions"><button disabled={busy} onClick={settle}>Завершить бой</button><button disabled={busy} onClick={cancel}>Отменить</button></div>
  </section>}
  {result&&<section className="tower-panel" role="status"><h3>Бой завершён</h3>
   <p>Урон: {result.damage.toLocaleString('ru-RU')} · получено: {items(result.rewards)}</p>
   <button onClick={()=>setResult(null)}>Вернуться к боссам</button>
  </section>}
 </main>;
}
