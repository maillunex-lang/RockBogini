import React,{useEffect,useState} from 'react';
import {heroDisplayName} from '../shared/heroNames';
import './summon.css';

type Banner={id:number;summonCount:number;summonType:number;consume:[number,number][];extra:[number,number][]};
type OracleBanner={id:number;times:number;currencyId:number;baseCost:number;advCost:number};
type PullHero={sid:number;heroId:number;star:number;cardId:number};
type PoolState={summonType:number;freeCount:number;todayCount:number;totalCount:number}|null;
type Tickets={
 normal:{itemId:number;amount:number};
 senior:{itemId:number;amount:number};
 diamond:{itemId:number;amount:number};
 oracle?:{itemId:number;amount:number};
 crystal?:{itemId:number;amount:number};
};
type SummonInfo={
 banners:Banner[];
 tickets?:Tickets;
 ticket?:{itemId:number;amount:number};
 states?:Record<string,PoolState>;
 state:PoolState;
 oracle?:{banners:OracleBanner[];state:PoolState;elements:number[]};
 crystal?:{banner:OracleBanner;state:PoolState;elements:number[]};
};

const ELEMENT_NAME:Record<number,string>={1:'Огонь',2:'Вода',3:'Земля',4:'Другое',5:'Дуэль'};

export function SummonScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [info,setInfo]=useState<SummonInfo|null>(null);
 const [tab,setTab]=useState<'normal'|'senior'|'oracle'|'crystal'>('normal');
 const [element,setElement]=useState(1);
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

 const pullCommon=async(type:1|2|3|4,free=false)=>{
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
    tickets:j.tickets?{...prev.tickets!,...j.tickets}:prev.tickets,
    ticket:j.ticket??prev.ticket,
    states:j.states??prev.states,
    state:j.states?.['101']??j.state??prev.state,
   }:prev);
   setStatus(`Получено героев: ${(j.heroes??[]).length}`);
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось призвать');
  }finally{setBusy(false)}
 };

 const pullOracle=async(type:1|5)=>{
  if(busy)return;
  setBusy(true);setStatus(`Оракул ×${type===5?10:1} (${ELEMENT_NAME[element]})…`);
  try{
   const r=await fetch(`${api}/v1/summon/oracle`,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({type,element}),
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||'oracle_'+r.status);
   setResults(j.heroes??[]);
   setInfo(prev=>{
    if(!prev)return prev;
    const tickets=prev.tickets?{...prev.tickets,oracle:j.oracle??prev.tickets.oracle}:prev.tickets;
    return {
     ...prev,
     tickets,
     states:{...prev.states,201:j.state??prev.states?.['201']??null},
     oracle:prev.oracle?{...prev.oracle,state:j.state??prev.oracle.state}:prev.oracle,
    };
   });
   setStatus(`Оракул: ${(j.heroes??[]).length} героев`);
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось призвать');
  }finally{setBusy(false)}
 };

 const pullCrystal=async()=>{
  if(busy)return;
  setBusy(true);setStatus(`Кристалл (${ELEMENT_NAME[element]})…`);
  try{
   const r=await fetch(`${api}/v1/summon/crystal`,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({element}),
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||'crystal_'+r.status);
   setResults(j.heroes??[]);
   setInfo(prev=>{
    if(!prev)return prev;
    const tickets=prev.tickets?{...prev.tickets,crystal:j.crystal??prev.tickets.crystal}:prev.tickets;
    return {
     ...prev,
     tickets,
     states:{...prev.states,301:j.state??prev.states?.['301']??null},
     crystal:prev.crystal?{...prev.crystal,state:j.state??prev.crystal.state}:prev.crystal,
    };
   });
   setStatus(`Кристалл: ${(j.heroes??[]).length} героев`);
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось обменять');
  }finally{setBusy(false)}
 };

 const switchTab=(next:'normal'|'senior'|'oracle'|'crystal')=>{
  setTab(next);
  setElement(1);
 };

 const one=info?.banners.find(b=>b.id===(tab==='normal'?1:3));
 const ten=info?.banners.find(b=>b.id===(tab==='normal'?2:4));
 const pool=tab==='normal'?(info?.states?.['101']??info?.state)
  :tab==='senior'?(info?.states?.['102']??null)
  :tab==='oracle'?(info?.oracle?.state??info?.states?.['201']??null)
  :(info?.crystal?.state??info?.states?.['301']??null);
 const tickets=info?.tickets;
 const oracleOne=info?.oracle?.banners.find(b=>b.id===1);
 const oracleTen=info?.oracle?.banners.find(b=>b.id===5);
 const crystalBanner=info?.crystal?.banner;
 const oracleCost=(b:OracleBanner|undefined)=>!b?'':`${element===4?b.advCost:b.baseCost}×${b.currencyId}`;
 const crystalCostLine=!crystalBanner?'':`${element>=4?crystalBanner.advCost:crystalBanner.baseCost}×${crystalBanner.currencyId}`;
 const elementOptions=tab==='crystal'?(info?.crystal?.elements??[1,2,3,4,5]):[1,2,3,4];

 let ticketLine='';
 if(tab==='normal')ticketLine=`Билеты #${tickets?.normal.itemId??10401}: ${tickets?.normal.amount??info?.ticket?.amount??'—'}`;
 else if(tab==='senior')ticketLine=`Билеты #${tickets?.senior.itemId??10403}: ${tickets?.senior.amount??'—'} · алмазы #3: ${tickets?.diamond.amount??'—'}`;
 else if(tab==='oracle')ticketLine=`Оракул #${tickets?.oracle?.itemId??14001}: ${tickets?.oracle?.amount??'—'}`;
 else ticketLine=`Звёздная сила #${tickets?.crystal?.itemId??39}: ${tickets?.crystal?.amount??'—'}`;

 return <main className="summon-screen">
  <header>
   <h1>Призыв</h1>
   <button type="button" onClick={onClose}>Вернуться в город</button>
  </header>
  {status&&<p role="status">{status}</p>}
  <div className="summon-tabs" role="tablist">
   <button type="button" role="tab" aria-selected={tab==='normal'} disabled={busy} onClick={()=>switchTab('normal')}>Обычный</button>
   <button type="button" role="tab" aria-selected={tab==='senior'} disabled={busy} onClick={()=>switchTab('senior')}>Старший</button>
   <button type="button" role="tab" aria-selected={tab==='oracle'} disabled={busy} onClick={()=>switchTab('oracle')}>Оракул</button>
   <button type="button" role="tab" aria-selected={tab==='crystal'} disabled={busy} onClick={()=>switchTab('crystal')}>Кристалл</button>
  </div>
  <p className="summon-tickets">{ticketLine}</p>
  {(tab==='normal'||tab==='senior')&&(
   <p className="summon-meta">Бесплатно: {pool?.freeCount??'—'} · сегодня {pool?.todayCount??0} · всего {pool?.totalCount??0}</p>
  )}
  {(tab==='oracle'||tab==='crystal')&&(
   <>
    <p className="summon-meta">Сегодня {pool?.todayCount??0} · всего {pool?.totalCount??0}</p>
    <div className="summon-tabs" role="group" aria-label="Стихия">
     {elementOptions.map(el=>(
      <button key={el} type="button" aria-pressed={element===el} disabled={busy} onClick={()=>setElement(el)}>
       {ELEMENT_NAME[el]??el}
      </button>
     ))}
    </div>
    {tab==='oracle'&&(
     <div className="summon-actions">
      <button type="button" disabled={busy||!oracleOne} onClick={()=>void pullOracle(1)}>
       ×1{oracleOne?` (${oracleCost(oracleOne)})`:''}
      </button>
      <button type="button" disabled={busy||!oracleTen} onClick={()=>void pullOracle(5)}>
       ×10{oracleTen?` (${oracleCost(oracleTen)})`:''}
      </button>
     </div>
    )}
    {tab==='crystal'&&(
     <div className="summon-actions">
      <button type="button" disabled={busy||!crystalBanner} onClick={()=>void pullCrystal()}>
       Обмен{crystalBanner?` (${crystalCostLine})`:''}
      </button>
     </div>
    )}
   </>
  )}
  {(tab==='normal'||tab==='senior')&&(
   <div className="summon-actions">
    <button type="button" disabled={busy||!one} onClick={()=>void pullCommon((tab==='normal'?1:3) as 1|3)}>
     ×1{one?` (${one.consume.map(([id,n])=>`${n}×${id}`).join(' / ')})`:''}
    </button>
    <button type="button" disabled={busy||!(pool?.freeCount)} onClick={()=>void pullCommon((tab==='normal'?1:3) as 1|3,true)}>
     Бесплатно ×1
    </button>
    <button type="button" disabled={busy||!ten} onClick={()=>void pullCommon((tab==='normal'?2:4) as 2|4)}>
     ×10{ten?` (${ten.consume.map(([id,n])=>`${n}×${id}`).join(' / ')})`:''}
    </button>
   </div>
  )}
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
