import {useEffect,useMemo,useState} from 'react';
import './campaign.css';

export type CampaignMap={
 id:number;
 level:number;
 next:number;
 rewards:number[][];
 status:'cleared'|'available'|'locked';
 levelLocked:boolean;
 canChallenge:boolean;
 terminal?:boolean;
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
export type CampaignWorld={
 id:number;
 name:string;
 nameKey:string;
 position:number[];
 owningMap:number;
 chapterIds:number[];
 status:'cleared'|'current'|'locked';
 clearedChapters:number;
 chapterCount:number;
};
export type CampaignProgress={
 stage:number;
 level:number;
 currentChapterId:number|null;
 currentWorldId:number|null;
 focusChapterId:number;
 focusWorldId:number|null;
 chapters:CampaignChapter[];
 maps:CampaignMap[];
 worlds:CampaignWorld[];
};

type ViewMode='worlds'|'chapters';

function worldLabel(status:CampaignWorld['status']){
 if(status==='cleared')return 'Исследовано';
 if(status==='current')return 'Текущая';
 return 'Закрыто';
}

export function CampaignScreen({api,token,onFight,onClose}:{api:string;token:string;onFight:(mapId:number)=>void;onClose:()=>void}){
 const [data,setData]=useState<CampaignProgress|null>(null);
 const [chapterId,setChapterId]=useState<number|null>(null);
 const [view,setView]=useState<ViewMode>('worlds');
 const [owningMap,setOwningMap]=useState<number>(1);
 const [status,setStatus]=useState('Загрузка кампании…');
 useEffect(()=>{
  const c=new AbortController();
  const q=chapterId?`?chapterId=${chapterId}`:'';
  fetch(api+'/v1/campaign'+q,{headers:{Authorization:'Bearer '+token},signal:c.signal})
   .then(r=>{if(!r.ok)throw Error('campaign_'+r.status);return r.json()})
   .then((d:CampaignProgress)=>{
    setData(d);
    setChapterId(d.focusChapterId);
    const focusWorld=d.worlds.find(w=>w.id===d.focusWorldId)||d.worlds.find(w=>w.id===d.currentWorldId);
    if(focusWorld)setOwningMap(focusWorld.owningMap);
    setStatus('');
   })
   .catch(e=>{if(!c.signal.aborted)setStatus(e instanceof Error?e.message:'Не удалось загрузить кампанию')});
  return()=>c.abort();
 },[api,token,chapterId]);

 const focus=data?.chapters.find(c=>c.id===data.focusChapterId);
 const sheetWorlds=useMemo(()=>{
  if(!data)return [];
  return data.worlds.filter(w=>w.owningMap===owningMap);
 },[data,owningMap]);
 const owningMaps=useMemo(()=>{
  if(!data)return [] as number[];
  return [...new Set(data.worlds.map(w=>w.owningMap))].sort((a,b)=>a-b);
 },[data]);
 const mapBounds=useMemo(()=>{
  if(!sheetWorlds.length)return {minX:0,minY:0,maxX:1,maxY:1,w:1,h:1};
  const xs=sheetWorlds.map(w=>w.position[0]??0);
  const ys=sheetWorlds.map(w=>w.position[1]??0);
  const minX=Math.min(...xs)-80,maxX=Math.max(...xs)+80;
  const minY=Math.min(...ys)-80,maxY=Math.max(...ys)+80;
  return {minX,minY,maxX,maxY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
 },[sheetWorlds]);
 const chaptersForFocusWorld=useMemo(()=>{
  if(!data||!focus?.worldId)return data?.chapters??[];
  return data.chapters.filter(c=>c.worldId===focus.worldId);
 },[data,focus]);

 const openWorld=(w:CampaignWorld)=>{
  if(w.status==='locked')return;
  const firstOpen=w.chapterIds
   .map(id=>data?.chapters.find(c=>c.id===id))
   .find(c=>c&&c.status!=='locked');
  if(firstOpen){setChapterId(firstOpen.id);setView('chapters');}
 };

 return <main className="campaign-screen">
  <header>
   <div>
    <h1>Кампания</h1>
    {data&&<p>Прогресс: этап {data.stage} · уровень {data.level}</p>}
   </div>
   <div className="campaign-header-actions">
    <div className="campaign-view-toggle" role="group" aria-label="Вид кампании">
     <button type="button" aria-pressed={view==='worlds'} onClick={()=>setView('worlds')}>Карта мира</button>
     <button type="button" aria-pressed={view==='chapters'} onClick={()=>setView('chapters')}>Главы</button>
    </div>
    <button type="button" onClick={onClose}>Вернуться в город</button>
   </div>
  </header>
  {status&&<p role="status">{status}</p>}
  {data&&view==='worlds'&&<>
   <div className="campaign-sheet-nav" aria-label="Листы карты">
    {owningMaps.map(id=>{
     const unlocked=data.worlds.some(w=>w.owningMap===id&&w.status!=='locked');
     return <button key={id} type="button" aria-pressed={id===owningMap} disabled={!unlocked&&id!==owningMap} onClick={()=>setOwningMap(id)}>Карта {id}</button>;
    })}
   </div>
   <section className="campaign-world-map" aria-label="Карта мира">
    <div className="campaign-world-plane" style={{['--map-aspect' as string]:`${mapBounds.w}/${mapBounds.h}`}}>
     {sheetWorlds.map(w=>{
      const x=((w.position[0]??0)-mapBounds.minX)/mapBounds.w*100;
      const y=(1-((w.position[1]??0)-mapBounds.minY)/mapBounds.h)*100;
      return <button
       key={w.id}
       type="button"
       className="campaign-world-node"
       data-status={w.status}
       style={{left:`${x}%`,top:`${y}%`}}
       disabled={w.status==='locked'}
       onClick={()=>openWorld(w)}
       title={w.nameKey}
      >
       <strong>{w.name}</strong>
       <span>{w.clearedChapters}/{w.chapterCount} · {worldLabel(w.status)}</span>
      </button>;
     })}
    </div>
   </section>
  </>}
  {data&&view==='chapters'&&<>
   <nav className="campaign-chapters" aria-label="Главы">
    {(chaptersForFocusWorld.length?chaptersForFocusWorld:data.chapters).map(c=>{
     const world=data.worlds.find(w=>w.id===c.worldId);
     return <button key={c.id} type="button" aria-pressed={c.id===data.focusChapterId} data-status={c.status} disabled={c.status==='locked'} onClick={()=>setChapterId(c.id)}>
      <strong>{c.name}</strong>
      <span>{world?world.name:c.bg}</span>
      <span>{c.clearedCount}/{c.mapCount}</span>
     </button>;
    })}
   </nav>
   <section className="campaign-maps" aria-label={focus?.name??'Этапы'}>
    <h2>{focus?.name??'Этапы'}{focus?.worldId?` · ${data.worlds.find(w=>w.id===focus.worldId)?.name??''}`:''}</h2>
    <div className="campaign-map-grid">
     {data.maps.map(m=><button key={m.id} type="button" data-status={m.status} disabled={!m.canChallenge} onClick={()=>onFight(m.id)}>
      <strong>{m.terminal?'Финал · ':''}{m.id}</strong>
      <span>Ур. {m.level}</span>
      <span>{m.status==='cleared'?'Пройден':m.status==='available'?(m.levelLocked?'Нужен уровень':'Бой'):'Закрыт'}</span>
     </button>)}
    </div>
   </section>
  </>}
 </main>;
}
