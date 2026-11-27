import {useEffect,useMemo,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import './inventory.css';

type ItemKind='currency'|'consume'|'material'|'shard'|'personality'|'other';
type InventoryItem={
 itemId:number;
 amount:string;
 kind?:ItemKind;
 sellPrice?:number;
 canSell?:boolean;
 usable?:boolean;
 useSubType?:number|null;
 canPersonalityDisplace?:boolean;
 compose?:{need:number;cardId:number;max:number};
 element?:number;
 icon?:string;
};
type InventoryPayload={
 items:InventoryItem[];
 currencies:Record<string,string>;
 itemCount:number;
 byKind?:Record<string,number>;
};

type Filter='all'|ItemKind;
type PersPending={oldItemId:number;newItemId:number};

const CURRENCY_LABELS:[string,string][]=[
 ['coin','Золото'],
 ['diamond','Алмазы'],
 ['colorDiamond','Цветные алмазы'],
 ['intelligence','Приказы'],
 ['vipPoint','Очки VIP'],
 ['xpWater','Опыт воительниц'],
];

const CURRENCY_IDS:Record<string,number>={coin:1,diamond:3,colorDiamond:4,intelligence:7,vipPoint:2,xpWater:22};

const FILTERS:{id:Filter;label:string}[]=[
 {id:'all',label:'Все'},
 {id:'currency',label:'Валюты'},
 {id:'consume',label:'Расход'},
 {id:'material',label:'Материалы'},
 {id:'shard',label:'Осколки'},
 {id:'personality',label:'Личность'},
 {id:'other',label:'Прочее'},
];

const KIND_LABEL:Record<ItemKind,string>={
 currency:'Валюта',consume:'Расход',material:'Материал',shard:'Осколок',personality:'Личность',other:'Прочее',
};

function kindOf(it:InventoryItem):ItemKind{
 return it.kind??'other';
}

function ItemIcon({itemId,kind,icon,large}:{itemId:number;kind:ItemKind;icon?:string;large?:boolean}){
 const [broken,setBroken]=useState(false);
 const src=icon??`./item-icons/${itemId}.webp`;
 if(broken)return <span className={`inventory-icon${large?' inventory-icon-lg':''}`} data-kind={kind} aria-hidden/>;
 return <img
  className={`inventory-icon${large?' inventory-icon-lg':''}`}
  data-kind={kind}
  src={src.startsWith('./')||src.startsWith('/')||src.startsWith('http')?src:`./${src}`}
  alt=""
  onError={()=>setBroken(true)}
 />;
}

export function InventoryScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [data,setData]=useState<InventoryPayload|null>(null);
 const [status,setStatus]=useState('Загрузка инвентаря…');
 const [filter,setFilter]=useState<Filter>('all');
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState<InventoryItem|null>(null);
 const [pers,setPers]=useState<{
  eligible?:boolean;cost?:{itemId:number;amount:number};currency?:{itemId:number;amount:number};pending?:PersPending|null;
 }|null>(null);
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  const c=new AbortController();
  fetch(api+'/v1/inventory',{headers:{Authorization:'Bearer '+token},signal:c.signal})
   .then(r=>{if(!r.ok)throw Error('inventory_'+r.status);return r.json()})
   .then((d:InventoryPayload)=>{setData(d);setStatus('')})
   .catch(e=>{if(!c.signal.aborted)setStatus(e instanceof Error?e.message:'Не удалось загрузить инвентарь')});
  return()=>c.abort();
 },[api,token]);

 const visible=useMemo(()=>{
  if(!data)return [];
  const q=query.trim().toLowerCase();
  return data.items.filter(it=>{
   const kind=kindOf(it);
   if(filter!=='all'&&kind!==filter)return false;
   if(!q)return true;
   const name=itemDisplayName(it.itemId).toLowerCase();
   return name.includes(q)||String(it.itemId).includes(q);
  });
 },[data,filter,query]);

 const reloadBag=async()=>{
  const r=await fetch(api+'/v1/inventory',{headers:{Authorization:'Bearer '+token}});
  if(!r.ok)return null;
  const inv=await r.json() as InventoryPayload;
  setData(inv);
  return inv;
 };

 const loadPers=async(itemId:number)=>{
  try{
   const r=await fetch(`${api}/v1/inventory/personality/displace?itemId=${itemId}`,{headers:{Authorization:'Bearer '+token}});
   if(r.ok)setPers(await r.json());
   else setPers(null);
  }catch{setPers(null)}
 };

 useEffect(()=>{
  if(!selected?.canPersonalityDisplace){setPers(null);return}
  void loadPers(selected.itemId);
 },[api,token,selected?.itemId,selected?.canPersonalityDisplace]);

 const act=async(path:'use'|'sell'|'compose',item:InventoryItem)=>{
  if(busy)return;
  setBusy(true);setStatus(path==='use'?'Использование…':path==='compose'?'Объединение осколков…':'Продажа…');
  try{
   const r=await fetch(api+'/v1/inventory/'+path,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({itemId:item.itemId,count:1}),
   });
   const body=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(body.error||path+'_'+r.status);
   const inv=body.inventory as InventoryPayload;
   setData(inv);
   const next=inv.items.find(i=>i.itemId===item.itemId)??null;
   setSelected(next);
   setStatus(path==='use'
    ?`Использовано: ${itemDisplayName(item.itemId)}`
    :path==='compose'
     ?`Объединено: ${item.compose?.need} осколков → ${itemDisplayName(body.rewards?.[0]?.itemId??item.compose?.cardId??0)}`
     :`Продано за ${body.gained?.amount??'?'} золота`);
  }catch(e){
   setStatus(e instanceof Error?e.message:'Операция не удалась');
  }finally{
   setBusy(false);
  }
 };

 const composeAll=async()=>{
  if(busy)return;
  setBusy(true);setStatus('Объединение доступных осколков…');
  try{
   const r=await fetch(api+'/v1/inventory/compose-all',{
    method:'POST',headers:{Authorization:'Bearer '+token},
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||'compose_all_'+r.status);
   const inv=j.inventory as InventoryPayload;
   setData(inv);
   if(selected)setSelected(inv.items.find(i=>i.itemId===selected.itemId)??null);
   const total=(j.rewards??[]).reduce((n:number,x:{amount:string})=>n+Number(x.amount),0);
   setStatus(total>0?`Объединено карт: ${total}`:'Недостаточно осколков для объединения');
  }catch(e){setStatus(e instanceof Error?e.message:'Объединение не удалось')}
  finally{setBusy(false)}
 };

 const runPers=async(kind:'roll'|'save'|'cancel')=>{
  if(busy||!selected)return;
  setBusy(true);
  setStatus(kind==='roll'?'Замена личности…':kind==='save'?'Сохранение…':'Отмена…');
  try{
   const url=kind==='roll'
    ?`${api}/v1/inventory/personality/displace`
    :`${api}/v1/inventory/personality/displace/${kind}`;
   const body=kind==='roll'
    ?JSON.stringify({itemId:selected.itemId})
    :kind==='save'&&pers?.pending
     ?JSON.stringify({itemId:pers.pending.oldItemId,newItemId:pers.pending.newItemId})
     :undefined;
   const r=await fetch(url,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
    body,
   });
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||`personality_${r.status}`);
   const inv=await reloadBag();
   if(kind==='save'){
    setStatus(`Личность: ${itemDisplayName(j.swapped.from)} → ${itemDisplayName(j.swapped.to)}`);
    const next=inv?.items.find(i=>i.itemId===j.swapped.to)??null;
    setSelected(next);
   }else if(kind==='roll'){
    setStatus(`Вариант: ${itemDisplayName(j.pending.newItemId)}`);
    setPers(p=>({...(p??{}),pending:j.pending,currency:j.currency}));
   }else{
    setStatus('Замена личности отменена (валюта не возвращена)');
    await loadPers(selected.itemId);
   }
   if(kind!=='roll'&&selected)await loadPers(selected.itemId);
  }catch(e){
   setStatus(e instanceof Error?e.message:'Не удалось заменить личность');
  }finally{setBusy(false)}
 };

 return <main className="inventory-screen">
  <header>
   <div>
    <h1>Инвентарь</h1>
    {data&&<p>Предметов: {data.itemCount}{visible.length!==data.itemCount?` · показано ${visible.length}`:''}</p>}
   </div>
   <button type="button" onClick={onClose}>Вернуться в город</button>
  </header>
  {status&&<p role="status">{status}</p>}
  {data&&<>
   <section className="inventory-currencies" aria-label="Валюты">
    <h2>Валюты</h2>
    <ul>{CURRENCY_LABELS.map(([k,label])=>{
     const id=CURRENCY_IDS[k];
     return <li key={k}><ItemIcon itemId={id} kind="currency"/><span>{label}</span><strong>{data.currencies[k]??'0'}</strong></li>;
    })}</ul>
   </section>
   <div className="inventory-compose-all">
    <button type="button" disabled={busy||!data.items.some(x=>(x.compose?.max??0)>0)}
     onClick={()=>void composeAll()}>Объединить все доступные осколки</button>
    <small>По оригинальным рецептам ItemPiece</small>
   </div>
   <div className="inventory-toolbar">
    <div className="inventory-filters" role="group" aria-label="Фильтр">
     {FILTERS.map(f=><button key={f.id} type="button" aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}>{f.label}{data.byKind&&f.id!=='all'&&data.byKind[f.id]?` (${data.byKind[f.id]})`:''}</button>)}
    </div>
    <label className="inventory-search">Поиск
     <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Имя или ID" autoComplete="off"/>
    </label>
   </div>
   <section className="inventory-bag" aria-label="Сумка">
    <h2>Предметы</h2>
    {visible.length===0
     ? <p className="inventory-empty">Нет предметов в этом фильтре</p>
     : <ul>{visible.map(it=>{
      const kind=kindOf(it);
      return <li key={it.itemId}>
       <button type="button" className="inventory-row" onClick={()=>setSelected(it)}>
        <ItemIcon itemId={it.itemId} kind={kind} icon={it.icon}/>
        <span className="inventory-name">{itemDisplayName(it.itemId)}</span>
        <strong>×{it.amount}</strong>
        <small>#{it.itemId}</small>
       </button>
      </li>;
     })}</ul>}
   </section>
  </>}
  {selected&&<div className="inventory-overlay" onClick={()=>setSelected(null)}>
   <section role="dialog" aria-modal="true" aria-label={itemDisplayName(selected.itemId)} onClick={e=>e.stopPropagation()}>
    <header>
     <strong>{itemDisplayName(selected.itemId)}</strong>
     <button type="button" aria-label="Закрыть" onClick={()=>setSelected(null)}>×</button>
    </header>
    <div className="inventory-detail">
     <ItemIcon itemId={selected.itemId} kind={kindOf(selected)} icon={selected.icon} large/>
     <p>Тип: {KIND_LABEL[kindOf(selected)]}</p>
     <p>Количество: ×{selected.amount}</p>
     <p>ID: {selected.itemId}</p>
     {selected.canSell&&<p>Цена продажи: {selected.sellPrice} золота</p>}
     {selected.compose&&<div className="inventory-compose-recipe">
      <p>Оригинальный рецепт: {selected.compose.need} осколков → 1 карта {itemDisplayName(selected.compose.cardId)} (#{selected.compose.cardId}).</p>
      <p>Доступно объединений: {selected.compose.max}</p>
     </div>}
     <div className="inventory-actions">
      <button type="button" disabled={busy||!selected.usable} onClick={()=>void act('use',selected)}>Использовать</button>
      {selected.compose&&<button type="button" disabled={busy||selected.compose.max<1} onClick={()=>void act('compose',selected)}>Объединить осколки</button>}
      <button type="button" disabled={busy||!selected.canSell} onClick={()=>void act('sell',selected)}>Продать</button>
     </div>
     {selected.canPersonalityDisplace&&(
      <div className="inventory-personality" data-guide="personality-displace">
       <h3>Замена личности</h3>
       <p>Валюта #{pers?.currency?.itemId??50}: {pers?.currency?.amount??'—'}{pers?.cost?` · ${pers.cost.amount}×${pers.cost.itemId}`:''}</p>
       {pers?.pending?(
        <>
         <p>{itemDisplayName(pers.pending.oldItemId)} → {itemDisplayName(pers.pending.newItemId)}</p>
         <button type="button" disabled={busy} onClick={()=>void runPers('save')}>Сохранить</button>
         <button type="button" disabled={busy} onClick={()=>void runPers('cancel')}>Отменить</button>
        </>
       ):(
        <button type="button" disabled={busy||!pers?.eligible} onClick={()=>void runPers('roll')}>
         Случайная замена{pers?.cost?` (${pers.cost.amount}×${pers.cost.itemId})`:''}
        </button>
       )}
      </div>
     )}
     {!selected.usable&&!selected.canSell&&!selected.canPersonalityDisplace&&!selected.compose&&<p className="inventory-note">Для этого предмета нет действий использования или продажи.</p>}
     {selected.usable===false&&kindOf(selected)==='consume'&&<p className="inventory-note">Сложные расходники (события/случайные ящики) — следующие подэтапы.</p>}
    </div>
   </section>
  </div>}
 </main>;
}
