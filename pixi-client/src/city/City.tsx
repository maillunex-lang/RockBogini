const cityLabelSprites = {"2020": "MainScene_Furance", "1001": "MainScene_Summon", "1304": "MainScene_MagicResearch", "1013": "CollectionPavilion", "1301": "MainScene_StarTemple", "1008": "MainScene_HeroPalace", "1005": "MainScene_Alliance", "1003": "MainScene_Shop", "1305": "mainScene_angel"} as const;
import React,{useEffect,useState} from 'react';
import './city.css';
import levelThresholds from './levelThresholds.json';
import {sceneLayout} from './sceneLayout';


type Profile={experience?:string;nickname:string;level:number;avatar:number;power:number;currencies:Record<string,string>};

const SHORTCUTS=[
 {id:'mail',label:'Почта',icon:'mail_btn.png'},
 {id:'friends',label:'Друзья',icon:'function_friends.png'},
 {id:'rank',label:'Рейтинг',icon:'function_rank.png'},
 {id:'chat',label:'Чат',icon:'function_chat_main.png'},
 {id:'bag',label:'Инвентарь',icon:'BagBtn.webp'},
 {id:'tasks',label:'Задания',icon:'TaskBtn.webp'},
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

 const thresholds=levelThresholds as Record<string,number>;
 const start=thresholds[String(p?.level??1)]??0,next=thresholds[String((p?.level??1)+1)];
 const xp=Number(p?.experience??0),progress=next===undefined?100:Math.max(0,Math.min(100,(xp-start)/(next-start)*100));
 return <section className="city">
  <header className="city-top">
   <button type="button" onClick={onProfile}>
    <span className="city-avatar-frame">{p&&<img src={'./profile/icon-'+p.avatar+'.webp'} alt=""/>}</span>
    <span className="city-profile-text"><strong>{p?.nickname??'Загрузка…'}</strong><small className="city-level">Ур. {p?.level??'—'}</small></span>
   </button>
   <div className="city-coin" aria-label="Золото"><img className="city-currency-icon" src={import.meta.env.BASE_URL+"item-icons/1.webp"} alt="Золото"/><b>{p?.currencies.coin??'—'}</b></div>
   <div className="city-diamond" aria-label="Алмазы"><img className="city-currency-icon" src={import.meta.env.BASE_URL+"item-icons/3.webp"} alt="Алмазы"/><b>{p?.currencies.diamond??'—'}</b></div>
   <span className="city-power" aria-label={String(p?.power??'—')}>{p?.power!=null?String(p.power).split('').map((digit,i)=>/^[0-9]$/.test(digit)?<img key={i} className="city-power-digit" src={import.meta.env.BASE_URL+'city/fonts/power-'+digit+'.png'} alt={digit}/>:<span key={i}>{digit}</span>):'—'}</span>
   <span className="city-xp" role="progressbar" aria-label="Опыт до следующего уровня" aria-valuenow={Math.round(progress)}><span style={{width:progress+"%"}}/></span>
  </header>

  <aside className="city-shortcuts">
   {SHORTCUTS.map(s=><button
    key={s.id}
    type="button"
    data-guide={s.id==='bag'?'city-bag':undefined}
    onClick={()=>openShortcut(s.id,s.label)}
    aria-label={s.label}
   >
    {s.icon&&<img className="dock-icon" src={'./city/icons/'+s.icon} alt=""/>}
    {s.label}
   </button>)}
  </aside>

  <div className="city-stage" aria-label="Город">
   <div className="city-stage-inner">
    
    <div className="city-buildings">
     {sceneLayout.map(n=><button
      key={n.id}
      type="button"
      className="city-entrance"
      data-guide={n.label==='Призыв'?'city-summon':undefined}
      style={{
       left:(50+n.x/1080*100)+'%',
       top:((1260-n.y)/2520*100)+'%',
       width:(n.width/1080*100)+'%',
      }}
      onClick={()=>openBuilding(n.label)}
     >
      
      <img className="city-original-label" src={import.meta.env.BASE_URL+"city/labels/"+cityLabelSprites[n.id]+".png"} alt={n.label} draggable={false}/>
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
