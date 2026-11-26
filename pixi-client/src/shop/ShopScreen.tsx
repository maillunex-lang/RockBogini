import {useEffect,useState} from 'react';
import {itemDisplayName} from '../shared/itemNames';
import './shop.css';

type ShopMeta={id:number;isRefresh:boolean;sortId:number};
type Good={
 slot:number;shopItemId:number;bought:number;itemId:number;count:number;
 currencyType:number;price:number;limitCount:number;discount:number;vipLimit:number;vipOk:boolean;
};
type ShopView={
 id:number;isRefresh:boolean;goods:Good[];
 refresh:{freeLeft:number;paidLeft:number;paidCost:{currency:number;price:number}|null};
 vip:number;
};
type VipLevel={
 id:number;point:number;packagePrice:number;packageShowPrice:number;
 packageItems:number[][];owned:boolean;giftBought:boolean;
};
type VipView={level:number;points:number;levels:VipLevel[]};

const SHOP_LABELS:Record<number,string>={1:'Обычный',2:'Алмазный',3:'Недельный',4:'Ежедневный',5:'Дружба'};

export function ShopScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [shops,setShops]=useState<ShopMeta[]>([]);
 const [shopId,setShopId]=useState(2);
 const [shop,setShop]=useState<ShopView|null>(null);
 const [vip,setVip]=useState<VipView|null>(null);
 const [tab,setTab]=useState<'shop'|'vip'>('shop');
 const [status,setStatus]=useState('Загрузка…');
 const [busy,setBusy]=useState(false);

 const loadShop=(id:number)=>fetch(api+'/v1/shop/'+id,{headers:{Authorization:'Bearer '+token}})
  .then(r=>{if(!r.ok)throw Error('shop_'+r.status);return r.json() as Promise<ShopView>})
  .then(d=>{setShop(d);setShopId(id);return d});

 const loadVip=()=>fetch(api+'/v1/vip',{headers:{Authorization:'Bearer '+token}})
  .then(r=>{if(!r.ok)throw Error('vip_'+r.status);return r.json() as Promise<VipView>})
  .then(d=>{setVip(d);return d});

 useEffect(()=>{
  const c=new AbortController();
  Promise.all([
   fetch(api+'/v1/shop',{headers:{Authorization:'Bearer '+token},signal:c.signal}).then(r=>r.json()),
   loadShop(2),
   loadVip(),
  ]).then(([list])=>{
   setShops((list.shops as ShopMeta[]).filter(s=>s.id<=5));
   setStatus('');
  }).catch(e=>{if(!c.signal.aborted)setStatus(e instanceof Error?e.message:'Ошибка')});
  return()=>c.abort();
 },[api,token]);

 const buy=async(g:Good)=>{
  if(busy||!g.vipOk)return;
  setBusy(true);setStatus('');
  try{
   const res=await fetch(api+`/v1/shop/${shopId}/buy`,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({id:g.slot,count:1}),
   });
   if(res.status===402){setStatus('Не хватает валюты');return}
   if(res.status===409){setStatus('Лимит покупок');await loadShop(shopId);return}
   if(!res.ok)throw Error('buy_'+res.status);
   const body=await res.json() as {rewards:number[][];goods:Good[]};
   setShop(s=>s?{...s,goods:body.goods}:s);
   setStatus(`Куплено: ${body.rewards.map(([i,n])=>`${itemDisplayName(i)}×${n}`).join(', ')}`);
  }catch(e){setStatus(e instanceof Error?e.message:'Ошибка покупки')}
  finally{setBusy(false)}
 };

 const refresh=async(useCurrency:boolean)=>{
  if(busy)return;
  setBusy(true);setStatus('');
  try{
   const res=await fetch(api+`/v1/shop/${shopId}/refresh`,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({useCurrency}),
   });
   if(res.status===402){setStatus('Не хватает алмазов');return}
   if(res.status===409){setStatus('Нет обновлений');await loadShop(shopId);return}
   if(!res.ok)throw Error('refresh_'+res.status);
   const body=await res.json() as {goods:Good[];refresh:ShopView['refresh']};
   setShop(s=>s?{...s,goods:body.goods,refresh:body.refresh}:s);
   setStatus(useCurrency?'Полки обновлены за алмазы':'Бесплатное обновление');
  }catch(e){setStatus(e instanceof Error?e.message:'Ошибка обновления')}
  finally{setBusy(false)}
 };

 const buyGift=async(level:number)=>{
  if(busy)return;
  setBusy(true);setStatus('');
  try{
   const res=await fetch(api+'/v1/vip/gift',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({id:level}),
   });
   if(res.status===402){setStatus('Не хватает алмазов');return}
   if(res.status===403){setStatus('Нужен более высокий VIP');return}
   if(res.status===409){setStatus('Уже куплено');await loadVip();return}
   if(!res.ok)throw Error('vip_'+res.status);
   const body=await res.json() as {rewards:number[][]};
   setStatus(`VIP-пакет: ${body.rewards.map(([i,n])=>`${itemDisplayName(i)}×${n}`).join(', ')}`);
   await loadVip();
  }catch(e){setStatus(e instanceof Error?e.message:'Ошибка VIP')}
  finally{setBusy(false)}
 };

 return <main className="shop-screen">
  <header>
   <div>
    <h1>Магазин</h1>
    {vip&&<p>VIP {vip.level} · очки {vip.points}</p>}
   </div>
   <div className="shop-header-actions">
    <div className="shop-tabs" role="group">
     <button type="button" aria-pressed={tab==='shop'} onClick={()=>setTab('shop')}>Товары</button>
     <button type="button" aria-pressed={tab==='vip'} onClick={()=>setTab('vip')}>VIP</button>
    </div>
    <button type="button" onClick={onClose}>В город</button>
   </div>
  </header>
  {status&&<p role="status">{status}</p>}
  {tab==='shop'&&<>
   <nav className="shop-types" aria-label="Типы магазинов">
    {shops.map(s=><button key={s.id} type="button" aria-pressed={s.id===shopId} onClick={()=>void loadShop(s.id).then(()=>setStatus(''))}>
     {SHOP_LABELS[s.id]??`Магазин ${s.id}`}{s.isRefresh?' · полки':''}
    </button>)}
   </nav>
   {shop&&shop.isRefresh&&<div className="shop-refresh">
    <button type="button" disabled={busy||shop.refresh.freeLeft<=0} onClick={()=>void refresh(false)}>
     Бесплатно ({shop.refresh.freeLeft})
    </button>
    <button type="button" disabled={busy||shop.refresh.paidLeft<=0} onClick={()=>void refresh(true)}>
     Обновить{shop.refresh.paidCost?` (−${shop.refresh.paidCost.price}💎)`:''} · {shop.refresh.paidLeft}
    </button>
   </div>}
   {shop&&<section className="shop-goods" aria-label="Товары">
    {shop.goods.map(g=>{
     const left=g.limitCount>0?Math.max(0,g.limitCount-g.bought):null;
     const sold=left===0;
     return <article key={g.slot} data-sold={sold?'1':'0'}>
      <strong>{itemDisplayName(g.itemId)} ×{g.count}</strong>
      <span>{g.price===0?'Бесплатно':`${g.price} ${g.currencyType===3?'💎':g.currencyType===1?'🪙':'#'+g.currencyType}`}</span>
      <span>{left!=null?`Лимит ${left}`:'Без лимита'}{g.discount?` · −${g.discount}%`:''}{g.vipLimit?` · VIP${g.vipLimit}`:''}</span>
      <button type="button" disabled={busy||sold||!g.vipOk} onClick={()=>void buy(g)}>
       {!g.vipOk?'VIP':sold?'Нет':'Купить'}
      </button>
     </article>;
    })}
   </section>}
  </>}
  {tab==='vip'&&vip&&<section className="shop-vip" aria-label="VIP">
   <p>Текущий VIP {vip.level}. Пакеты открываются по уровню.</p>
   <div className="shop-vip-grid">
    {vip.levels.filter(l=>l.id<=10).map(l=><article key={l.id}>
     <strong>VIP {l.id}</strong>
     <span>{l.point} очков · пакет {l.packagePrice}💎 <s>{l.packageShowPrice}</s></span>
     <ul>{l.packageItems.slice(0,4).map(([i,n])=><li key={i}>{itemDisplayName(i)} ×{n}</li>)}</ul>
     <button type="button" disabled={busy||!l.owned||l.giftBought} onClick={()=>void buyGift(l.id)}>
      {l.giftBought?'Куплено':!l.owned?`Нужен VIP ${l.id}`:`Купить (−${l.packagePrice}💎)`}
     </button>
    </article>)}
   </div>
  </section>}
 </main>;
}
