import React,{useEffect,useState} from 'react';
import {heroDisplayName} from '../shared/heroNames';
import './summon.css';

type Banner={id:number;summonCount:number;consume:[number,number][];extra:[number,number][]};
type PullHero={sid:number;heroId:number;star:number;cardId:number};
type SummonInfo={
 banners:Banner[];
 ticket:{itemId:number;amount:number};
 state:{freeCount:number;todayCount:number;totalCount:number}|null;
};

export function SummonScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [info,setInfo]=useState<SummonInfo|null>(null);
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

 const pull=async(type:1|2,free=false)=>{
  if(busy)return;
  setBusy(true);setStatus(type===1?'Призыв ×1…':'Призыв ×10…');
  try{
   const r=await fetch(`${api}/v1/summon/pull`,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(free?{type:1,itemId:0}:{type,itemId:10401}),
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||'pull_'+r.status);
   setResults(j.heroes??[]);
   setInfo(prev=>prev?{
    ...prev,
    ticket:j.ticket??prev.ticket,
    state:j.state??prev.state,
   }:prev);
   setStatus(`Получено героев: ${(j.heroes??[]).length}`);
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось призвать');
  }finally{setBusy(false)}
 };

 const one=info?.banners.find(b=>b.id===1);
 const ten=info?.banners.find(b=>b.id===2);

 return <main className="summon-screen">
  <header>
   <h1>Призыв</h1>
   <button type="button" onClick={onClose}>Вернуться в город</button>
  </header>
  {status&&<p role="status">{status}</p>}
  <p className="summon-tickets">Билеты #{info?.ticket.itemId??10401}: {info?.ticket.amount??'—'}</p>
  <p className="summon-meta">Бесплатно: {info?.state?.freeCount??'—'} · сегодня {info?.state?.todayCount??0} · всего {info?.state?.totalCount??0}</p>
  <div className="summon-actions">
   <button type="button" disabled={busy||!one} onClick={()=>void pull(1)}>
    ×1{one?` (${one.consume.map(([id,n])=>`${n}×${id}`).join(', ')})`:''}
   </button>
   <button type="button" disabled={busy||!(info?.state?.freeCount)} onClick={()=>void pull(1,true)}>
    Бесплатно ×1
   </button>
   <button type="button" disabled={busy||!ten} onClick={()=>void pull(2)}>
    ×10{ten?` (${ten.consume.map(([id,n])=>`${n}×${id}`).join(', ')})`:''}
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
