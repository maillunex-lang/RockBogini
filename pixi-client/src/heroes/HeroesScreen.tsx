import {FormationScreen} from './FormationScreen';
import {skillNames} from './skillNames';
import React,{useEffect,useState} from 'react';
import './heroes.css';
import {heroDisplayName} from '../shared/heroNames';

type StarPreview={
 nextStar:number|null;
 maxStar:number;
 heroMaterials:[number,number,number][];
 itemMaterials:[number,number][];
 needsFodder:boolean;
};

type TalentInfo={pve:number;pvp:number;max:number;pveUnlocked:boolean;pvpUnlocked:boolean};
type JobNode={
 index:number;jobId:number;pre:number;unlocked:boolean;canUnlock:boolean;
 materials:[number,number][];condition:number[][];skill:number;
};
type LuckSlot={index:number;id:number;unlocked:boolean;needStar:number;type?:number;quality?:number;power?:number};
type Hero={
 Sid:number;HeroId:number;Level:number;StarLevel:number;Power:number;
 Attrs:Record<string,number>;Skills:number[];
 PVETalentLevel?:number;PVPTalentLevel?:number;
 Job?:number;JobMap?:Record<string,number>;
 LuckSkill1?:number;LuckSkill2?:number;
 base:{attrs:Record<string,number>;power:number};
 skillSlots:{id:number;unlockLevel:number;unlocked:boolean}[];
 maxLevel?:number;
 maxStar?:number;
 starPreview?:StarPreview;
 talent?:TalentInfo;
 jobs?:JobNode[];
 luck?:{slots:LuckSlot[]};
};

const ATTR_LABEL:Record<string,string>={'0':'Атака','1':'ОЗ','2':'Защита','3':'Скорость'};
const MAT_TYPE:Record<number,string>={1:'тот же герой',2:'связка',3:'та же стихия',4:'любой',5:'только копия'};
const SLOT_STARTER:Record<number,number>={1:40111,2:40211,3:40311,4:40411};
const SLOT_NAME:Record<number,string>={1:'Оружие',2:'Броня',3:'Шлем',4:'Аксессуар'};
type EquipSlot={
 slot:number;
 equip:{Sid:number;ItemId:number;score:number;star:number;Xp?:number}|null;
 nextId?:number|null;
 nextNeed?:number|null;
 ownXp?:number;
};

export function HeroesScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [formation,setFormation]=useState(false);
 const [heroes,setHeroes]=useState<Hero[]>([]);
 const [selected,setSelected]=useState<number|null>(null);
 const [equipSlots,setEquipSlots]=useState<EquipSlot[]>([]);
 const [status,setStatus]=useState('Загрузка…');
 const [busy,setBusy]=useState(false);

 const applyList=(list:Hero[])=>setHeroes(list);

 const loadEquip=async(sid:number)=>{
  try{
   const r=await fetch(`${api}/v1/heroes/${sid}/equipment`,{headers:{Authorization:'Bearer '+token}});
   if(!r.ok)return;
   const j=await r.json();
   setEquipSlots(j.slots??[]);
  }catch{/* ignore */}
 };

 useEffect(()=>{
  const c=new AbortController();
  fetch(api+'/v1/heroes',{headers:{Authorization:'Bearer '+token},signal:c.signal})
   .then(r=>{if(!r.ok)throw Error();return r.json()})
   .then(d=>{applyList(d.heroes);setStatus('')})
   .catch(()=>{if(!c.signal.aborted)setStatus('Не удалось загрузить героев')});
  return()=>c.abort();
 },[api,token]);

 useEffect(()=>{
  if(selected==null){setEquipSlots([]);return}
  void loadEquip(selected);
 },[api,token,selected]);

 const grow=async(path:string,sid:number,body?:object,label?:string)=>{
  if(busy)return;
  setBusy(true);setStatus(label??'Улучшение…');
  try{
   const r=await fetch(`${api}/v1/heroes/${sid}/${path}`,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(body??{}),
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||path+'_'+r.status);
   if(Array.isArray(j.heroes))applyList(j.heroes);
   else setHeroes(hs=>hs.map(h=>h.Sid===sid?{...h,...j.hero}:h));
   if(path==='level')setStatus(`Уровень → ${j.hero.Level}`);
   else if(path==='star')setStatus(`Звезда → ${j.hero.StarLevel}${j.fodder?.length?` · списано ${j.fodder.length} героев`:''}`);
   else if(path==='talent')setStatus(`Талант PVE → ${j.hero.PVETalentLevel??j.hero.talent?.pve??'?'}`);
   else if(path==='talent/reset')setStatus('Талант сброшен');
   else if(path==='job')setStatus(j.unlocked?`Профессия открыта → ${j.hero.Job}`:`Профессия → ${j.hero.Job}`);
   else if(path==='job/reset')setStatus('Ветки профессий сброшены');
   else if(path==='luck')setStatus(`Удача → слот изучен (${j.hero.LuckSkill1||0}/${j.hero.LuckSkill2||0})`);
   else if(path==='luck/clear')setStatus('Удача сброшена');
   else setStatus('Готово');
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось улучшить героя');
  }finally{setBusy(false)}
 };

 const equipAct=async(kind:'put-on'|'put-off'|'forge',body:object,label:string)=>{
  if(busy||selected==null)return;
  setBusy(true);setStatus(label);
  try{
   const r=await fetch(`${api}/v1/equipment/${kind}`,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(body),
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||kind+'_'+r.status);
   await loadEquip(selected);
   if(kind==='forge')setStatus(`Ковка → #${j.after?.ItemId} (xp ${j.after?.Xp??0})`);
   else setStatus(kind==='put-on'?'Экипировано':'Снято');
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось изменить экипировку');
  }finally{setBusy(false)}
 };

 const h=heroes.find(x=>x.Sid===selected);
 if(formation)return <FormationScreen api={api} token={token} onClose={()=>setFormation(false)}/>;

 const canStar=!!h&&h.starPreview?.nextStar!=null;
 const needsFodder=!!h?.starPreview?.needsFodder;

 return <main className="heroes-screen">
  <header>
   <h1>Герои</h1>
   <button type="button" onClick={onClose}>Вернуться в город</button>
  </header>
  {status&&<p role="status">{status}</p>}
  <button type="button" onClick={()=>setFormation(true)}>Боевой отряд</button>
  <p>В коллекции: {heroes.length}</p>
  <div className="heroes-grid">{heroes.map(x=>(
   <button key={x.Sid} type="button" aria-pressed={selected===x.Sid} onClick={()=>setSelected(x.Sid)}>
    <img src={'./profile/icon-'+x.HeroId+'.webp'} alt="" onError={e=>{e.currentTarget.style.visibility='hidden'}}/>
    <strong>{heroDisplayName(x.HeroId)}</strong>
    <span>Ур. {x.Level} · ★ {x.StarLevel}</span>
    <span>Мощь: {x.Power}</span>
   </button>
  ))}</div>
  {h&&<section className="hero-detail" aria-label="Характеристики героя">
   <h2>{heroDisplayName(h.HeroId)}</h2>
   <p>Ур. {h.Level}/{h.maxLevel??'—'} · ★ {h.StarLevel}/{h.maxStar??'—'} · Мощь {h.Power}</p>
   <div className="hero-growth">
    <button type="button" disabled={busy||h.Level>=(h.maxLevel??0)} onClick={()=>void grow('level',h.Sid,{newLevel:h.Level+1},'Повышение уровня…')}>+1 уровень</button>
    <button type="button" disabled={busy||h.Level>=(h.maxLevel??0)} onClick={()=>void grow('level',h.Sid,{newLevel:Math.min(h.Level+5,h.maxLevel??h.Level+5)},'Повышение уровня…')}>+5 уровней</button>
    <button type="button" disabled={busy||!canStar} onClick={()=>void grow('star',h.Sid,needsFodder?{auto:true}:{},'Повышение звезды…')}>
     ★ +1{needsFodder?' (авто-корм)':''}
    </button>
    <button type="button" disabled={busy||!h.talent?.pveUnlocked} onClick={()=>void grow('talent',h.Sid,{type:1,count:1,auto:true},'Талант…')}>
     Талант PVE +1 ({h.talent?.pve??h.PVETalentLevel??0}/{h.talent?.max??'—'})
    </button>
    <button type="button" disabled={busy||!(h.talent?.pve||h.PVETalentLevel)} onClick={()=>void grow('talent/reset',h.Sid,{type:1},'Сброс таланта…')}>
     Сброс PVE
    </button>
   </div>
   {!h.talent?.pveUnlocked&&<p className="hero-star-req">Таланты открываются с ★{10}+ (сейчас ★{h.StarLevel}).</p>}
   {h.starPreview?.needsFodder&&h.starPreview.heroMaterials.length>0&&(
    <p className="hero-star-req">Для ★{h.starPreview.nextStar}: {h.starPreview.heroMaterials.map(([t,st,n])=>`${n}× ${MAT_TYPE[t]??t} ★${st}`).join('; ')}</p>
   )}
   {!!h.jobs?.length&&(
    <div className="hero-jobs">
     <h3>Профессии {h.Job?`· активна ${h.Job}`:''}</h3>
     <button type="button" disabled={busy||!Object.keys(h.JobMap||{}).length} onClick={()=>void grow('job/reset',h.Sid,{},'Сброс профессий…')}>
      Сброс веток
     </button>
     <ul>
      {h.jobs.map(j=>(
       <li key={j.index}>
        <span>#{j.index} · {j.jobId}{j.unlocked?' ✓':''}{h.Job===j.jobId?' ★':''}</span>
        {j.unlocked?(
         <button type="button" disabled={busy||h.Job===j.jobId} onClick={()=>void grow('job',h.Sid,{index:j.index},'Смена профессии…')}>Выбрать</button>
        ):(
         <button type="button" disabled={busy||!j.canUnlock} onClick={()=>void grow('job',h.Sid,{index:j.index},'Открытие профессии…')}>
          Открыть{j.materials.length?` (${j.materials.map(([id,n])=>`${n}×${id}`).join(', ')})`:''}
         </button>
        )}
       </li>
      ))}
     </ul>
     {h.StarLevel<12&&<p className="hero-star-req">Корни профессий открываются с ★12 (сейчас ★{h.StarLevel}).</p>}
    </div>
   )}
   <div className="hero-equip">
    <h3>Экипировка</h3>
    <ul>
     {[1,2,3,4].map(slot=>{
      const info=equipSlots.find(s=>s.slot===slot);
      const worn=info?.equip??null;
      const starter=SLOT_STARTER[slot];
      return <li key={slot}>
       <span>{SLOT_NAME[slot]}: {worn?`#${worn.ItemId} ★${worn.star} · ${worn.score}`:'пусто'}{info?.nextId?` → #${info.nextId} (нужно ${info.nextNeed} xp, сейчас ${info.ownXp})`:worn?' · макс':''}</span>
       {worn?(
        <>
         <button type="button" disabled={busy||!info?.nextId} onClick={()=>void equipAct('forge',{sid:worn.Sid,materials:[{itemId:starter,count:1}]},'Ковка…')}>
          Ковка +{starter}
         </button>
         <button type="button" disabled={busy} onClick={()=>void equipAct('put-off',{sid:worn.Sid},'Снятие…')}>Снять</button>
        </>
       ):(
        <button type="button" disabled={busy} onClick={()=>void equipAct('put-on',{itemId:starter,ownerId:h.Sid},'Надевание…')}>
         Надеть #{starter}
        </button>
       )}
      </li>;
     })}
    </ul>
   </div>
   {!!h.luck?.slots?.length&&(
    <div className="hero-luck">
     <h3>Удача</h3>
     <ul>
      {h.luck.slots.map(slot=>{
       const next=slot.id===101?201:slot.id===201?301:slot.id===301?401:0;
       return <li key={slot.index}>
        <span>Слот {slot.index}: {slot.id?`#${slot.id} Q${slot.quality??'?'}`:'пусто'}{slot.unlocked?'':' · 🔒 ★'+slot.needStar}</span>
        {!slot.id&&(
         <button type="button" disabled={busy||!slot.unlocked} onClick={()=>void grow('luck',h.Sid,{index:slot.index,type:1,param:slot.index===1?101:102},'Изучение удачи…')}>
          Изучить {slot.index===1?'#101':'#102'}
         </button>
        )}
        {!!slot.id&&!!next&&(
         <button type="button" disabled={busy||!slot.unlocked} onClick={()=>void grow('luck',h.Sid,{index:slot.index,type:1,param:next},'Усиление удачи…')}>
          Усилить → #{next}
         </button>
        )}
        {!!slot.id&&(
         <button type="button" disabled={busy} onClick={()=>void grow('luck/clear',h.Sid,{index:slot.index,type:1},'Сброс удачи…')}>Забыть</button>
        )}
       </li>;
      })}
     </ul>
    </div>
   )}
   {Object.keys(h.Attrs||{}).length===0?<p>Характеристики ещё не рассчитаны</p>:(
    <dl>{Object.entries(ATTR_LABEL).map(([k,n])=><React.Fragment key={k}><dt>{n}</dt><dd>{h.Attrs[k]??'—'}</dd></React.Fragment>)}</dl>
   )}
   <h3>Базовые расчётные характеристики</h3>
   <p>Мощь без дополнительных бонусов: {h.base.power}</p>
   <dl>{Object.entries(ATTR_LABEL).map(([k,n])=><React.Fragment key={k}><dt>{n}</dt><dd>{h.base.attrs[k]??'—'}</dd></React.Fragment>)}</dl>
   <h3>Способности</h3>
   {h.skillSlots.map((slot,i)=>(
    <article key={i} className="hero-skill">
     <strong>{skillNames[slot.id]?.name??'Способность №'+slot.id}</strong>
     <p>{skillNames[slot.id]?.description??'Описание ещё не переведено'}</p>
     <small>{slot.unlocked?'Открыта':'Откроется на уровне '+slot.unlockLevel}</small>
    </article>
   ))}
  </section>}
 </main>;
}
