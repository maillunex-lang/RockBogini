import {useCallback,useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import '../tower/tower.css';
type Rewards=[number,number][];
type Instance={type:number;maps:number[];clearedMapId:number;clearedCount:number;nextMapId:number|null;nextMap:{requirePower:number;battlePower:number;bg:string;heroIds:number[];rewards:Rewards}|null;freeLeft:number;paidLeft:number;battlePrice:number;clearedRewards:Rewards;canChallenge:boolean};
type InstanceList={instances:Instance[];day:string;freeMax:number;paidMax:number};
type Report={battleId:string;mapId:number;type:number;summary:{resultCode:number};pages:{dataType:number}[];heroes:{heroId:number;camp:number;statDamage:number}[]};
type Result={battleId:string;mapId:number;type:number;result:number;rewards:Rewards};
const names:Record<number,string>={1:'Золото',2:'Опыт',3:'Герои',4:'Талисманы',5:'Ангелы'};
const rewards=(items:Rewards)=>items.length?items.map(([id,n])=>itemDisplayName(id)+' ×'+n.toLocaleString('ru-RU')).join(' · '):'Нет наград';
export function DailyInstanceScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [list,setList]=useState<InstanceList|null>(null);
 const [selected,setSelected]=useState(1);
 const [battle,setBattle]=useState<Report|null>(null);
 const [settled,setSettled]=useState<Result|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [sweepCount,setSweepCount]=useState(1);
 const [sweepMap,setSweepMap]=useState(0);
 const request=useCallback(async<T,>(path:string,method:'GET'|'POST'='GET',body?:unknown):Promise<T>=>{
  const res=await fetch(api+'/v1/daily-instance'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json() as T&{error?:string;cost?:number;required?:number};
  if(!res.ok)throw Error(data.error??'daily_'+res.status);
  return data;
 },[api,token]);
 const load=useCallback(async()=>{
  const data=await request<InstanceList>('');
  setList(data);return data;
 },[request]);
 useEffect(()=>{let mounted=true;load().catch(e=>{if(mounted)setMessage(String(e))});return()=>{mounted=false}},[load]);
 const current=list?.instances.find(i=>i.type===selected)??null;
 useEffect(()=>{setSweepMap(current?.clearedMapId??0);setSweepCount(1)},[current?.clearedMapId,selected]);
 const run=async(fn:()=>Promise<void>)=>{
  if(busy)return;setBusy(true);setMessage('');
  try{await fn()}catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 };
 const reload=()=>void run(async()=>{await load()});
 const challenge=()=>void run(async()=>{
  if(!current?.nextMapId)return;
  setBattle(await request<Report>('/challenge','POST',{type:selected,mapId:current.nextMapId}));
  setSettled(null);
 });
 const settle=()=>void run(async()=>{
  if(!battle)return;
  setSettled(await request<Result>('/settle','POST',{battleId:battle.battleId}));
  setBattle(null);await load();
 });
 const cancel=()=>void run(async()=>{
  if(!battle)return;
  await request('/cancel','POST',{battleId:battle.battleId});
  setBattle(null);
 });
 const resume=()=>void run(async()=>{
  const pending=await request<{report:Report|null}>('/pending');
  setBattle(pending.report);
  if(!pending.report)setMessage('Незавершённого боя нет');
 });
 const sweep=()=>void run(async()=>{
  const result=await request<{count:number;free:number;paid:number;diamonds:number;rewards:Rewards}>('/quick','POST',{type:selected,mapId:sweepMap,count:sweepCount});
  setMessage('Зачистка '+result.count+' × · бесплатно '+result.free+' · за алмазы '+result.paid+' ('+result.diamonds+') · получено: '+rewards(result.rewards));
  await load();
 });
 return <main className="tower-shell">
  <header className="tower-header"><div><small>RockBogini Next / PvE</small><h2>Ежедневные подземелья</h2></div>
   <div className="tower-actions"><button onClick={reload} disabled={busy}>Обновить</button><button onClick={onClose}>В город</button></div>
  </header>
  {message&&<p className="tower-message" role="status">{message}</p>}
  {!battle&&!settled&&<>
   <nav className="tower-types" aria-label="Ресурсы подземелий">
    {(list?.instances??[]).map(i=><button key={i.type} aria-pressed={selected===i.type} onClick={()=>setSelected(i.type)}>
     {names[i.type]??i.type}<small>Пройдено {i.clearedCount}/{i.maps.length}</small></button>)}
   </nav>
   {current&&<section className="tower-panel">
    <h3>{names[selected]} · уровни {current.clearedCount}/{current.maps.length}</h3>
    <p>Следующая карта: {current.nextMapId??'все пройдены'}.
     {current.nextMap&&<> Требуемая мощь: {current.nextMap.requirePower.toLocaleString('ru-RU')}.
     Мощь противников: {current.nextMap.battlePower.toLocaleString('ru-RU')}.</>}</p>
    {current.nextMap&&<p>Награда за прохождение: {rewards(current.nextMap.rewards)}</p>}
    <div className="tower-actions">
     <button disabled={busy||!current.canChallenge||!current.nextMapId} onClick={challenge}>⚔️ Пройти уровень</button>
     <button disabled={busy} onClick={resume}>Продолжить бой</button>
    </div>
    <h3>Повторная зачистка</h3>
    <p>Бесплатно: {current.freeLeft}/{list?.freeMax??2}. Платно: {current.paidLeft}/{list?.paidMax??2}. Цена: {current.battlePrice} алмазов за платную попытку.</p>
    <div className="tower-actions tower-quick">
     <label>Пройденный уровень <select value={sweepMap} onChange={e=>setSweepMap(Number(e.target.value))}>
      <option value={0}>Выберите</option>
      {current.maps.slice(0,current.clearedCount).map(mid=><option key={mid} value={mid}>{mid}</option>)}
     </select></label>
     <label>Раз <input type="number" inputMode="numeric" min={1} max={Math.max(1,current.freeLeft+current.paidLeft)} value={sweepCount} onChange={e=>setSweepCount(Number(e.target.value))}/></label>
     <button disabled={busy||!sweepMap||sweepCount<1||sweepCount>current.freeLeft+current.paidLeft} onClick={sweep}>Зачистить</button>
    </div>
    {current.clearedMapId>0&&<p>Награда последней пройденной карты за зачистку: {rewards(current.clearedRewards)}</p>}
    <p className="tower-note">Первое прохождение не расходует ежедневные попытки. Платные повторы списывают алмазы только после бесплатных.</p>
   </section>}
  </>}
  {battle&&<section className="tower-panel">
   <h3>⚔️ Карта {battle.mapId}</h3><p>{battle.summary.resultCode===2?'Победа':'Поражение'} · Боевых событий {battle.pages.length}</p>
   <div className="tower-stats">{battle.heroes.map((h,i)=><div key={i}><strong>{h.camp===1?'Союзник':'Противник'} {h.heroId}</strong><span>Урон: {Number(h.statDamage??0).toLocaleString('ru-RU')}</span></div>)}</div>
   <div className="tower-actions"><button disabled={busy} onClick={settle}>Завершить бой</button><button disabled={busy} onClick={cancel}>Отменить</button></div>
  </section>}
  {settled&&<section className="tower-panel" role="status">
   <h3>{settled.result===1?'🏆 Победа':'Поражение'}</h3>
   <p>Карта {settled.mapId}: {rewards(settled.rewards)}</p>
   <button onClick={()=>{setSettled(null);setMessage('')}}>Назад к подземельям</button>
  </section>}
 </main>;
}
