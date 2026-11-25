import {useEffect,useMemo,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import './inventory.css';

type ItemKind='currency'|'consume'|'material'|'shard'|'other';
type InventoryItem={
 itemId:number;
 amount:string;
 kind?:ItemKind;
 sellPrice?:number;
 canSell?:boolean;
 usable?:boolean;
 useSubType?:number|null;
 icon?:string;
};
type InventoryPayload={
 items:InventoryItem[];
 currencies:Record<string,string>;
 itemCount:number;
 byKind?:Record<string,number>;
};

type Filter='all'|ItemKind;

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
 {id:'other',label:'Прочее'},
];

const KIND_LABEL:Record<ItemKind,string>={
 currency:'Валюта',consume:'Расход',material:'Материал',shard:'Осколок',other:'Прочее',
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

 const act=async(path:'use'|'sell',item:InventoryItem)=>{
  if(busy)return;
  setBusy(true);setStatus(path==='use'?'Использование…':'Продажа…');
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
    :`Продано за ${body.gained?.amount??'?'} золота`);
  }catch(e){
   setStatus(e instanceof Error?e.message:'Операция не удалась');
  }finally{
   setBusy(false);
  }
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
     <div className="inventory-actions">
      <button type="button" disabled={busy||!selected.usable} onClick={()=>void act('use',selected)}>Использовать</button>
      <button type="button" disabled={busy||!selected.canSell} onClick={()=>void act('sell',selected)}>Продать</button>
     </div>
     {!selected.usable&&!selected.canSell&&<p className="inventory-note">Для этого предмета нет действий использования или продажи.</p>}
     {selected.usable===false&&kindOf(selected)==='consume'&&<p className="inventory-note">Сложные расходники (события/случайные ящики) — следующие подэтапы.</p>}
    </div>
   </section>
  </div>}
 </main>;
}
