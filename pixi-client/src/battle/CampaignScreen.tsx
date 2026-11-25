import {useEffect,useState} from 'react';
import './campaign.css';

export type CampaignMap={
 id:number;
 level:number;
 next:number;
 rewards:number[][];
 status:'cleared'|'available'|'locked';
 levelLocked:boolean;
 canChallenge:boolean;
};
export type CampaignChapter={
 id:number;
 name:string;
 bg:string;
 worldId:number|null;
 mapCount:number;
 firstMapId:number|null;
 lastMapId:number|null;
 status:'cleared'|'current'|'locked';
 clearedCount:number;
 complete:boolean;
};
export type CampaignProgress={
 stage:number;
 level:number;
 currentChapterId:number|null;
 focusChapterId:number;
 chapters:CampaignChapter[];
 maps:CampaignMap[];
};

export function CampaignScreen({api,token,onFight,onClose}:{api:string;token:string;onFight:(mapId:number)=>void;onClose:()=>void}){
 const [data,setData]=useState<CampaignProgress|null>(null);
 const [chapterId,setChapterId]=useState<number|null>(null);
 const [status,setStatus]=useState('Загрузка кампании…');
 useEffect(()=>{
  const c=new AbortController();
  const q=chapterId?`?chapterId=${chapterId}`:'';
  fetch(api+'/v1/campaign'+q,{headers:{Authorization:'Bearer '+token},signal:c.signal})
   .then(r=>{if(!r.ok)throw Error('campaign_'+r.status);return r.json()})
   .then((d:CampaignProgress)=>{setData(d);setChapterId(d.focusChapterId);setStatus('')})
   .catch(e=>{if(!c.signal.aborted)setStatus(e instanceof Error?e.message:'Не удалось загрузить кампанию')});
  return()=>c.abort();
 },[api,token,chapterId]);
 const focus=data?.chapters.find(c=>c.id===data.focusChapterId);
 return <main className="campaign-screen">
  <header>
   <div>
    <h1>Кампания</h1>
    {data&&<p>Прогресс: этап {data.stage} · уровень {data.level}</p>}
   </div>
   <button type="button" onClick={onClose}>Вернуться в город</button>
  </header>
  {status&&<p role="status">{status}</p>}
  {data&&<>
   <nav className="campaign-chapters" aria-label="Главы">
    {data.chapters.map(c=><button key={c.id} type="button" aria-pressed={c.id===data.focusChapterId} data-status={c.status} disabled={c.status==='locked'} onClick={()=>setChapterId(c.id)}>
     <strong>{c.name}</strong>
     <span>{c.clearedCount}/{c.mapCount}</span>
    </button>)}
   </nav>
   <section className="campaign-maps" aria-label={focus?.name??'Этапы'}>
    <h2>{focus?.name??'Этапы'}{focus?.bg?` · ${focus.bg}`:''}</h2>
    <div className="campaign-map-grid">
     {data.maps.map(m=><button key={m.id} type="button" data-status={m.status} disabled={!m.canChallenge} onClick={()=>onFight(m.id)}>
      <strong>{m.id}</strong>
      <span>Ур. {m.level}</span>
      <span>{m.status==='cleared'?'Пройден':m.status==='available'?(m.levelLocked?'Нужен уровень':'Бой'):'Закрыт'}</span>
     </button>)}
    </div>
   </section>
  </>}
 </main>;
}
