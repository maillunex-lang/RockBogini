import {useCallback,useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import '../tower/tower.css';
type Rewards=[number,number][];
type Stage={id:number;monsters:number[];recommendPower:number;heroId:number;pointReward:Rewards;dailyReward:Rewards};
type Mode={type:number;mapIndex:number;rewardIndex:number;completedIndex:number;inBattle:boolean;
 remainingHp:Record<string,number>;buffIds:number[];options:number[];pointRewardCount:number;pointRewardKeys:number[];
 open:boolean;nextStage:Stage|null;nextWaveId:number|null;nextWavePower:number|null;available:boolean};
type AbyssFormation={single:number[];team:number[];heroOptions:{sid:number;heroId:number;power:number}[];positions:number[];formationSids:number[];formationType:number};
type Info={modes:Mode[];roster:{single:number[];team:number[]};pointWaves:number[];buffWaves:number[]};
type Report={battleId:string;mapId:number;waveIndex:number;mapIndex:number;summary:{resultCode:number};pages:{dataType:number}[];heroes:{heroId:number;camp:number;statDamage:number}[]};
type Settlement={battleId:string;mapId:number;type:number;result:number;finished:boolean;progress:number;pointRewardsAvailable:number;buffOptions:number[]};
const names:Record<number,string>={1:'Один герой',2:'Отряд героев'};
const rewardText=(list:Rewards)=>list.length?list.map(([id,n])=>itemDisplayName(id)+' ×'+n.toLocaleString('ru-RU')).join(' · '):'Без наград';
export function AbyssScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [info,setInfo]=useState<Info|null>(null);
 const [selected,setSelected]=useState(1);
 const [battle,setBattle]=useState<Report|null>(null);
 const [result,setResult]=useState<Settlement|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [buffIndex,setBuffIndex]=useState<number|null>(null);
 const [formation,setFormation]=useState<AbyssFormation|null>(null);
 const [single,setSingle]=useState<number[]>([]);
 const [formationDirty,setFormationDirty]=useState(false);
 const request=useCallback(async<T,>(path:string,method:'GET'|'POST'|'PUT'='GET',body?:unknown):Promise<T>=>{
  const res=await fetch(api+'/v1/abyss'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json() as T&{error?:string};
  if(!res.ok)throw Error(data.error??'abyss_'+res.status);
  return data;
 },[api,token]);
 const load=useCallback(async()=>{
  const [r,f]=await Promise.all([request<Info>(''),request<AbyssFormation>('/formation')]);
  setInfo(r);setFormation(f);
  setSingle(f.single);
  return r;
 },[request]);
 const saveFormation=()=>void run(async()=>{
  if(single.filter(Boolean).length===0)throw Error('Выберите хотя бы одного героя');
  const r=await request<{single:number[]}>('/formation','PUT',{single});
  setSingle(r.single);setFormationDirty(false);setMessage('Формация Бездны сохранена');
 });
 useEffect(()=>{let mounted=true;load().catch(e=>{if(mounted)setMessage(String(e))});return()=>{mounted=false}},[load]);
 const current=info?.modes.find(x=>x.type===selected)??null;
 const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
 const reload=()=>void run(async()=>{await load()});
 const challenge=()=>void run(async()=>{
  const body:Record<string,number>={type:selected};
  if(current?.options.length)body.buffIndex=buffIndex??0;
  setBattle(await request<Report>('/challenge','POST',body));
  setResult(null);setBuffIndex(null);await load();
 });
 const settle=()=>void run(async()=>{
  if(!battle)return;
  setResult(await request<Settlement>('/settle','POST',{battleId:battle.battleId}));
  setBattle(null);await load();
 });
 const cancel=()=>void run(async()=>{
  if(!battle)return;
  await request('/cancel','POST',{battleId:battle.battleId});setBattle(null);await load();
 });
 const recover=()=>void run(async()=>{
  const r=await request<{report:Report|null}>('/pending');setBattle(r.report);
  if(!r.report)setMessage('Незавершённого боя нет');
 });
 const points=()=>void run(async()=>{
  const r=await request<{rewards:Rewards}>('/points','POST',{type:selected});
  setMessage('Получено: '+rewardText(r.rewards));await load();
 });
 return <main className="tower-shell">
  <header className="tower-header"><div><small>RockBogini Next / PvE</small><h2>Бесконечная бездна</h2></div>
   <div className="tower-actions"><button disabled={busy} onClick={reload}>Обновить</button><button onClick={onClose}>В город</button></div>
  </header>
  {message&&<p className="tower-message" role="status">{message}</p>}
  {!battle&&!result&&<>
   <nav className="tower-types" aria-label="Режим бездны">
    {(info?.modes??[]).map(x=><button key={x.type} aria-pressed={selected===x.type} onClick={()=>setSelected(x.type)}>
     {names[x.type]}<small>Этап {x.mapIndex+1} · {x.open?'Открыто':'Закрыто'}</small></button>)}
   </nav>
   {current&&<section className="tower-panel">
    {selected===1&&formation&&<>
     <h3>Формация Бездны · 3 одиночных слота</h3>
     <p>Оригинал: формации 101/102/103, позиции 2/5/8 в центре боевого поля.</p>
     <div className="tower-actions">
      {[0,1,2].map((i)=><label key={i}>Герой {i+1}
       <select aria-label={'Герой Бездны '+(i+1)} value={single[i]??0} disabled={busy}
        onChange={e=>{
         const sid=Number(e.target.value);
         setSingle(prev=>prev.map((v,n)=>n===i?sid:sid>0&&v===sid?0:v));
         setFormationDirty(true);
        }}>
        <option value={0}>Не выбран</option>
        {formation.heroOptions.map(h=><option key={h.sid} value={h.sid}>#{h.sid} · герой {h.heroId} · {h.power.toLocaleString('ru-RU')}</option>)}
       </select></label>)}
      <button disabled={busy||!formationDirty||new Set(single.filter(Boolean)).size!==single.filter(Boolean).length} onClick={saveFormation}>Сохранить тройку героев</button>
     </div>
    </>}

    <h3>{names[selected]} · этап {current.mapIndex+1}/70</h3>
    <p>Пройдено этапов: {current.mapIndex}. Волна: {current.rewardIndex+1}/{current.nextStage?.monsters.length??12}.</p>
    <p>{current.open?'Доступно сегодня':'В этот день закрыто'} · Карта {current.nextWaveId??'завершено'}.
     {current.nextWavePower!=null&&<> Сила противников: {current.nextWavePower.toLocaleString('ru-RU')}.</>}</p>
    {current.nextStage&&<p>Рекомендуемая сила: {current.nextStage.recommendPower.toLocaleString('ru-RU')}</p>}
    {!!current.buffIds.length&&<p>Активных усилений: {current.buffIds.join(', ')}</p>}
    {!!current.options.length&&<section aria-label="Выбор усиления">
     <h3>Выберите усиление</h3><div className="tower-actions">
      {current.options.map((id,i)=><button key={i} aria-pressed={buffIndex===i} onClick={()=>setBuffIndex(i)}>Усиление №{id}</button>)}
     </div></section>}
    <div className="tower-actions">
     <button disabled={busy||!current.available||(selected===1&&(formationDirty||!formation?.single.some(Boolean)))||(!!current.options.length&&buffIndex===null)} onClick={challenge}>⚔️ Начать волну</button>
     <button disabled={busy} onClick={recover}>Восстановить бой</button>
     <button disabled={busy||current.pointRewardCount===0} onClick={points}>Получить промежуточные награды ({current.pointRewardCount})</button>
    </div>
    <p className="tower-note">Прогресс волн, здоровье героев и выбранные усиления сохраняются сервером. Режимы открываются по дням недели.</p>
   </section>}
  </>}
  {battle&&<section className="tower-panel">
   <h3>⚔️ Этап {battle.mapIndex}, волна {battle.waveIndex}</h3>
   <p>{battle.summary.resultCode===2?'Победа':'Поражение'} · Событий: {battle.pages.length}</p>
   <div className="tower-stats">{battle.heroes.map((h,i)=><div key={i}><strong>{h.camp===1?'Герой':'Враг'} {h.heroId}</strong><span>Урон: {Number(h.statDamage??0).toLocaleString('ru-RU')}</span></div>)}</div>
   <div className="tower-actions"><button disabled={busy} onClick={settle}>Завершить волну</button><button disabled={busy} onClick={cancel}>Отменить</button></div>
  </section>}
  {result&&<section className="tower-panel" role="status">
   <h3>{result.result===1?'🏆 Волна пройдена':'Поражение'}</h3>
   <p>{result.finished?'Этап успешно завершён!':'Пройдено волн в текущем этапе: '+result.progress}</p>
   {!!result.buffOptions.length&&<p>Доступны новые усиления: {result.buffOptions.join(', ')}</p>}
   <button onClick={()=>{setResult(null);setBuffIndex(null)}}>Вернуться к Бездне</button>
  </section>}
 </main>;
}
