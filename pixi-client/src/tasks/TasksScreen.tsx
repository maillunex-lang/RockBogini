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
type TasksView={
 daily:Task[];weekly:Task[];points:PointTrack[];
 dailyDay:string;weeklyDay:string;
};

const COND_LABEL:Record<number,string>={
 1062:'Вход в игру',
 1002:'Сбор зависания',
 1010:'Быстрая битва',
 1005:'Призыв',
 1046:'Покупка в магазине',
 1003:'Кампания',
 1008:'Герои',
 1006:'Улучшение',
 1009:'Расход энергии',
 1007:'Бой',
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
 const [tab,setTab]=useState<'daily'|'weekly'>('daily');
 const [status,setStatus]=useState('Загрузка…');
 const [busy,setBusy]=useState(false);

 const load=useCallback(()=>fetch(api+'/v1/tasks',{headers:{Authorization:'Bearer '+token}})
  .then(r=>{if(!r.ok)throw Error('tasks_'+r.status);return r.json() as Promise<TasksView>})
  .then(d=>{setData(d);setStatus('');return d}),[api,token]);

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

 const list=tab==='daily'?data?.daily??[]:data?.weekly??[];
 const track=data?.points.find(p=>p.type===(tab==='daily'?2:3));
 const readyIds=list.filter(t=>t.ready).map(t=>t.id);

 return <main className="tasks-screen">
  <header>
   <div>
    <h1>Задания</h1>
    {data&&<p>{tab==='daily'?`День ${data.dailyDay}`:`Неделя с ${data.weeklyDay}`}</p>}
   </div>
   <div className="tasks-header-actions">
    <div className="tasks-tabs" role="group">
     <button type="button" aria-pressed={tab==='daily'} onClick={()=>setTab('daily')}>Ежедневные</button>
     <button type="button" aria-pressed={tab==='weekly'} onClick={()=>setTab('weekly')}>Еженедельные</button>
    </div>
    <button type="button" onClick={onClose}>В город</button>
   </div>
  </header>
  {status&&<p role="status">{status}</p>}
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
  <section className="tasks-list" aria-label={tab==='daily'?'Ежедневные':'Еженедельные'}>
   {list.map(t=>{
    const done=t.completed;
    const ready=t.ready;
    return <article key={t.id} data-ready={ready?'1':'0'} data-done={done?'1':'0'}>
     <div>
      <strong>{taskTitle(t)}</strong>
      <span>{Math.min(t.progress,t.totalCount)} / {t.totalCount} · +{t.point} очк.</span>
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
