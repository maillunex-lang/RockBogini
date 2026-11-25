import {useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import './inventory.css';

type InventoryItem={itemId:number;amount:string};
type InventoryPayload={
 items:InventoryItem[];
 currencies:Record<string,string>;
 itemCount:number;
};

const CURRENCY_LABELS:[string,string][]=[
 ['coin','Золото'],
 ['diamond','Алмазы'],
 ['colorDiamond','Цветные алмазы'],
 ['intelligence','Приказы'],
 ['vipPoint','Очки VIP'],
 ['xpWater','Опыт воительниц'],
];

export function InventoryScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [data,setData]=useState<InventoryPayload|null>(null);
 const [status,setStatus]=useState('Загрузка инвентаря…');
 useEffect(()=>{
  const c=new AbortController();
  fetch(api+'/v1/inventory',{headers:{Authorization:'Bearer '+token},signal:c.signal})
   .then(r=>{if(!r.ok)throw Error('inventory_'+r.status);return r.json()})
   .then((d:InventoryPayload)=>{setData(d);setStatus('')})
   .catch(e=>{if(!c.signal.aborted)setStatus(e instanceof Error?e.message:'Не удалось загрузить инвентарь')});
  return()=>c.abort();
 },[api,token]);
 return <main className="inventory-screen">
  <header>
   <div>
    <h1>Инвентарь</h1>
    {data&&<p>Предметов: {data.itemCount}</p>}
   </div>
   <button type="button" onClick={onClose}>Вернуться в город</button>
  </header>
  {status&&<p role="status">{status}</p>}
  {data&&<>
   <section className="inventory-currencies" aria-label="Валюты">
    <h2>Валюты</h2>
    <ul>{CURRENCY_LABELS.map(([k,label])=><li key={k}><span>{label}</span><strong>{data.currencies[k]??'0'}</strong></li>)}</ul>
   </section>
   <section className="inventory-bag" aria-label="Сумка">
    <h2>Предметы</h2>
    {data.items.length===0
     ? <p className="inventory-empty">Сумка пуста</p>
     : <ul>{data.items.map(it=><li key={it.itemId}><span>{itemDisplayName(it.itemId)}</span><strong>×{it.amount}</strong><small>#{it.itemId}</small></li>)}</ul>}
   </section>
  </>}
 </main>;
}
