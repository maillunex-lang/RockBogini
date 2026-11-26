/** ShopBase/ShopItem + VipLevel (Req_Shop_* / Req_Vip_BuyGift). */
import {readFileSync} from 'node:fs';
import {randomInt} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {TASK_SHOP_BUY,taskEvent} from './tasks.js';

type ShopCfg={
 id:number;headerCurrency:number[];refreshType:number[][];goods:number[][];
 parent:number;sortId:number;dailyRefreshCount:number;isRefresh:number;gameModule:number;
};
type ItemCfg={
 id:number;itemId:number;currencyType:number;price:number;limitCount:number;
 discount:number;limitCycle:number;vipLimit:number;count:number;weight:number;
};
type VipCfg={
 id:number;point:number;packageItems:number[][];packagePrice:number;
 packageShowPrice:number;privilege:number[][];visibleVipLevel:number;
};
type GoodsMap=Record<string,[number,number]>; // key -> [shopItemId, bought]
type ShopModel={goods:GoodsMap;freeRefreshCount:number;todayRefreshCount:number;lastRefreshAt:number;dailyDay:string};

const cfg=JSON.parse(readFileSync(new URL('../../data/shop-vip.json',import.meta.url),'utf8')) as {
 shops:Record<string,ShopCfg>;items:Record<string,ItemCfg>;vip:VipCfg[];
};
const SHOPS=cfg.shops;
const ITEMS=cfg.items;
const VIPS=cfg.vip.slice().sort((a,b)=>a.id-b.id);
const VIP_POINT=2;
const DIAMOND=3;

async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

function localDay(d=new Date()){
 const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
 return `${y}-${m}-${day}`;
}
function sqlDate(v:unknown){
 if(v instanceof Date)return localDay(v);
 return String(v).slice(0,10);
}

export function vipLevelFor(points:number){
 let level=0;
 for(const v of VIPS){
  if(v.point>0&&v.point<=points)level=v.id;
 }
 return level;
}

async function itemAmount(c:PoolClient|Storage['pg'],id:string,itemId:number){
 const r=await c.query('SELECT amount FROM player_items WHERE account_id=$1 AND item_id=$2',[id,itemId]);
 return Number(r.rows[0]?.amount??0);
}

async function pay(c:PoolClient,id:string,itemId:number,n:number){
 if(n<=0)return true;
 const r=await c.query(
  'UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3 RETURNING amount',
  [id,itemId,n],
 );
 return r.rowCount===1;
}

async function grant(c:PoolClient,id:string,itemId:number,n:number){
 if(n<=0)return;
 await c.query(
  `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=
    CASE WHEN EXCLUDED.item_id=7 THEN LEAST(30000,player_items.amount+EXCLUDED.amount)
    ELSE player_items.amount+EXCLUDED.amount END`,
  [id,itemId,n],
 );
}

function freeMax(shop:ShopCfg){
 for(const row of shop.refreshType){
  if(row[0]===3)return row[2]??0;
 }
 return 0;
}

function paidRefresh(shop:ShopCfg){
 for(const row of shop.refreshType){
  if(row[0]===4)return {currency:row[1]??3,price:row[2]??0,limit:row[3]??shop.dailyRefreshCount};
 }
 return null;
}

function freeRefreshRow(shop:ShopCfg){
 for(const row of shop.refreshType){
  if(row[0]===3)return {hours:row[1]??0,max:row[2]??0};
 }
 return null;
}

function weightedPick(ids:number[],rng:()=>number){
 const entries:{id:number;w:number}[]=[];
 for(const id of ids){
  const it=ITEMS[String(id)];
  if(!it)continue;
  entries.push({id,w:Math.max(it.weight,1)});
 }
 if(!entries.length)return ids[0]??0;
 const total=entries.reduce((s,e)=>s+e.w,0);
 let roll=Math.floor(rng()*Math.max(total,1))+1;
 for(const e of entries){
  if(roll<=e.w)return e.id;
  roll-=e.w;
 }
 return entries[entries.length-1]!.id;
}

function rollGoods(shop:ShopCfg,rng:()=>number=()=>Math.random()):GoodsMap{
 const goods:GoodsMap={};
 shop.goods.forEach((candidates,i)=>{
  const id=weightedPick(candidates,rng);
  if(id)goods[String(i)]=[id,0];
 });
 return goods;
}

async function loadVip(c:PoolClient,id:string){
 const row=(await c.query(
  'SELECT vip_level,vip_gift_mask FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id],
 )).rows[0];
 const points=await itemAmount(c,id,VIP_POINT);
 const level=vipLevelFor(points);
 if(level>Number(row.vip_level??0)){
  await c.query('UPDATE player_profiles SET vip_level=$2 WHERE account_id=$1',[id,level]);
 }
 return {level:Math.max(level,Number(row.vip_level??0)),giftMask:Number(row.vip_gift_mask??0),points};
}

async function ensureShop(c:PoolClient,id:string,shopId:number):Promise<ShopModel>{
 const shop=SHOPS[String(shopId)];
 if(!shop)throw Error('shop_missing');
 await c.query(
  `INSERT INTO player_shop(account_id,shop_id,goods,free_refresh_count,today_refresh_count,last_refresh_at,daily_day)
   VALUES($1,$2,$3::jsonb,$4,0,now(),CURRENT_DATE)
   ON CONFLICT DO NOTHING`,
  [id,shopId,JSON.stringify(shop.isRefresh===1?rollGoods(shop):{}),freeMax(shop)],
 );
 const row=(await c.query(
  'SELECT goods,free_refresh_count,today_refresh_count,last_refresh_at,daily_day FROM player_shop WHERE account_id=$1 AND shop_id=$2 FOR UPDATE',
  [id,shopId],
 )).rows[0];
 let goods=(row.goods??{}) as GoodsMap;
 let free=Number(row.free_refresh_count??0);
 let today=Number(row.today_refresh_count??0);
 let last=+row.last_refresh_at;
 const day=sqlDate(row.daily_day);
 const todayStr=localDay();
 if(day!==todayStr){
  today=0;
  // daily limitCycle=1 resets for fixed shops
  if(shop.isRefresh!==1){
   const next:GoodsMap={};
   for(const [k,v] of Object.entries(goods)){
    const [itemId,bought]=v;
    const it=ITEMS[String(itemId)];
    next[k]=it&&it.limitCycle===1?[itemId,0]:[itemId,bought];
   }
   goods=next;
  }else if(shop.refreshType.some(r=>r[0]===2&&r[1]===1)){
   goods=rollGoods(shop);
  }
  await c.query(
   'UPDATE player_shop SET goods=$3::jsonb,today_refresh_count=0,daily_day=$4 WHERE account_id=$1 AND shop_id=$2',
   [id,shopId,JSON.stringify(goods),todayStr],
  );
 }
 // empty refreshable shelf → roll
 if(shop.isRefresh===1&&!Object.keys(goods).some(k=>Number(k)>=0&&goods[k]?.[0])){
  goods=rollGoods(shop);
  await c.query(
   'UPDATE player_shop SET goods=$3::jsonb,last_refresh_at=now(),free_refresh_count=$4 WHERE account_id=$1 AND shop_id=$2',
   [id,shopId,JSON.stringify(goods),free||freeMax(shop)],
  );
  last=Date.now();
 }
 return {goods,freeRefreshCount:free,todayRefreshCount:today,lastRefreshAt:last,dailyDay:todayStr};
}

async function saveShop(c:PoolClient,id:string,shopId:number,m:ShopModel){
 await c.query(
  `UPDATE player_shop SET goods=$3::jsonb,free_refresh_count=$4,today_refresh_count=$5,
   last_refresh_at=to_timestamp($6/1000.0),daily_day=$7
   WHERE account_id=$1 AND shop_id=$2`,
  [id,shopId,JSON.stringify(m.goods),m.freeRefreshCount,m.todayRefreshCount,m.lastRefreshAt,m.dailyDay],
 );
}

function listedIds(shop:ShopCfg){
 return [...new Set(shop.goods.flat())];
}

function resolveSlot(shop:ShopCfg,model:ShopModel,id:number):{key:string;itemId:number;bought:number}|null{
 if(shop.isRefresh===1){
  const slot=model.goods[String(id)];
  if(!slot||!slot[0])return null;
  return {key:String(id),itemId:slot[0],bought:slot[1]??0};
 }
 if(!listedIds(shop).includes(id)&&Math.floor(id/100000)!==shop.id)return null;
 const slot=model.goods[String(id)];
 return {key:String(id),itemId:id,bought:slot?.[1]??0};
}

function publicGoods(shop:ShopCfg,model:ShopModel,vipLevel:number){
 if(shop.isRefresh===1){
  return Object.entries(model.goods)
   .filter(([k])=>Number(k)>=0)
   .map(([k,[itemId,bought]])=>{
    const it=ITEMS[String(itemId)];
    return {
     slot:Number(k),shopItemId:itemId,bought,
     itemId:it?.itemId??0,count:it?.count??1,
     currencyType:it?.currencyType??0,price:it?.price??0,
     limitCount:it?.limitCount??0,discount:it?.discount??0,
     vipLimit:it?.vipLimit??0,vipOk:!it||it.vipLimit<=vipLevel,
    };
   })
   .sort((a,b)=>a.slot-b.slot);
 }
 return listedIds(shop).map(itemId=>{
  const it=ITEMS[String(itemId)]!;
  const bought=model.goods[String(itemId)]?.[1]??0;
  return {
   slot:itemId,shopItemId:itemId,bought,
   itemId:it.itemId,count:it.count,
   currencyType:it.currencyType,price:it.price,
   limitCount:it.limitCount,discount:it.discount,
   vipLimit:it.vipLimit,vipOk:it.vipLimit<=vipLevel,
  };
 });
}

export async function shopRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/shop',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const shops=Object.values(SHOPS)
   .filter(sh=>sh.parent===0||sh.id<=9)
   .sort((a,b)=>a.sortId-b.sortId||a.id-b.id)
   .map(sh=>({id:sh.id,isRefresh:sh.isRefresh===1,sortId:sh.sortId,headerCurrency:sh.headerCurrency}));
  return {shops};
 });

 app.get<{Params:{type:string}}>('/v1/shop/:type',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const shopId=Number(req.params.type);
  const shop=SHOPS[String(shopId)];
  if(!shop)return reply.code(404).send({error:'shop_not_found'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const vip=await loadVip(c,id);
   const model=await ensureShop(c,id,shopId);
   await c.query('COMMIT');
   const freeRow=freeRefreshRow(shop);
   const paid=paidRefresh(shop);
   let freeLeft=model.freeRefreshCount;
   if(freeRow&&freeRow.hours>0){
    const gained=Math.floor(Math.max(Date.now()-model.lastRefreshAt,0)/(freeRow.hours*3_600_000));
    freeLeft=Math.min(model.freeRefreshCount+gained,freeRow.max);
   }
   return {
    id:shopId,
    isRefresh:shop.isRefresh===1,
    headerCurrency:shop.headerCurrency,
    goods:publicGoods(shop,model,vip.level),
    refresh:{
     freeLeft:shop.isRefresh===1?freeLeft:0,
     paidLeft:paid?Math.max(0,(paid.limit||0)-model.todayRefreshCount):0,
     paidCost:paid?{currency:paid.currency,price:paid.price}:null,
    },
    vip:vip.level,
   };
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });

 app.post<{Params:{type:string};Body:{id:number;count?:number}}>('/v1/shop/:type/buy',{
  schema:{body:{type:'object',required:['id'],additionalProperties:false,properties:{
   id:{type:'integer',minimum:0},count:{type:'integer',minimum:1,maximum:99},
  }}},
 },async(req,reply)=>{
  const accountId=await account(req,s);
  if(!accountId)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,accountId);
  const shopId=Number(req.params.type);
  const shop=SHOPS[String(shopId)];
  if(!shop)return reply.code(404).send({error:'shop_not_found'});
  const count=req.body.count??1;
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const vip=await loadVip(c,accountId);
   const model=await ensureShop(c,accountId,shopId);
   const slot=resolveSlot(shop,model,req.body.id);
   if(!slot){await c.query('ROLLBACK');return reply.code(404).send({error:'slot_not_found'})}
   const item=ITEMS[String(slot.itemId)];
   if(!item){await c.query('ROLLBACK');return reply.code(404).send({error:'item_not_found'})}
   if(item.vipLimit>0&&vip.level<item.vipLimit){await c.query('ROLLBACK');return reply.code(403).send({error:'vip_required'})}
   if(item.limitCount>0&&slot.bought>=item.limitCount){await c.query('ROLLBACK');return reply.code(409).send({error:'limit_reached'})}
   if(item.limitCount>0&&slot.bought+count>item.limitCount){await c.query('ROLLBACK');return reply.code(409).send({error:'limit_exceeded'})}
   const cost=item.price>0&&item.currencyType>0?item.price*count:0;
   if(cost>0&&!(await pay(c,accountId,item.currencyType,cost))){
    await c.query('ROLLBACK');return reply.code(402).send({error:'insufficient_currency'});
   }
   const gain=item.count*count;
   await grant(c,accountId,item.itemId,gain);
   model.goods[slot.key]=[slot.itemId,slot.bought+count];
   await saveShop(c,accountId,shopId,model);
   await taskEvent(c,accountId,TASK_SHOP_BUY,[shopId],count);
   await c.query('COMMIT');
   return {
    rewards:[[item.itemId,gain]],
    paid:cost>0?[[item.currencyType,cost]]:[],
    bought:slot.bought+count,
    goods:publicGoods(shop,model,vip.level),
   };
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });

 app.post<{Params:{type:string};Body:{useCurrency?:boolean}}>('/v1/shop/:type/refresh',{
  schema:{body:{type:'object',additionalProperties:false,properties:{useCurrency:{type:'boolean'}}}},
 },async(req,reply)=>{
  const accountId=await account(req,s);
  if(!accountId)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,accountId);
  const shopId=Number(req.params.type);
  const shop=SHOPS[String(shopId)];
  if(!shop||shop.isRefresh!==1)return reply.code(409).send({error:'not_refreshable'});
  const useCurrency=!!req.body?.useCurrency;
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const vip=await loadVip(c,accountId);
   const model=await ensureShop(c,accountId,shopId);
   const freeRow=freeRefreshRow(shop);
   const paid=paidRefresh(shop);
   const now=Date.now();
   if(!useCurrency){
    if(!freeRow){await c.query('ROLLBACK');return reply.code(409).send({error:'no_free_refresh'})}
    const gained=freeRow.hours>0?Math.floor(Math.max(now-model.lastRefreshAt,0)/(freeRow.hours*3_600_000)):0;
    const n=Math.min(model.freeRefreshCount+gained,freeRow.max);
    if(n<=0){await c.query('ROLLBACK');return reply.code(409).send({error:'no_free_refresh'})}
    if(model.freeRefreshCount+gained>=freeRow.max){
     model.freeRefreshCount=n-1;model.lastRefreshAt=now;
    }else{
     model.freeRefreshCount=n-1;
     model.lastRefreshAt=model.lastRefreshAt+gained*freeRow.hours*3_600_000;
    }
   }else{
    if(!paid){await c.query('ROLLBACK');return reply.code(409).send({error:'no_paid_refresh'})}
    if(paid.limit>0&&model.todayRefreshCount>=paid.limit){
     await c.query('ROLLBACK');return reply.code(409).send({error:'refresh_limit'});
    }
    if(!(await pay(c,accountId,paid.currency,paid.price))){
     await c.query('ROLLBACK');return reply.code(402).send({error:'insufficient_currency'});
    }
    model.todayRefreshCount+=1;
   }
   model.goods=rollGoods(shop,()=>randomInt(1_000_000)/1_000_000);
   await saveShop(c,accountId,shopId,model);
   await c.query('COMMIT');
   return {ok:true,goods:publicGoods(shop,model,vip.level),refresh:{
    freeLeft:model.freeRefreshCount,
    paidLeft:paid?Math.max(0,paid.limit-model.todayRefreshCount):0,
   }};
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });

 app.get('/v1/vip',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const vip=await loadVip(c,id);
   await c.query('COMMIT');
   const levels=VIPS.map(v=>({
    id:v.id,point:v.point,packagePrice:v.packagePrice,packageShowPrice:v.packageShowPrice,
    packageItems:v.packageItems,privilege:v.privilege,
    owned:vip.level>=v.id,
    giftBought:!!(vip.giftMask&(1<<(v.id-1))),
   }));
   return {level:vip.level,points:vip.points,giftMask:vip.giftMask,levels};
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });

 app.post<{Body:{id:number}}>('/v1/vip/gift',{
  schema:{body:{type:'object',required:['id'],additionalProperties:false,properties:{id:{type:'integer',minimum:1,maximum:30}}}},
 },async(req,reply)=>{
  const accountId=await account(req,s);
  if(!accountId)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,accountId);
  const level=req.body.id;
  const vipCfg=VIPS.find(v=>v.id===level);
  if(!vipCfg)return reply.code(404).send({error:'vip_not_found'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const vip=await loadVip(c,accountId);
   if(vip.level<level){await c.query('ROLLBACK');return reply.code(403).send({error:'vip_required'})}
   const bit=1<<(level-1);
   if(vip.giftMask&bit){await c.query('ROLLBACK');return reply.code(409).send({error:'already_bought'})}
   if(!(await pay(c,accountId,DIAMOND,vipCfg.packagePrice))){
    await c.query('ROLLBACK');return reply.code(402).send({error:'insufficient_diamond'});
   }
   const rewards:number[][]=[];
   for(const [itemId,n] of vipCfg.packageItems){
    if(itemId&&n){await grant(c,accountId,itemId,n);rewards.push([itemId,n])}
   }
   const mask=vip.giftMask|bit;
   await c.query('UPDATE player_profiles SET vip_gift_mask=$2 WHERE account_id=$1',[accountId,mask]);
   await c.query('COMMIT');
   return {ok:true,level,rewards,giftMask:mask};
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });
}
