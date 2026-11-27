import {useCallback,useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import './tasks.css';

type Task={
 id:number;type:number;condition:number[];totalCount:number;point:number;
 sortId:number;rewards:number[][];progress:number;completed:boolean;ready:boolean;
};
type ChestNode={
 index:number;nodeId:number;need:number;rewards:number[][];
 claimed:boolean;claimable:boolean;
};
type PointTrack={type:number;point:number;nodes:ChestNode[]};
type PioneerAchievement={
 id:number;type:number;target:number;myProgress:number;sortId:number;enabled:boolean;
 uniqueReward:number[][];rewardsForAll:number[][];winner:{nickname:string;wonAt:string}|null;
 isWinner:boolean;claimed:boolean;ready:boolean;
};
type PioneerView={achievements:PioneerAchievement[]};
type TasksView={
 main:Task[];daily:Task[];weekly:Task[];points:PointTrack[];
 dailyDay:string;weeklyDay:string;
};

const COND_LABEL:Record<number,string>={
 1062:'Вход в игру',
 1002:'Сбор зависания',
 1010:'Быстрая битва',
 2001:'Пройдено этапов кампании',
 2003:'Уровень игрока',
 2004:'Боевая мощь',
 2007:'Героев нужного уровня',
 1017:'Получено героев 4★',
 1027:'Получено героев 6★',
 1004:'Улучшенный призыв',
 1012:'Пророческий призыв',
 1005:'Призыв',
 1046:'Покупка в магазине',
 1003:'Отправка отряда',
 1008:'Покупка золота',
 1006:'Сражения на арене',
 1009:'Быстрое прохождение ежедневного подземелья',
 1007:'Броски в реликвиях',
};

function taskTitle(t:Task){
 const cond=t.condition[0]??0;
 const base=COND_LABEL[cond]??`Условие ${cond}`;
 const extra=t.condition[1]?` (#${t.condition[1]})`:'';
 return `${base}${extra}`;
}

function rewardText(rows:number[][]){
 return rows.map(([i,n])=>`${itemDisplayName(i)}×${n}`).join(', ');
}

export function TasksScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [data,setData]=useState<TasksView|null>(null);
 const [tab,setTab]=useState<'main'|'daily'|'weekly'|'pioneering'>('main');
 const [pioneers,setPioneers]=useState<PioneerView|null>(null);
 const [status,setStatus]=useState('Загрузка…');
 const [busy,setBusy]=useState(false);

 const load=useCallback(()=>fetch(api+'/v1/tasks',{headers:{Authorization:'Bearer '+token}})
  .then(r=>{if(!r.ok)throw Error('tasks_'+r.status);return r.json() as Promise<TasksView>})
  .then(d=>{setData(d);setStatus('');return d}),[api,token]);

 const loadPioneers=useCallback(()=>fetch(api+'/v1/tasks/pioneering',{headers:{Authorization:'Bearer '+token}})
  .then(r=>{if(!r.ok)throw Error('achievements_'+r.status);return r.json() as Promise<PioneerView>})
  .then(d=>{setPioneers(d);return d}),[api,token]);
 useEffect(()=>{if(tab==='pioneering')void loadPioneers().catch(e=>setStatus(e instanceof Error?e.message:'Ошибка достижений'))},[tab,loadPioneers]);
 const claimPioneer=async(id:number)=>{
  if(busy)return;
  setBusy(true);setStatus('');
  try{
   const res=await fetch(api+'/v1/tasks/pioneering/claim',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({achievementIds:[id]}),
   });
   if(res.status===409){setStatus('Награда недоступна или уже получена');await loadPioneers();return}
   if(!res.ok)throw Error('achievement_claim_'+res.status);
   const body=await res.json() as {rewards:number[][]};
   setStatus('Награда: '+rewardText(body.rewards));
   await loadPioneers();
  }catch(e){setStatus(e instanceof Error?e.message:'Ошибка получения')}
  finally{setBusy(false)}
 };
 useEffect(()=>{
  const c=new AbortController();
  load().catch(e=>{if(!c.signal.aborted)setStatus(e instanceof Error?e.message:'Ошибка')});
  return()=>c.abort();
 },[load]);

 const claimTasks=async(ids:number[])=>{
  if(busy||!ids.length)return;
  setBusy(true);setStatus('');
  try{
   const res=await fetch(api+'/v1/tasks/claim',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({taskIds:ids}),
   });
   if(res.status===409){setStatus('Ещё не готово');await load();return}
   if(!res.ok)throw Error('claim_'+res.status);
   const body=await res.json() as {rewards:number[][]};
   setStatus(`Награда: ${rewardText(body.rewards)||'—'}`);
   await load();
  }catch(e){setStatus(e instanceof Error?e.message:'Ошибка получения')}
  finally{setBusy(false)}
 };

 const claimChest=async(type:number,index:number)=>{
  if(busy)return;
  setBusy(true);setStatus('');
  try{
   const res=await fetch(api+'/v1/tasks/points',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({type,index}),
   });
   if(res.status===409){setStatus('Сундук недоступен');await load();return}
   if(!res.ok)throw Error('chest_'+res.status);
   const body=await res.json() as {rewards:number[][]};
   setStatus(`Сундук: ${rewardText(body.rewards)}`);
   await load();
  }catch(e){setStatus(e instanceof Error?e.message:'Ошибка сундука')}
  finally{setBusy(false)}
 };

 const list=tab==='main'?data?.main??[]:tab==='daily'?data?.daily??[]:tab==='weekly'?data?.weekly??[]:[];
 const track=tab==='main'?undefined:data?.points.find(p=>p.type===(tab==='daily'?2:3));
 const readyIds=list.filter(t=>t.ready).map(t=>t.id);

 return <main className="tasks-screen">
  <header>
   <div>
    <h1>Задания</h1>
    {data&&<p>{tab==='main'?'Оригинальная сюжетная цепочка · 26 заданий':tab==='daily'?`День ${data.dailyDay}`:tab==='weekly'?`Неделя с ${data.weeklyDay}`:'Соревновательные достижения'}</p>}
   </div>
   <div className="tasks-header-actions">
    <div className="tasks-tabs" role="group">
     <button type="button" aria-pressed={tab==='main'} onClick={()=>setTab('main')}>Сюжет</button>
     <button type="button" aria-pressed={tab==='daily'} onClick={()=>setTab('daily')}>Ежедневные</button>
     <button type="button" aria-pressed={tab==='weekly'} onClick={()=>setTab('weekly')}>Еженедельные</button>
     <button type="button" aria-pressed={tab==='pioneering'} onClick={()=>setTab('pioneering')}>Достижения</button>
    </div>
    <button type="button" onClick={onClose}>В город</button>
   </div>
  </header>
  {status&&<p role="status">{status}</p>}
  {tab==='pioneering'&&<section className="tasks-list" aria-label="Соревновательные достижения">
   {(pioneers?.achievements??[]).map(a=><article key={a.id} data-ready={a.ready?'1':'0'} data-done={a.claimed?'1':'0'}>
    <div>
     <strong>{a.type===2?'Первопроходец: боевая мощь':a.type===3?'Межсерверная гонка':'Сезонное соревнование'} #{a.id}</strong>
     <span>{a.enabled?Math.min(a.myProgress,a.target).toLocaleString('ru-RU')+' / '+a.target.toLocaleString('ru-RU'):'Ожидает запуска соревнований'}</span>
     <span>Награды: {rewardText([...a.rewardsForAll,...a.uniqueReward])}</span>
     {a.winner&&<span>Первый победитель: {a.winner.nickname}</span>}
    </div>
    <button type="button" disabled={busy||!a.ready} onClick={()=>void claimPioneer(a.id)}>
     {a.claimed?'Получено':a.ready?'Забрать':!a.enabled?'Недоступно':a.winner?'Победитель определён':'В процессе'}
    </button>
   </article>)}
  </section>}
  {track&&<section className="tasks-points" aria-label="Очки заданий">
   <p>Очки: <strong>{track.point}</strong></p>
   <div className="tasks-chests">
    {track.nodes.map(n=><button
     key={n.index}
     type="button"
     disabled={busy||!n.claimable}
     data-claimed={n.claimed?'1':'0'}
     onClick={()=>void claimChest(track.type,n.index)}
    >
     <strong>{n.need}</strong>
     <span>{n.claimed?'Получено':n.claimable?'Забрать':`Нужно ${n.need}`}</span>
    </button>)}
   </div>
  </section>}
  {!!readyIds.length&&<div className="tasks-claim-all">
   <button type="button" disabled={busy} onClick={()=>void claimTasks(readyIds)}>
    Забрать всё ({readyIds.length})
   </button>
  </div>}
  <section className="tasks-list" aria-label={tab==='main'?'Сюжетные задания':tab==='daily'?'Ежедневные':'Еженедельные'}>
   {list.map(t=>{
    const done=t.completed;
    const ready=t.ready;
    return <article key={t.id} data-ready={ready?'1':'0'} data-done={done?'1':'0'}>
     <div>
      <strong>{taskTitle(t)}</strong>
      <span>{Math.min(t.progress,t.totalCount)} / {t.totalCount}{tab==='main'?'':` · +${t.point} очк.`}</span>
      <span>{rewardText(t.rewards)}</span>
     </div>
     <button type="button" disabled={busy||!ready} onClick={()=>void claimTasks([t.id])}>
      {done?'Готово':ready?'Забрать':'В процессе'}
     </button>
    </article>;
   })}
  </section>
 </main>;
}
