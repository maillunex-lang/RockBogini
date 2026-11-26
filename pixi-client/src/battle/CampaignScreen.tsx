import {useEffect,useMemo,useState} from 'react';
import {StoryDialog,type StoryLine} from './StoryDialog';
import {FingerHintOverlay,type FingerHint} from './FingerHintOverlay';
import {PlotVideoPlayer} from './PlotVideoPlayer';
import {itemDisplayName} from '../shared/itemNames';
import './campaign.css';

export type EnemyPreview={heroId?:number;model?:string;level?:number;star?:number;station?:number};
export type CampaignMap={
 id:number;
 level:number;
 next:number;
 rewards:number[][];
 status:'cleared'|'available'|'locked';
 levelLocked:boolean;
 canChallenge:boolean;
 terminal?:boolean;
 hasGuide?:boolean;
 guide?:StoryLine[];
 boss?:boolean;
 mapType?:number;
 stageLabel?:string;
 stageIndex?:number|null;
 stageCount?:number|null;
 enemyCount?:number;
 enemies?:EnemyPreview[];
 bg?:string;
 maxRounds?:number|null;
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
export type StoryChapterCard={id:number;title:string;content:string};
export type TutorialPending={
 groupId:number;
 desc:string;
 lines:StoryLine[];
 hasDialog:boolean;
 hasPlot?:boolean;
 hasFinger?:boolean;
 fingerSteps:number;
 panelSteps:number;
 plotSteps?:number;
 plotVideoUrl?:string|null;
 hints?:FingerHint[];
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
 campaignComplete?:boolean;
 story?:{stats:Record<string,number>;chapters:StoryChapterCard[]};
 tutorial?:{completedGroupIds:number[];groupCount:number;pending:TutorialPending|null};
 focusChapterHeros?:number[][];
 mapMetaStats?:{maps:number;bosses:number;modules:number};
};

type ViewMode='worlds'|'chapters'|'story';
type TutorialPhase='plot'|'dialog'|'finger'|null;

function worldLabel(status:CampaignWorld['status']){
 if(status==='cleared')return 'Исследовано';
 if(status==='current')return 'Текущая';
 return 'Закрыто';
}

function initialPhase(t:TutorialPending):TutorialPhase{
 if(t.hasPlot)return 'plot';
 if(t.hasDialog)return 'dialog';
 if(t.hasFinger&&(t.hints?.length??0)>0)return 'finger';
 return null;
}

type IdleQuick={
 freeLeft:number;
 paidLeft:number;
 nextCost:number|null;
 durationMinutes:number;
 dailyCount:number;
 dailyQuickCount:number;
};
type IdleInfo={
 stage:number;
 minutes:number;
 limitMinutes:number;
 capped:boolean;
 rewards:number[][];
 rates:{common:{itemId:number;perMinute:number}[];random:{libId:number;perMinute:number}[]};
 quick?:IdleQuick;
};
type ProgressRewards={
 adventure:{claimed:number;claimable:boolean;pending:{id:number;mapId:number;rewards:number[][]}[]};
 online:{
  index:number;
  onlineMinutes:number;
  claimable:boolean;
  pending:{itemId:number;count:number;minutes:number}[];
  next:{itemId:number;count:number;minutes:number}|null;
 };
};

export function CampaignScreen({api,token,onFight,onClose}:{api:string;token:string;onFight:(mapId:number)=>void;onClose:()=>void}){
 const [data,setData]=useState<CampaignProgress|null>(null);
 const [chapterId,setChapterId]=useState<number|null>(null);
 const [view,setView]=useState<ViewMode>('worlds');
 const [owningMap,setOwningMap]=useState<number>(1);
 const [status,setStatus]=useState('Загрузка кампании…');
 const [pendingFight,setPendingFight]=useState<{mapId:number;lines:StoryLine[];title:string}|null>(null);
 const [storyOpen,setStoryOpen]=useState<StoryChapterCard|null>(null);
 const [tutorial,setTutorial]=useState<TutorialPending|null>(null);
 const [phase,setPhase]=useState<TutorialPhase>(null);
 const [fingerIndex,setFingerIndex]=useState(0);
 const [preview,setPreview]=useState<CampaignMap|null>(null);
 const [idle,setIdle]=useState<IdleInfo|null>(null);
 const [idleBusy,setIdleBusy]=useState(false);
 const [idleMsg,setIdleMsg]=useState('');
 const [progress,setProgress]=useState<ProgressRewards|null>(null);
 const [progressBusy,setProgressBusy]=useState(false);
 const [progressMsg,setProgressMsg]=useState('');

 const applyPending=(pending:TutorialPending|null)=>{
  setTutorial(pending);
  setFingerIndex(0);
  setPhase(pending?initialPhase(pending):null);
 };

 const loadIdle=()=>fetch(api+'/v1/campaign/idle',{headers:{Authorization:'Bearer '+token}})
  .then(r=>{if(!r.ok)throw Error('idle_'+r.status);return r.json() as Promise<IdleInfo>})
  .then(d=>{setIdle(d);return d});

 const loadProgress=()=>fetch(api+'/v1/campaign/progress-rewards',{headers:{Authorization:'Bearer '+token}})
  .then(r=>{if(!r.ok)throw Error('progress_'+r.status);return r.json() as Promise<ProgressRewards>})
  .then(d=>{setProgress(d);return d});

 const loadCampaign=(focus?:number|null)=>{
  const q=focus?`?chapterId=${focus}`:'';
  return fetch(api+'/v1/campaign'+q,{headers:{Authorization:'Bearer '+token}})
   .then(r=>{if(!r.ok)throw Error('campaign_'+r.status);return r.json()})
   .then((d:CampaignProgress)=>{
    setData(d);
    setChapterId(d.focusChapterId);
    const focusWorld=d.worlds.find(w=>w.id===d.focusWorldId)||d.worlds.find(w=>w.id===d.currentWorldId);
    if(focusWorld)setOwningMap(focusWorld.owningMap);
    const pending=d.tutorial?.pending??null;
    if(pending&&(pending.hasDialog||pending.hasPlot||pending.hasFinger))applyPending(pending);
    else applyPending(null);
    setStatus('');
    void loadIdle().catch(()=>setIdle(null));
    void loadProgress().catch(()=>setProgress(null));
    return d;
   });
 };

 const claimIdleRewards=async()=>{
  if(idleBusy)return;
  setIdleBusy(true);setIdleMsg('');
  try{
   const res=await fetch(api+'/v1/campaign/idle/claim',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   });
   if(res.status===409){setIdleMsg('Пока нечего забирать');await loadIdle();return}
   if(!res.ok)throw Error('idle_claim_'+res.status);
   const body=await res.json() as {rewards:number[][]};
   const total=body.rewards.reduce((s,[,n])=>s+(n??0),0);
   setIdleMsg(`Получено: ${body.rewards.length} видов · ${total} шт.`);
   await loadIdle();
  }catch(e){setIdleMsg(e instanceof Error?e.message:'Ошибка сбора')}
  finally{setIdleBusy(false)}
 };

 const runQuickBattle=async()=>{
  if(idleBusy)return;
  setIdleBusy(true);setIdleMsg('');
  try{
   const res=await fetch(api+'/v1/campaign/idle/quick',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   });
   if(res.status===402){setIdleMsg('Не хватает алмазов');await loadIdle();return}
   if(res.status===409){setIdleMsg('Лимит быстрых боёв на сегодня');await loadIdle();return}
   if(!res.ok)throw Error('idle_quick_'+res.status);
   const body=await res.json() as {rewards:number[][];paid:number;durationMinutes:number};
   const total=body.rewards.reduce((s,[,n])=>s+(n??0),0);
   setIdleMsg(`Быстрый бой ${body.durationMinutes}м: ${body.rewards.length} видов · ${total} шт.${body.paid?` · −${body.paid}💎`:''}`);
   await loadIdle();
  }catch(e){setIdleMsg(e instanceof Error?e.message:'Ошибка быстрого боя')}
  finally{setIdleBusy(false)}
 };

 const claimAdventure=async()=>{
  if(progressBusy)return;
  setProgressBusy(true);setProgressMsg('');
  try{
   const res=await fetch(api+'/v1/campaign/progress-rewards/adventure',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   });
   if(res.status===409){setProgressMsg('Нет наград за этапы');await loadProgress();return}
   if(!res.ok)throw Error('adventure_claim_'+res.status);
   const body=await res.json() as {rows:number[];rewards:number[][]};
   setProgressMsg(`Этапы: ${body.rows.join(', ')} · ${body.rewards.length} наград`);
   await loadProgress();
  }catch(e){setProgressMsg(e instanceof Error?e.message:'Ошибка наград этапов')}
  finally{setProgressBusy(false)}
 };

 const claimOnline=async()=>{
  if(progressBusy)return;
  setProgressBusy(true);setProgressMsg('');
  try{
   const res=await fetch(api+'/v1/campaign/progress-rewards/online',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   });
   if(res.status===409){setProgressMsg('Онлайн-награда ещё не готова');await loadProgress();return}
   if(!res.ok)throw Error('online_claim_'+res.status);
   const body=await res.json() as {rewards:number[][];onlineMinutes:number};
   setProgressMsg(`Онлайн ${body.onlineMinutes}м · ${body.rewards.map(([i,n])=>`${itemDisplayName(i)}×${n}`).join(', ')}`);
   await loadProgress();
  }catch(e){setProgressMsg(e instanceof Error?e.message:'Ошибка онлайн-награды')}
  finally{setProgressBusy(false)}
 };

 useEffect(()=>{
  const c=new AbortController();
  loadCampaign(chapterId).catch(e=>{if(!c.signal.aborted)setStatus(e instanceof Error?e.message:'Не удалось загрузить кампанию')});
  return()=>c.abort();
 },[api,token,chapterId]);

 const completeTutorial=async(groupId:number)=>{
  const res=await fetch(api+'/v1/campaign/guide/complete',{
   method:'POST',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({groupId}),
  });
  if(!res.ok)throw Error('guide_complete_'+res.status);
  const body=await res.json() as {pending:TutorialPending|null};
  const pending=body.pending&&(body.pending.hasDialog||body.pending.hasPlot||body.pending.hasFinger)?body.pending:null;
  applyPending(pending);
  await loadCampaign(chapterId);
 };

 const finishGroup=()=>{
  if(!tutorial)return;
  void completeTutorial(tutorial.groupId).catch(e=>setStatus(String(e)));
 };

 const afterDialog=()=>{
  if(tutorial?.hasFinger&&(tutorial.hints?.length??0)>0){
   setFingerIndex(0);
   setPhase('finger');
   return;
  }
  finishGroup();
 };

 const afterPlot=()=>{
  if(tutorial?.hasDialog){setPhase('dialog');return}
  afterDialog();
 };

 const afterFinger=()=>{
  const hints=tutorial?.hints??[];
  if(fingerIndex+1<hints.length){setFingerIndex(i=>i+1);return}
  finishGroup();
 };

 const skipAllTutorial=async()=>{
  let guard=0;
  while(guard++<40){
   const d=await loadCampaign(chapterId);
   const pending=d.tutorial?.pending;
   if(!pending)break;
   await completeTutorial(pending.groupId);
  }
 };

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

 const challenge=(m:CampaignMap)=>{
  if(!m.canChallenge)return;
  setPreview(m);
  const lines=m.guide??[];
  if(lines.length){
   setPendingFight({mapId:m.id,lines,title:`${m.boss?'Босс ':''}${m.stageLabel??m.id}`});
  }
 };

 const hints=tutorial?.hints??[];
 const currentHint=phase==='finger'?hints[fingerIndex]:undefined;
 const plotSrc=tutorial?.plotVideoUrl?`./${tutorial.plotVideoUrl}`:'./guide/GuidePlot_EN.mp4';
 const blocking=!!tutorial&&!!phase&&!pendingFight&&!storyOpen;

 return <main className="campaign-screen">
  <header>
   <div>
    <h1>Кампания</h1>
    {data&&<p>Прогресс: этап {data.stage} · уровень {data.level}{data.mapMetaStats?` · боссов в данных ${data.mapMetaStats.bosses}`:''}</p>}
    {data?.campaignComplete&&<p className="campaign-complete-banner">MainLine завершён — все этапы пройдены.</p>}
   </div>
   <div className="campaign-header-actions">
    <div className="campaign-view-toggle" role="group" aria-label="Вид кампании">
     <button type="button" aria-pressed={view==='worlds'} onClick={()=>setView('worlds')}>Карта мира</button>
     <button type="button" aria-pressed={view==='chapters'} onClick={()=>setView('chapters')}>Главы</button>
     <button type="button" aria-pressed={view==='story'} onClick={()=>setView('story')}>Сюжет</button>
    </div>
    {data?.tutorial?.pending&&<button type="button" onClick={()=>void skipAllTutorial().catch(e=>setStatus(String(e)))}>Пропустить обучение</button>}
    <button type="button" data-guide="campaign-close" onClick={onClose}>Вернуться в город</button>
   </div>
  </header>
  {status&&<p role="status">{status}</p>}
  {data&&idle&&<section className="campaign-idle" aria-label="Офлайн награды" data-guide="campaign-idle">
   <div>
    <h2>Офлайн награды</h2>
    <p>
     {idle.minutes}/{idle.limitMinutes} мин
     {idle.capped?' · лимит':''}
     {idle.rates.common[0]?` · ${itemDisplayName(idle.rates.common[0].itemId)} ~${idle.rates.common[0].perMinute.toFixed(2)}/м`:''}
    </p>
    {idle.rewards.length>0
     ?<ul>{idle.rewards.slice(0,8).map(([id,n])=><li key={id}>{itemDisplayName(id)} ×{n}</li>)}</ul>
     :<p className="campaign-idle-empty">Награды копятся, пока вы в городе или офлайн.</p>}
    {idle.quick&&<p className="campaign-idle-quick">
     Быстрый бой {idle.quick.durationMinutes}м · бесплатно {idle.quick.freeLeft} · платно {idle.quick.paidLeft}
     {idle.quick.nextCost!=null&&idle.quick.nextCost>0?` · след. ${idle.quick.nextCost}💎`:idle.quick.nextCost===0?' · след. бесплатно':''}
    </p>}
    {idleMsg&&<p role="status">{idleMsg}</p>}
   </div>
   <div className="campaign-idle-actions">
    <button
     type="button"
     data-guide="campaign-idle-claim"
     disabled={idleBusy||idle.rewards.length===0}
     onClick={()=>void claimIdleRewards()}
    >{idleBusy?'…':'Забрать'}</button>
    <button
     type="button"
     data-guide="campaign-idle-quick"
     disabled={idleBusy||!idle.quick||(idle.quick.freeLeft<=0&&idle.quick.paidLeft<=0)}
     onClick={()=>void runQuickBattle()}
    >{idleBusy?'…':idle.quick?.nextCost?`Быстрый (−${idle.quick.nextCost}💎)`:'Быстрый бой'}</button>
   </div>
  </section>}
  {data&&progress&&<section className="campaign-progress-rewards" aria-label="Награды прогресса">
   <div>
    <h2>Награды этапов и онлайн</h2>
    <p>
     Этапы: доступно {progress.adventure.pending.length}
     {progress.adventure.claimed?` · индекс ${progress.adventure.claimed}`:''}
     {' · '}онлайн {progress.online.onlineMinutes}м
     {progress.online.next?` · след. ${itemDisplayName(progress.online.next.itemId)}×${progress.online.next.count} (${progress.online.next.minutes}м)`:''}
    </p>
    {progress.adventure.pending.length>0&&<ul>
     {progress.adventure.pending.slice(0,4).map(r=><li key={r.id}>#{r.id} · карта {r.mapId} · {r.rewards.map(([i,n])=>`${itemDisplayName(i)}×${n}`).join(', ')}</li>)}
    </ul>}
    {progressMsg&&<p role="status">{progressMsg}</p>}
   </div>
   <div className="campaign-idle-actions">
    <button type="button" disabled={progressBusy||!progress.adventure.claimable} onClick={()=>void claimAdventure()}>
     {progressBusy?'…':'Забрать этапы'}
    </button>
    <button type="button" disabled={progressBusy||!progress.online.claimable} onClick={()=>void claimOnline()}>
     {progressBusy?'…':'Онлайн-награда'}
    </button>
   </div>
  </section>}
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
   {!!data.focusChapterHeros?.length&&<p className="campaign-chapter-heros">Герои главы (конфиг): {data.focusChapterHeros.map(h=>h[0]).join(', ')}</p>}
   <section className="campaign-maps" aria-label={focus?.name??'Этапы'}>
    <h2>{focus?.name??'Этапы'}{focus?.worldId?` · ${data.worlds.find(w=>w.id===focus.worldId)?.name??''}`:''}</h2>
    <div className="campaign-map-grid">
     {data.maps.map((m,i)=>{
      const firstAvailable=m.canChallenge&&!data.maps.slice(0,i).some(x=>x.canChallenge);
      return <button
       key={m.id}
       type="button"
       data-status={m.status}
       data-boss={m.boss?'1':'0'}
       data-guide={firstAvailable?'campaign-map-available':undefined}
       disabled={!m.canChallenge}
       onClick={()=>challenge(m)}
      >
       <strong>{m.boss?'Босс · ':''}{m.stageLabel??m.id}{m.terminal?' · финал':''}</strong>
       <span>Ур. {m.level}{m.enemyCount?` · врагов ${m.enemyCount}`:''}</span>
       <span>{m.status==='cleared'?'Пройден':m.status==='available'?(m.levelLocked?'Нужен уровень':'Бой'):'Закрыт'}</span>
      </button>;
     })}
    </div>
   </section>
   {preview&&preview.canChallenge&&!pendingFight&&<aside className="campaign-preview" aria-label="Превью этапа">
    <h3>{preview.boss?'Босс ':''}{preview.stageLabel??preview.id}</h3>
    <p>Фон {preview.bg??'—'} · раундов {preview.maxRounds??'—'}</p>
    <h4>Враги</h4>
    <ul>{(preview.enemies??[]).map((e,i)=><li key={i}>{e.model??e.heroId} · ур.{e.level} ★{e.star}</li>)}</ul>
    <h4>Награды</h4>
    <ul>{(preview.rewards??[]).map(([id,n])=><li key={id}>{itemDisplayName(id)} ×{n}</li>)}</ul>
    <button type="button" data-guide="campaign-fight" onClick={()=>onFight(preview.id)}>В бой</button>
   </aside>}
  </>}
  {data&&view==='story'&&<section className="campaign-story-list" aria-label="Сюжетные главы">
   <h2>Сюжетные главы</h2>
   <p className="campaign-story-note">Тексты StoryChapter_* из оригинальной локали.</p>
   <div className="campaign-story-grid">
    {(data.story?.chapters??[]).map(c=><button key={c.id} type="button" onClick={()=>setStoryOpen(c)}>
     <strong>{c.title||`История ${c.id}`}</strong>
     <span>{(c.content||'').slice(0,90)}{(c.content||'').length>90?'…':''}</span>
    </button>)}
   </div>
  </section>}
  {blocking&&phase==='plot'&&tutorial&&<PlotVideoPlayer
   title={`Сюжет · группа ${tutorial.groupId}`}
   src={plotSrc}
   onSkip={finishGroup}
   onContinue={afterPlot}
  />}
  {blocking&&phase==='dialog'&&tutorial&&<StoryDialog
   title={`Обучение · группа ${tutorial.groupId}${tutorial.fingerSteps?` · подсказок ${tutorial.fingerSteps}`:''}`}
   lines={tutorial.lines}
   onSkip={finishGroup}
   onContinue={afterDialog}
  />}
  {blocking&&phase==='finger'&&currentHint&&tutorial&&<FingerHintOverlay
   hint={currentHint}
   index={fingerIndex}
   total={hints.length}
   onSkip={finishGroup}
   onContinue={afterFinger}
  />}
  {pendingFight&&<StoryDialog
   title={pendingFight.title}
   lines={pendingFight.lines}
   onSkip={()=>setPendingFight(null)}
   onContinue={()=>setPendingFight(null)}
  />}
  {storyOpen&&<StoryDialog
   title={storyOpen.title||`История ${storyOpen.id}`}
   lines={[{key:`StoryChapter_content_${storyOpen.id}`,infoKey:`story_${storyOpen.id}`,text:storyOpen.content||'—'}]}
   onSkip={()=>setStoryOpen(null)}
   onContinue={()=>setStoryOpen(null)}
  />}
 </main>;
}
