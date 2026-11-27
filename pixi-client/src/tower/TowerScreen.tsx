import {useCallback,useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import './tower.css';

type Reward=[number,number];
type TowerFloor={firstClearRewards:Reward[];dailyRewards:Reward[];extraRewards:Reward[];quickBattlePower:number};
type Tower={type:number;mapIndex:number;maxCount:number;open:boolean;available:boolean;
 nextMapId:number|null;nextFloor:TowerFloor|null;nextMap:{bg:string;battlePower:number;heroIds:number[]}|null;
 extraRewardIndex:number;dailyRewardIndex:number;dailyClaimed:boolean;battleCount:number;extraCount:number;maxDailyBattles:number};
type TowerFormations={rosters:Record<string,{formationType:number;heroIds:number[]}>;sids:number[];
 formations:{Id:number;Data:number[]}[];heroOptions:{sid:number;heroId:number;power:number}[]};
type TowerList={towers:Tower[];weekday:number};
type TowerBattle={battleId:string;mapId:number;summary:{resultCode:number};pages:{dataType:number;round:number;skillId?:number}[];heroes:{heroId:number;camp:number;statDamage:number;statHurt:number}[]};
type TowerSettlement={battleId:string;mapId:number;type:number;mapIndex:number;result:number;rewards:Reward[]};
const names:Record<number,string>={99:'Башня испытаний',199:'Трудная башня',1:'Башня сердца',2:'Башня силы',3:'Башня техники',4:'Башня прорыва',5:'Башня битвы',101:'Высшая башня сердца',102:'Высшая башня силы',103:'Высшая башня техники',104:'Высшая башня прорыва',105:'Высшая башня битвы'};
const rewards=(items:Reward[])=>items.length?items.map(([id,n])=>itemDisplayName(id)+' ×'+n.toLocaleString('ru-RU')).join(' · '):'Без наград';
export function TowerScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [list,setList]=useState<TowerList|null>(null);
 const [selected,setSelected]=useState(99);
 const [battle,setBattle]=useState<TowerBattle|null>(null);
 const [settled,setSettled]=useState<TowerSettlement|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [quickEnd,setQuickEnd]=useState(1);
 const [towerForms,setTowerForms]=useState<TowerFormations|null>(null);
 const [towerHeroes,setTowerHeroes]=useState<number[]>([0,0,0,0,0,0]);
 const [towerLayout,setTowerLayout]=useState(101);
 const [towerDirty,setTowerDirty]=useState(false);
 const request=useCallback(async<T,>(path:string,method:'GET'|'POST'|'PUT'='GET',body?:unknown):Promise<T>=>{
  const res=await fetch(api+'/v1/tower'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json() as T&{error?:string};
  if(!res.ok)throw Error(data.error??'tower_'+res.status);
  return data;
 },[api,token]);
 const load=useCallback(async()=>{
  const info=await request<TowerList>('');
  const forms=await request<TowerFormations>('/formations');
  setList(info);setTowerForms(forms);
  return info;
 },[request]);
 useEffect(()=>{let mounted=true;load().then(()=>{if(mounted)setMessage('')}).catch(e=>{if(mounted)setMessage(String(e))});return()=>{mounted=false}},[load]);
 useEffect(()=>{setQuickEnd((list?.towers.find(x=>x.type===selected)?.mapIndex??0)+1)},[list,selected]);
 const current=list?.towers.find(x=>x.type===selected)??null;
 const elemental=![99,199].includes(selected);
 const formRoot=selected>=101?selected-100:selected;
 useEffect(()=>{
  const saved=towerForms?.rosters[String(formRoot)];
  setTowerHeroes(saved?.heroIds??[0,0,0,0,0,0]);
  setTowerLayout(saved?.formationType??101);
  setTowerDirty(false);
 },[towerForms,formRoot]);

 const run=async(fn:()=>Promise<void>)=>{
  if(busy)return;
  setBusy(true);setMessage('');
  try{await fn()}catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 };
 const reload=()=>void run(async()=>{await load()});
 const action=(path:string,body:unknown)=>void run(async()=>{
  const result=await request<{rewards:Reward[]}>(path,'POST',body);
  setMessage('Получено: '+rewards(result.rewards));
  await load();
 });
 const saveTower=()=>void run(async()=>{
  if(!towerHeroes.some(Boolean))throw Error('Выберите героев элементальной башни');
  await request('/formation','PUT',{type:formRoot,formationType:towerLayout,heroIds:towerHeroes});
  setTowerDirty(false);setMessage('Отряд элементальной башни сохранён');
  await load();
 });
 const start=()=>void run(async()=>{
  if(!current)return;
  const r=await request<TowerBattle>('/challenge','POST',{type:selected,mapIndex:current.mapIndex+1});
  setBattle(r);setSettled(null);
 });
 const settle=()=>void run(async()=>{
  if(!battle)return;
  const result=await request<TowerSettlement>('/settle','POST',{battleId:battle.battleId});
  setSettled(result);setBattle(null);
  await load();
 });
 const cancel=()=>void run(async()=>{
  if(!battle)return;
  await request<{cancelled:boolean}>('/cancel','POST',{battleId:battle.battleId});
  setBattle(null);setSettled(null);
 });
 const retryPending=()=>void run(async()=>{
  const pending=await request<{report:TowerBattle|null}>('/pending');
  setBattle(pending.report);
  if(!pending.report)setMessage('Активного боя нет');
 });
 return <main className="tower-shell">
  <header className="tower-header">
   <div><small>RockBogini Next / PvE</small><h2>Башни испытаний</h2></div>
   <div className="tower-actions"><button type="button" onClick={reload} disabled={busy}>Обновить</button><button type="button" onClick={onClose}>В город</button></div>
  </header>
  {message&&<p role="status" className="tower-message">{message}</p>}
  {!battle&&!settled&&<>
   <nav className="tower-types" aria-label="Выбор башни">
    {(list?.towers??[]).map(t=><button type="button" key={t.type} aria-pressed={selected===t.type} onClick={()=>setSelected(t.type)}>{names[t.type]??'Башня '+t.type}<small>Этаж {t.mapIndex}/{t.maxCount}</small></button>)}
   </nav>
   {current&&<section className="tower-panel">
    <div className="tower-info">
     <h3>{names[current.type]??'Башня '+current.type}</h3>
     <p>Открыто: {current.open?'Да':'Нет, другой день'} · Следующий этаж: {current.mapIndex+1} · Пройдено: {current.mapIndex}</p>
     {current.type!==99&&current.type!==199&&<p>Использовано попыток: {current.battleCount}/{current.maxDailyBattles+current.extraCount}</p>}
     {current.nextMap&&<p>Сила противников: {current.nextMap.battlePower.toLocaleString('ru-RU')} · Противников: {current.nextMap.heroIds.length}</p>}
     {current.nextFloor&&<p>Первое прохождение: {rewards(current.nextFloor.firstClearRewards)}</p>}
    </div>
    {elemental&&towerForms&&<div className="tower-formation">
     <h3>Отряд элементальной башни · Sid {140+formRoot}</h3>
     <p>Обычная и высшая башни одной стихии используют один сохранённый состав, независимо от основного отряда.</p>
     <label>Построение
      <select aria-label="Построение башни" value={towerLayout} disabled={busy}
       onChange={e=>{setTowerLayout(Number(e.target.value));setTowerDirty(true)}}>
       {towerForms.formations.map(f=><option key={f.Id} value={f.Id}>Построение {f.Id}</option>)}
      </select>
     </label>
     <div className="tower-formation-grid">
      {[0,1,2,3,4,5].map(i=><label key={i}>
       Позиция {towerForms.formations.find(f=>f.Id===towerLayout)?.Data[i]??i+1}
       <select aria-label={'Герой башни '+(i+1)} value={towerHeroes[i]??0} disabled={busy}
        onChange={e=>{
         const sid=Number(e.target.value);
         setTowerHeroes(old=>old.map((v,n)=>n===i?sid:sid>0&&v===sid?0:v));
         setTowerDirty(true);
        }}>
        <option value={0}>Не выбран</option>
        {towerForms.heroOptions.map(h=><option key={h.sid} value={h.sid}>#{h.sid} · герой {h.heroId} · {h.power.toLocaleString('ru-RU')}</option>)}
       </select>
      </label>)}
     </div>
     <button disabled={busy||!towerDirty||new Set(towerHeroes.filter(Boolean)).size!==towerHeroes.filter(Boolean).length}
      onClick={saveTower}>Сохранить отряд башни</button>
    </div>}
    <div className="tower-actions">
     <button type="button" disabled={busy||!current.open||!current.available||!current.nextFloor||(elemental&&(towerDirty||!towerForms?.rosters[String(formRoot)]?.heroIds.some(Boolean)))} onClick={start}>⚔️ Начать бой</button>
     <button type="button" disabled={busy||current.mapIndex===0||current.extraRewardIndex>=current.mapIndex} onClick={()=>action('/extra',{type:selected,mapIndex:current.mapIndex})}>Дополнительные награды</button>
     {[99,199].includes(selected)&&<button type="button" disabled={busy||current.dailyClaimed} onClick={()=>action('/daily',{type:selected})}>Ежедневная награда</button>}
     {[99,199].includes(selected)&&<div className="tower-quick"><label>До этажа <input inputMode="numeric" type="number" min={current.mapIndex+1} max={Math.min(current.mapIndex+100,current.maxCount)} value={quickEnd} onChange={e=>setQuickEnd(Number(e.target.value))}/></label>
      <button type="button" disabled={busy||quickEnd<=current.mapIndex||quickEnd>Math.min(current.maxCount,current.mapIndex+100)} onClick={()=>action('/quick',{type:selected,from:current.mapIndex+1,to:quickEnd})}>Быстрый проход</button>
     </div>}
    </div>
    <p className="tower-note">Битва и награды рассчитываются сервером. Быстрый проход требует необходимой боевой мощи.</p>
   </section>}
   <button type="button" className="tower-recover" disabled={busy} onClick={retryPending}>Продолжить незавершённый бой</button>
  </>}
  {battle&&<section className="tower-panel">
   <h3>⚔️ Бой за этаж {battle.mapId}</h3>
   <p>{battle.summary.resultCode===2?'Победа!':'Бой завершён без победы'} · Событий: {battle.pages.length}</p>
   <div className="tower-stats">{battle.heroes.map((h,i)=><div key={i}><strong>{h.camp===1?'Союзник':'Противник'} {h.heroId}</strong><span>Урон: {Number(h.statDamage??0).toLocaleString('ru-RU')}</span></div>)}</div>
   <div className="tower-actions"><button disabled={busy} onClick={settle}>Завершить и получить результат</button><button disabled={busy} onClick={cancel}>Отменить бой</button></div>
  </section>}
  {settled&&<section className="tower-panel" role="status">
   <h3>{settled.result===1?'🏆 Этаж пройден!':'Поражение'}</h3>
   <p>Этаж {settled.mapIndex}: {rewards(settled.rewards)}</p>
   <button onClick={()=>{setSettled(null);setMessage('')}}>Вернуться к башням</button>
  </section>}
 </main>;
}
