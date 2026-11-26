import {FormationScreen} from './FormationScreen';
import {skillNames} from './skillNames';
import React,{useEffect,useState} from 'react';
import './heroes.css';
import heroVisualCatalog from './heroVisualCatalog.json';
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
const HOLY_STARTER:Record<number,number>={1:41001,2:41002,3:41003,4:41004};
const SLOT_NAME:Record<number,string>={1:'Оружие',2:'Броня',3:'Шлем',4:'Аксессуар'};
type EquipSlot={
 slot:number;
 equip:{Sid:number;ItemId:number;score:number;star:number;Xp?:number}|null;
 nextId?:number|null;
 nextNeed?:number|null;
 ownXp?:number;
};
type HolyBlessing={BlessingId:number;Level:number;Xp:number;Pool:number[]};
type HolySlot={
 slot:number;
 equip:{
  Sid:number;ItemId:number;Star:number;Level:number;Xp:number;Step?:number;Stage?:number;score:number;
  GallerySlot?:number;
  Blessing1?:HolyBlessing|null;Blessing2?:HolyBlessing|null;blessingUnlock?:number[];
 }|null;
 maxLevel?:number;
 nextStar?:{value:number;materials:[number,number][]}|null;
 nextStep?:{value:number;materials:[number,number][]}|null;
 nextSoul?:{stage:number;itemId:number;count:number;unlockStar:number;ready:boolean}|null;
};
type GalleryType={
 type:number;level:number;nextCost:[number,number][];
 slots:{id:number;requirements:number;open:boolean;equip:{Sid:number;ItemId:number}|null}[];
};
type GalleryInfo={levels:number[];types:GalleryType[];resonance:{id:number;requirements:number}|null};

export function HeroesScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [formation,setFormation]=useState(false);
 const [heroView,setHeroView]=useState<'card'|'portrait'>('card');
 const [heroSort,setHeroSort]=useState<'power'|'level'|'star'>('power');
 const [heroElement,setHeroElement]=useState(0);
 const [heroes,setHeroes]=useState<Hero[]>([]);
 const [selected,setSelected]=useState<number|null>(null);
 const [equipSlots,setEquipSlots]=useState<EquipSlot[]>([]);
 const [holySlots,setHolySlots]=useState<HolySlot[]>([]);
 const [gallery,setGallery]=useState<GalleryInfo|null>(null);
 const [displace,setDisplace]=useState<{
  eligible:boolean;reason?:string;cost?:{itemId:number;amount:number};
  currency?:{itemId:number;amount:number};
  pending?:{sid:number;oldHeroId:number;newHeroId:number}|null;
 }|null>(null);
 const [status,setStatus]=useState('Загрузка…');
 const [busy,setBusy]=useState(false);

 const applyList=(list:Hero[])=>setHeroes(list);

 const loadGallery=async()=>{
  try{
   const r=await fetch(`${api}/v1/holy/gallery`,{headers:{Authorization:'Bearer '+token}});
   if(r.ok)setGallery(await r.json());
  }catch{/* ignore */}
 };

 const loadEquip=async(sid:number)=>{
  try{
   const [eq,holy]=await Promise.all([
    fetch(`${api}/v1/heroes/${sid}/equipment`,{headers:{Authorization:'Bearer '+token}}),
    fetch(`${api}/v1/heroes/${sid}/holy`,{headers:{Authorization:'Bearer '+token}}),
   ]);
   if(eq.ok){const j=await eq.json();setEquipSlots(j.slots??[])}
   if(holy.ok){const j=await holy.json();setHolySlots(j.slots??[])}
   await loadGallery();
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

 const loadDisplace=async(sid:number)=>{
  try{
   const r=await fetch(`${api}/v1/heroes/${sid}/displace`,{headers:{Authorization:'Bearer '+token}});
   if(r.ok)setDisplace(await r.json());
   else setDisplace(null);
  }catch{setDisplace(null)}
 };

 useEffect(()=>{
  if(selected==null){setEquipSlots([]);setHolySlots([]);setDisplace(null);return}
  void loadEquip(selected);
  void loadDisplace(selected);
 },[api,token,selected]);

 const runDisplace=async(kind:'roll'|'save'|'cancel')=>{
  if(busy||selected==null)return;
  setBusy(true);
  setStatus(kind==='roll'?'Замена стихии…':kind==='save'?'Сохранение…':'Отмена…');
  try{
   const url=kind==='roll'
    ?`${api}/v1/heroes/${selected}/displace`
    :`${api}/v1/heroes/${selected}/displace/${kind}`;
   const body=kind==='save'&&displace?.pending
    ?JSON.stringify({newHeroId:displace.pending.newHeroId})
    :undefined;
   const r=await fetch(url,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
    body,
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||j.reason||`displace_${r.status}`);
   if(kind==='save'&&j.hero){
    setHeroes(prev=>prev.map(h=>h.Sid===j.hero.Sid?{...h,...j.hero}:h));
    setStatus(`Замена: ${heroDisplayName(j.hero.HeroId)} · мощь ${j.hero.Power}`);
   }else if(kind==='roll'){
    setStatus(`Вариант: ${heroDisplayName(j.pending.newHeroId)} (сохраните или отмените)`);
   }else{
    setStatus('Замена отменена (валюта не возвращена)');
   }
   // refresh list + displace state
   const list=await fetch(`${api}/v1/heroes`,{headers:{Authorization:'Bearer '+token}});
   if(list.ok){const body=await list.json();applyList(body.heroes??[])}
   await loadDisplace(selected);
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось заменить героя');
  }finally{setBusy(false)}
 };

 const refreshHeroes=async()=>{
  const r=await fetch(api+'/v1/heroes',{headers:{Authorization:'Bearer '+token}});
  if(r.ok){const d=await r.json();applyList(d.heroes)}
 };

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
   await refreshHeroes();
   if(kind==='forge')setStatus(`Ковка → #${j.after?.ItemId} (xp ${j.after?.Xp??0})`);
   else setStatus(kind==='put-on'?'Экипировано':'Снято');
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось изменить экипировку');
  }finally{setBusy(false)}
 };

 const holyAct=async(kind:string,body:object,label:string)=>{
  if(busy||selected==null)return;
  setBusy(true);setStatus(label);
  try{
   const r=await fetch(`${api}/v1/holy/${kind}`,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(body),
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||kind+'_'+r.status);
   await loadEquip(selected);
   await refreshHeroes();
   if(kind==='level-up')setStatus(`Священное → ур.${j.after?.Level} (xp ${j.after?.Xp??0})`);
   else if(kind==='star-up')setStatus(`Священное → ★${j.after?.Star} шаг ${j.after?.Step}`);
   else if(kind==='soul')setStatus(`Душа → стадия ${j.after?.Stage}`);
   else if(kind.startsWith('blessing/'))setStatus(`Благословение: ${kind.split('/')[1]}`);
   else if(kind.startsWith('gallery/')){
    await loadGallery();
    if(kind==='gallery/level-up')setStatus(`Галерея тип ${j.type} → ур.${j.after}`);
    else if(kind==='gallery/put-on')setStatus(`В галерею слот ${j.slot}`);
    else setStatus('Убрано из галереи');
   }
   else setStatus(kind==='put-on'?'Священное надето':'Священное снято');
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось изменить священную экипировку');
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
  <div className="heroes-controls">
   <button type="button" aria-label="Переключить вид героев" onClick={()=>setHeroView(v=>v==='card'?'portrait':'card')}>{heroView==='card'?'Портреты':'Карточки'}</button>
   <label>Сортировка <select aria-label="Сортировка героев" value={heroSort} onChange={e=>setHeroSort(e.target.value as 'power'|'level'|'star')}><option value="power">По силе</option><option value="level">По уровню</option><option value="star">По звёздам</option></select></label>
  </div>
  <div className="heroes-elements" role="group" aria-label="Фильтр стихии">
   {[0,1,2,3,4,5,6].map(e=><button key={e} type="button" aria-pressed={heroElement===e} onClick={()=>setHeroElement(e)}>{e===0?'Все':'Стихия '+e}</button>)}
  </div>
  <p>В коллекции: {heroes.length}</p>
  <div className={'heroes-grid heroes-grid--'+heroView}>{heroes.filter(x=>heroElement===0||(heroVisualCatalog as Record<string,{element:number;star:number}>)[x.HeroId]?.element===heroElement).sort((a,b)=>heroSort==='level'?b.Level-a.Level||b.Power-a.Power:heroSort==='star'?b.StarLevel-a.StarLevel||b.Power-a.Power:b.Power-a.Power||b.Level-a.Level).map(x=>{
   const info=(heroVisualCatalog as Record<string,{element:number;star:number}>)[x.HeroId];
   const element=info?.element??1;
   const suffix=element>=1&&element<=6?String(element):'chaos';
   const bg=import.meta.env.BASE_URL+'heroes/original/cards/card_bg_'+suffix+'.png';
   const border=import.meta.env.BASE_URL+'heroes/original/cards/card_border_'+suffix+'.png';
   return <button className="hero-original-card" key={x.Sid} type="button" aria-label={heroDisplayName(x.HeroId)} aria-pressed={selected===x.Sid} onClick={()=>setSelected(x.Sid)} style={{backgroundImage:'url('+bg+')'}}>
    <img className="hero-card-portrait" src={'./profile/icon-'+x.HeroId+'.webp'} alt="" onError={e=>{e.currentTarget.style.visibility='hidden'}}/>
    <img className="hero-card-frame" src={border} alt="" aria-hidden="true"/>
    <span className="hero-card-label"><strong>{heroDisplayName(x.HeroId)}</strong><span>Ур. {x.Level} · ★ {x.StarLevel}</span><span>Мощь: {x.Power}</span></span>
   </button>;
  })}</div>
  {h&&<section className="hero-detail" aria-label="Характеристики героя">
   <div className="hero-detail-head">
    <div className="hero-detail-portrait">
     <img src={'./profile/icon-'+h.HeroId+'.webp'} alt="" onError={e=>{e.currentTarget.style.visibility='hidden'}}/>
     <img className="hero-detail-frame" src={import.meta.env.BASE_URL+'heroes/original/cards/card_border_'+(Math.min(6,Math.max(1,(heroVisualCatalog as Record<string,{element:number}>)[h.HeroId]?.element??1)))+'.png'} alt="" aria-hidden="true"/>
    </div>
    <div className="hero-detail-identity">
     <h2>{heroDisplayName(h.HeroId)}</h2>
     <p>Ур. {h.Level}/{h.maxLevel??'—'} · ★ {h.StarLevel}/{h.maxStar??'—'}</p>
     <strong className="hero-detail-power">⚔ {h.Power}</strong>
    </div>
   </div>
   <div className="hero-detail-attributes" aria-label="Основные характеристики">
    {Object.entries(ATTR_LABEL).map(([key,label])=><div key={key} className="hero-detail-attribute"><span>{label}</span><strong>{h.Attrs?.[key]??'—'}</strong></div>)}
   </div>
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
   {(displace?.eligible||displace?.pending)&&(
    <div className="hero-displace" data-guide="hero-displace">
     <h3>Замена стихии</h3>
     <p>
      Валюта #{displace.currency?.itemId??14002}: {displace.currency?.amount??'—'}
      {displace.cost?` · стоимость ${displace.cost.amount}`:''}
     </p>
     {displace.pending?(
      <>
       <p>{heroDisplayName(displace.pending.oldHeroId)} → {heroDisplayName(displace.pending.newHeroId)}</p>
       <button type="button" disabled={busy} onClick={()=>void runDisplace('save')}>Сохранить</button>
       <button type="button" disabled={busy} onClick={()=>void runDisplace('cancel')}>Отменить</button>
      </>
     ):(
      <button type="button" disabled={busy||!displace.eligible} onClick={()=>void runDisplace('roll')}>
       Случайная замена{displace.cost?` (${displace.cost.amount}×${displace.cost.itemId})`:''}
      </button>
     )}
    </div>
   )}
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
   <div className="hero-equip hero-holy">
    <h3>Священная экипировка</h3>
    <ul>
     {[1,2,3,4].map(slot=>{
      const info=holySlots.find(s=>s.slot===slot);
      const worn=info?.equip??null;
      const starter=HOLY_STARTER[slot];
      return <li key={slot}>
       <span>{SLOT_NAME[slot]}: {worn?`#${worn.ItemId} ★${worn.Star} шаг ${worn.Step??0} душа ${worn.Stage??0} ур.${worn.Level}${worn.GallerySlot?` · гал.${worn.GallerySlot}`:''} · ${worn.score}`:'пусто'}</span>
       {worn?(
        <>
         <button type="button" disabled={busy||(worn.Level>=(info?.maxLevel??0))} onClick={()=>void holyAct('level-up',{sid:worn.Sid,counts:[1,0,0,0]},'Усиление…')}>
          +ур (101×1)
         </button>
         <button type="button" disabled={busy||!info?.nextStar} onClick={()=>void holyAct('star-up',{sid:worn.Sid,type:1},'Звезда…')}>
          ★+1{info?.nextStar?` (${info.nextStar.materials.map(([id,n])=>`${n}×${id}`).join(', ')})`:''}
         </button>
         <button type="button" disabled={busy||!info?.nextStep} onClick={()=>void holyAct('star-up',{sid:worn.Sid,type:2},'Шаг…')}>
          Шаг+1{info?.nextStep?` (${info.nextStep.materials.map(([id,n])=>`${n}×${id}`).join(', ')})`:''}
         </button>
         <button type="button" disabled={busy||!info?.nextSoul?.ready} onClick={()=>void holyAct('soul',{sid:worn.Sid},'Душа…')}>
          Душа+1{info?.nextSoul?` (${info.nextSoul.count}×${info.nextSoul.itemId}${info.nextSoul.ready?'':` 🔒★${info.nextSoul.unlockStar}`})`:''}
         </button>
         {[1,2].map(bi=>{
          const b=bi===1?worn.Blessing1:worn.Blessing2;
          const need=(worn.blessingUnlock??[1,3])[bi-1]??bi;
          return <React.Fragment key={bi}>
           {!b?.BlessingId?(
            <button type="button" disabled={busy||worn.Star<need} onClick={()=>void holyAct('blessing/unlock',{sid:worn.Sid,index:bi},'Благословение…')}>
             Благо {bi}{worn.Star<need?` 🔒★${need}`:''}
            </button>
           ):(
            <>
             <span>Б{bi}:#{b.BlessingId} L{b.Level} pool {b.Pool.length}</span>
             <button type="button" disabled={busy||b.Pool.length>=8} onClick={()=>void holyAct('blessing/bless',{sid:worn.Sid,index:bi,count:1},'Bless…')}>Bless</button>
             <button type="button" disabled={busy||!b.Pool.length} onClick={()=>void holyAct('blessing/replace',{sid:worn.Sid,index:bi,poolIndex:0},'Replace…')}>Replace[0]</button>
             <button type="button" disabled={busy||!b.Pool.length} onClick={()=>void holyAct('blessing/clear',{sid:worn.Sid,index:bi},'Clear…')}>Clear</button>
            </>
           )}
          </React.Fragment>;
         })}
         {worn.GallerySlot?(
          <button type="button" disabled={busy} onClick={()=>void holyAct('gallery/put-off',{sid:worn.Sid},'Галерея…')}>Из галереи</button>
         ):(
          <button type="button" disabled={busy||!gallery?.types.find(t=>t.type===slot)?.slots.some(s=>s.open&&!s.equip)}
           onClick={()=>{
            const open=gallery?.types.find(t=>t.type===slot)?.slots.find(s=>s.open&&!s.equip);
            if(open)void holyAct('gallery/put-on',{slot:open.id,sid:worn.Sid},'Галерея…');
           }}>В галерею</button>
         )}
         <button type="button" disabled={busy} onClick={()=>void holyAct('put-off',{sid:worn.Sid},'Снятие…')}>Снять</button>
        </>
       ):(
        <button type="button" disabled={busy} onClick={()=>void holyAct('put-on',{itemId:starter,ownerId:h.Sid},'Надевание…')}>
         Надеть #{starter}
        </button>
       )}
      </li>;
     })}
    </ul>
    {gallery&&(
     <div className="hero-gallery">
      <h4>Галерея {gallery.resonance?`· резонанс ${gallery.resonance.requirements}`:''}</h4>
      <ul>
       {gallery.types.map(t=>(
        <li key={t.type}>
         <span>{SLOT_NAME[t.type]} ур.{t.level} · слотов {t.slots.filter(s=>s.equip).length}/{t.slots.filter(s=>s.open).length}</span>
         <button type="button" disabled={busy||!t.nextCost.length}
          onClick={()=>void holyAct('gallery/level-up',{type:t.type},'Галерея ур…')}>
          +ур{t.nextCost.length?` (${t.nextCost.map(([id,n])=>`${n}×${id}`).join(', ')})`:''}
         </button>
        </li>
       ))}
      </ul>
     </div>
    )}
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
