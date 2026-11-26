import React,{useEffect,useState} from 'react';
import './city.css';
import {sceneLayout} from './sceneLayout';
import {CitySpine} from './CitySpine';

type Profile={nickname:string;level:number;avatar:number;power:number;currencies:Record<string,string>};

const SHORTCUTS=[
 {id:'mail',label:'Почта',icon:null as string|null},
 {id:'friends',label:'Друзья',icon:null},
 {id:'rank',label:'Рейтинг',icon:null},
 {id:'bag',label:'Инвентарь',icon:'BagBtn'},
 {id:'tasks',label:'Задания',icon:'TaskBtn'},
] as const;

export function City({api,token,onProfile,onBattle,onHeroes,onInventory,onSummon,onShop,onTasks}:{
 api:string;token:string;onProfile:()=>void;onBattle:()=>void;onHeroes:()=>void;
 onInventory?:()=>void;onSummon?:()=>void;onShop?:()=>void;onTasks?:()=>void;
}){
 const [p,setP]=useState<Profile|null>(null),[notice,setNotice]=useState(''),[panel,setPanel]=useState('');
 useEffect(()=>{
  const c=new AbortController();
  fetch(api+'/v1/profile',{headers:{Authorization:'Bearer '+token},signal:c.signal})
   .then(r=>{if(!r.ok)throw Error();return r.json()})
   .then(setP)
   .catch(()=>{if(!c.signal.aborted)setNotice('Не удалось загрузить профиль')});
  return()=>c.abort();
 },[api,token]);

 const unavailable=(name:string)=>{setPanel(name);setNotice(name+' — ещё не перенесено')};
 const openShortcut=(id:string,label:string)=>{
  if(id==='bag'&&onInventory){onInventory();return}
  if(id==='tasks'&&onTasks){onTasks();return}
  unavailable(label);
 };
 const openBuilding=(label:string)=>{
  if(label==='Призыв'&&onSummon){onSummon();return}
  if(label==='Магазин'&&onShop){onShop();return}
  unavailable(label);
 };

 return <section className="city">
  <header className="city-top">
   <button type="button" onClick={onProfile}>
    {p&&<img src={'./profile/icon-'+p.avatar+'.webp'} alt=""/>}
    <span>Профиль<br/>{p?.nickname??'Загрузка…'} · Ур. {p?.level??'—'}</span>
   </button>
   <div className="city-coin">Золото <b>{p?.currencies.coin??'—'}</b></div>
   <div className="city-diamond">Алмазы <b>{p?.currencies.diamond??'—'}</b></div>
  </header>

  <div className="city-power">Боевая мощь: {p?.power??'—'}</div>

  <aside className="city-shortcuts">
   {SHORTCUTS.map(s=><button
    key={s.id}
    type="button"
    data-guide={s.id==='bag'?'city-bag':undefined}
    onClick={()=>openShortcut(s.id,s.label)}
   >
    {s.icon&&<img className="dock-icon" src={'./city/icons/'+s.icon+'.webp'} alt=""/>}
    {s.label}
   </button>)}
  </aside>

  <div className="city-stage" aria-label="Город">
   <div className="city-stage-inner">
    <CitySpine kind="baitian" className="city-ambient"/>
    <div className="city-buildings">
     {sceneLayout.map(n=><button
      key={n.id}
      type="button"
      className="city-entrance"
      data-guide={n.label==='Призыв'?'city-summon':undefined}
      style={{
       left:(50+n.x/1080*100)+'%',
       top:((672-n.y)/1117*84+8)+'%',
       width:(n.width/1080*100)+'%',
      }}
      onClick={()=>openBuilding(n.label)}
     >
      <CitySpine kind="biaoti" className="city-title-fx"/>
      <span className="city-entrance-label">{n.label}</span>
     </button>)}
    </div>
   </div>
  </div>

  {panel&&<div className="city-overlay" onClick={()=>{setPanel('');setNotice('')}}>
   <section role="dialog" aria-modal="true" aria-label={panel} onClick={e=>e.stopPropagation()}>
    <header><strong>{panel}</strong><button type="button" aria-label="Закрыть" onClick={()=>{setPanel('');setNotice('')}}>×</button></header>
    <p role="status">{notice}</p>
   </section>
  </div>}

  <nav className="city-nav">
   <button type="button" data-guide="city-nav-main" onClick={()=>setNotice('')}>
    <img className="dock-icon" src="./city/icons/btn_main_check.webp" alt=""/>Город
   </button>
   <button type="button" onClick={()=>unavailable('Мир')}>
    <img className="dock-icon" src="./city/icons/btn_world_uncheck.webp" alt=""/>Мир
   </button>
   <button type="button" data-guide="city-nav-battle" onClick={onBattle}>
    <img className="dock-icon" src="./city/icons/btn_battle_uncheck.webp" alt=""/>Кампания
   </button>
   <button type="button" data-guide="city-nav-hero" onClick={onHeroes}>
    <img className="dock-icon" src="./city/icons/btn_hero_uncheck.webp" alt=""/>Герои
   </button>
   <button type="button" data-guide="city-nav-shop" onClick={()=>{if(onShop){onShop();return}unavailable('Магазин')}}>
    <img className="dock-icon" src="./city/icons/btn_shop_uncheck.webp" alt=""/>Магазин
   </button>
  </nav>
 </section>;
}
