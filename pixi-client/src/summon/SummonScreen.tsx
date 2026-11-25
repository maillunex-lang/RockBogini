import React,{useEffect,useState} from 'react';
import {heroDisplayName} from '../shared/heroNames';
import './summon.css';

type Banner={id:number;summonCount:number;summonType:number;consume:[number,number][];extra:[number,number][]};
type PullHero={sid:number;heroId:number;star:number;cardId:number};
type PoolState={summonType:number;freeCount:number;todayCount:number;totalCount:number}|null;
type Tickets={normal:{itemId:number;amount:number};senior:{itemId:number;amount:number};diamond:{itemId:number;amount:number}};
type SummonInfo={
 banners:Banner[];
 tickets?:Tickets;
 ticket?:{itemId:number;amount:number};
 states?:{'101':PoolState;'102':PoolState};
 state:PoolState;
};

export function SummonScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [info,setInfo]=useState<SummonInfo|null>(null);
 const [tab,setTab]=useState<'normal'|'senior'>('normal');
 const [status,setStatus]=useState('Загрузка…');
 const [busy,setBusy]=useState(false);
 const [results,setResults]=useState<PullHero[]>([]);

 const load=async()=>{
  const r=await fetch(`${api}/v1/summon`,{headers:{Authorization:'Bearer '+token}});
  if(!r.ok)throw Error('summon_'+r.status);
  setInfo(await r.json());
  setStatus('');
 };

 useEffect(()=>{
  const c=new AbortController();
  load().catch(()=>{if(!c.signal.aborted)setStatus('Не удалось загрузить призыв')});
  return()=>c.abort();
 },[api,token]);

 const pull=async(type:1|2|3|4,free=false)=>{
  if(busy)return;
  const senior=type===3||type===4;
  setBusy(true);setStatus(senior?`Старший ×${type===4?10:1}…`:`Обычный ×${type===2?10:1}…`);
  try{
   const itemId=free?0:senior?10403:10401;
   const r=await fetch(`${api}/v1/summon/pull`,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({type,itemId}),
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||'pull_'+r.status);
   setResults(j.heroes??[]);
   setInfo(prev=>prev?{
    ...prev,
    tickets:j.tickets??prev.tickets,
    ticket:j.ticket??prev.ticket,
    states:j.states??prev.states,
    state:j.states?.['101']??j.state??prev.state,
   }:prev);
   setStatus(`Получено героев: ${(j.heroes??[]).length}`);
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось призвать');
  }finally{setBusy(false)}
 };

 const one=info?.banners.find(b=>b.id===(tab==='normal'?1:3));
 const ten=info?.banners.find(b=>b.id===(tab==='normal'?2:4));
 const pool=tab==='normal'?(info?.states?.['101']??info?.state):(info?.states?.['102']??null);
 const tickets=info?.tickets;
 const ticketLine=tab==='normal'
  ?`Билеты #${tickets?.normal.itemId??10401}: ${tickets?.normal.amount??info?.ticket?.amount??'—'}`
  :`Билеты #${tickets?.senior.itemId??10403}: ${tickets?.senior.amount??'—'} · алмазы #3: ${tickets?.diamond.amount??'—'}`;

 return <main className="summon-screen">
  <header>
   <h1>Призыв</h1>
   <button type="button" onClick={onClose}>Вернуться в город</button>
  </header>
  {status&&<p role="status">{status}</p>}
  <div className="summon-tabs" role="tablist">
   <button type="button" role="tab" aria-selected={tab==='normal'} disabled={busy} onClick={()=>setTab('normal')}>Обычный</button>
   <button type="button" role="tab" aria-selected={tab==='senior'} disabled={busy} onClick={()=>setTab('senior')}>Старший</button>
  </div>
  <p className="summon-tickets">{ticketLine}</p>
  <p className="summon-meta">Бесплатно: {pool?.freeCount??'—'} · сегодня {pool?.todayCount??0} · всего {pool?.totalCount??0}</p>
  <div className="summon-actions">
   <button type="button" disabled={busy||!one} onClick={()=>void pull((tab==='normal'?1:3) as 1|3)}>
    ×1{one?` (${one.consume.map(([id,n])=>`${n}×${id}`).join(' / ')})`:''}
   </button>
   <button type="button" disabled={busy||!(pool?.freeCount)} onClick={()=>void pull((tab==='normal'?1:3) as 1|3,true)}>
    Бесплатно ×1
   </button>
   <button type="button" disabled={busy||!ten} onClick={()=>void pull((tab==='normal'?2:4) as 2|4)}>
    ×10{ten?` (${ten.consume.map(([id,n])=>`${n}×${id}`).join(' / ')})`:''}
   </button>
  </div>
  {!!results.length&&(
   <section className="summon-results" aria-label="Результаты призыва">
    <h2>Результат</h2>
    <ul>
     {results.map(h=>(
      <li key={h.sid}>
       <strong>{heroDisplayName(h.heroId)}</strong>
       <span>★{h.star} · карта #{h.cardId} · sid {h.sid}</span>
      </li>
     ))}
    </ul>
   </section>
  )}
 </main>;
}
