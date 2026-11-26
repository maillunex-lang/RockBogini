/** Common 101/102 + oracle 201 (1/5) + crystal 301 (prophet type 2). */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {calculateHero} from './heroAttrs.js';
import {getHeroes} from './heroes.js';
import {TASK_SUMMON,taskEvent} from './tasks.js';

type CommonCfg={consume:number[][];summonCount:number;summonType:number;extra:number[][]};
type TypeCfg={libs:number[][];onceLibs:number[];startFreeCount:number;dailyFreeCount:number};
type LibCfg={startChance:number;maxCount:number;modifyChance:number[][];randomLib:number[][];elementType:number};
type HeroCardCfg={heroId:number;starLevel:number};
type ProphetCfg={currencyId:number;baseCurrencyCount:number;advCurrencyCount:number;summonType:number;extra:number[][];times:number};

const PPM=1_000_000;
const TICKET_NORMAL=10401;
const TICKET_SENIOR=10403;
const DIAMOND=3;
const ORACLE_CURRENCY=14001;
const CRYSTAL_CURRENCY=39;
const CRYSTAL_BANNER=2;
const ORACLE_BANNERS=new Set([1,5]);
const PROPHET_OTHER=4;
const CRYSTAL_ADV=new Set([4,5]);

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];
function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}

const COMMON=loadJson<Record<string,CommonCfg>>('card-common-summon.json',{});
const STYPE=loadJson<Record<string,TypeCfg>>('card-summon-type.json',{});
const LIBS=loadJson<Record<string,LibCfg>>('card-random-lib.json',{});
const CARDS=loadJson<Record<string,HeroCardCfg>>('item-hero-card.json',{});
const PROPHET=loadJson<Record<string,ProphetCfg>>('card-prophet-summon.json',{});

export function heroCard(itemId:number):HeroCardCfg|undefined{return CARDS[String(itemId)]}

function chance(lib:LibCfg,since:number):number{
 if(lib.maxCount>0&&since+1>=lib.maxCount)return PPM;
 let bonus=0;
 for(const row of lib.modifyChance){
  const from=row[0]??0,add=row[1]??0;
  if(since>=from)bonus+=(since-from+1)*add;
 }
 return Math.min(lib.startChance+bonus,PPM);
}

function weightedPick(rows:number[][],rng:()=>number):[number,number]|null{
 const entries:{item:[number,number];w:number}[]=[];
 for(const row of rows){
  const id=row[0],n=row[1]??1,w=row[2]??1;
  if(id&&n)entries.push({item:[id,n],w:Math.max(w,1)});
 }
 if(!entries.length)return null;
 const total=entries.reduce((s,e)=>s+e.w,0);
 let roll=Math.floor(rng()*Math.max(total,1))+1;
 for(const e of entries){
  if(roll<=e.w)return e.item;
  roll-=e.w;
 }
 return entries[entries.length-1]!.item;
}

type Model={libCount:Record<string,number>;libStatus:Record<string,number>;freeCount:number;todayCount:number;totalCount:number};

/** One pull using Cards.Pull semantics (OnceLibs + pity + optional element / exclude). */
export function pullOnce(
 typeCfg:TypeCfg,
 model:Model,
 rng:()=>number=Math.random,
 element=0,
 exclude:readonly number[]=[],
):{item:[number,number]|null;model:Model}{
 const ban=new Set(exclude);
 const slots=typeCfg.libs.map(row=>({order:row[0]??0,ids:row.slice(1)})).filter(s=>s.ids.length>0);
 const candidates:{order:number;libId:number;cfg:LibCfg}[]=[];
 for(const slot of slots){
  const alive=slot.ids.filter(id=>{
   const cfg=LIBS[String(id)];
   if(!cfg)return false;
   if(element>0&&cfg.elementType!==element)return false;
   if(typeCfg.onceLibs.includes(slot.order)&&(model.libStatus[String(id)]??0)>0)return false;
   // keep lib if at least one non-excluded row remains
   if(ban.size&&!cfg.randomLib.some(row=>row[0]&&!ban.has(row[0]!)))return false;
   return true;
  });
  if(!alive.length)continue;
  const libId=alive[Math.floor(rng()*alive.length)]!;
  candidates.push({order:slot.order,libId,cfg:LIBS[String(libId)]!});
 }
 if(!candidates.length)return {item:null,model};

 const last=candidates.length-1;
 let hit=candidates[last]!;
 for(let i=0;i<candidates.length;i++){
  const c=candidates[i]!;
  const since=model.libCount[String(c.libId)]??0;
  if(i===last||Math.floor(rng()*PPM)+1<=chance(c.cfg,since)){hit=c;break}
 }

 const libCount={...model.libCount};
 for(const c of candidates){
  libCount[String(c.libId)]=c.libId===hit.libId?0:(libCount[String(c.libId)]??0)+1;
 }
 const libStatus={...model.libStatus};
 if(typeCfg.onceLibs.includes(hit.order))libStatus[String(hit.libId)]=1;
 const pool=ban.size?hit.cfg.randomLib.filter(row=>row[0]&&!ban.has(row[0]!)):hit.cfg.randomLib;
 return {item:weightedPick(pool,rng),model:{...model,libCount,libStatus}};
}

export function pullMany(
 typeId:number,
 model:Model,
 times:number,
 rng:()=>number=Math.random,
 element=0,
 exclude:readonly number[]=[],
):{items:[number,number][];model:Model}{
 const typeCfg=STYPE[String(typeId)];
 if(!typeCfg)return {items:[],model};
 const items:[number,number][]=[];
 let m=model;
 for(let i=0;i<times;i++){
  const r=pullOnce(typeCfg,m,rng,element,exclude);
  m=r.model;
  if(r.item)items.push(r.item);
 }
 return {items,model:m};
}

/** Expose summon type cfg for displace (401/402). */
export function summonTypeCfg(typeId:number):TypeCfg|undefined{
 return STYPE[String(typeId)];
}

export function prophetBanner(id:number):ProphetCfg|undefined{
 return PROPHET[String(id)];
}

export function prophetCost(cfg:ProphetCfg,element:number):number{
 return element===PROPHET_OTHER?cfg.advCurrencyCount||cfg.baseCurrencyCount:cfg.baseCurrencyCount;
}

/** Crystal Adv when element is Break(4) or Fight(5). */
export function crystalCost(cfg:ProphetCfg,element:number):number{
 return CRYSTAL_ADV.has(element)?cfg.advCurrencyCount||cfg.baseCurrencyCount:cfg.baseCurrencyCount;
}

async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

async function itemAmount(s:Storage,id:string,itemId:number){
 const r=await s.pg.query('SELECT amount::int AS n FROM player_items WHERE account_id=$1 AND item_id=$2',[id,itemId]);
 return r.rowCount?Number(r.rows[0].n):0;
}

async function payItem(s:Storage,id:string,itemId:number,n:number){
 const r=await s.pg.query(
  'UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3 RETURNING amount::text',
  [id,itemId,n],
 );
 return r.rowCount===1;
}

async function grantItem(s:Storage,id:string,itemId:number,n:number){
 await s.pg.query(
  `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,
  [id,itemId,n],
 );
}

async function loadModel(s:Storage,id:string,summonType:number,typeCfg:TypeCfg):Promise<Model>{
 const r=await s.pg.query(
  'SELECT lib_count,lib_status,free_count,today_count,total_count FROM player_summon WHERE account_id=$1 AND summon_type=$2',
  [id,summonType],
 );
 if(!r.rowCount){
  return {
   libCount:{},libStatus:{},
   freeCount:typeCfg.startFreeCount,todayCount:0,totalCount:0,
  };
 }
 const row=r.rows[0];
 return {
  libCount:(row.lib_count??{}) as Record<string,number>,
  libStatus:(row.lib_status??{}) as Record<string,number>,
  freeCount:Number(row.free_count??0),
  todayCount:Number(row.today_count??0),
  totalCount:Number(row.total_count??0),
 };
}

async function saveModel(s:Storage,id:string,summonType:number,m:Model){
 await s.pg.query(
  `INSERT INTO player_summon(account_id,summon_type,lib_count,lib_status,free_count,today_count,total_count)
   VALUES($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7)
   ON CONFLICT(account_id,summon_type) DO UPDATE SET
    lib_count=EXCLUDED.lib_count,lib_status=EXCLUDED.lib_status,
    free_count=EXCLUDED.free_count,today_count=EXCLUDED.today_count,total_count=EXCLUDED.total_count`,
  [id,summonType,JSON.stringify(m.libCount),JSON.stringify(m.libStatus),m.freeCount,m.todayCount,m.totalCount],
 );
}

async function nextHeroSid(s:Storage,id:string){
 const r=await s.pg.query('SELECT COALESCE(MAX(sid),1000)+1 AS n FROM player_heroes WHERE account_id=$1',[id]);
 return Math.max(Number(r.rows[0].n),1001);
}

async function grantHeroCard(s:Storage,id:string,cardId:number,count:number){
 const cfg=heroCard(cardId);
 const granted:{sid:number;heroId:number;star:number;cardId:number}[]=[];
 if(!cfg){
  await grantItem(s,id,cardId,count);
  return granted;
 }
 for(let i=0;i<count;i++){
  const sid=await nextHeroSid(s,id);
  const star=Math.max(cfg.starLevel,1);
  const base=calculateHero(cfg.heroId,1,star,false);
  const state={
   Sid:sid,HeroId:cfg.heroId,Level:1,StarLevel:star,Power:base.power,Locked:false,
   Attrs:Object.fromEntries(Object.entries(base.attrs).map(([k,v])=>[k,v])),
   Skills:base.skills,
  };
  await s.pg.query(
   `INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state)
    VALUES($1,$2,$3,1,$4,$5,false,$6)`,
   [id,sid,cfg.heroId,star,base.power,JSON.stringify(state)],
  );
  granted.push({sid,heroId:cfg.heroId,star,cardId});
 }
 return granted;
}

async function ticketSnapshot(s:Storage,id:string){
 return {
  normal:{itemId:TICKET_NORMAL,amount:await itemAmount(s,id,TICKET_NORMAL)},
  senior:{itemId:TICKET_SENIOR,amount:await itemAmount(s,id,TICKET_SENIOR)},
  diamond:{itemId:DIAMOND,amount:await itemAmount(s,id,DIAMOND)},
 };
}

async function stateFor(s:Storage,id:string,summonType:number){
 const typeCfg=STYPE[String(summonType)];
 if(!typeCfg)return null;
 const m=await loadModel(s,id,summonType,typeCfg);
 return {summonType,freeCount:m.freeCount,todayCount:m.todayCount,totalCount:m.totalCount};
}

export async function summonRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/summon',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  // seed starter tickets for empty bag (dev/test)
  if((await itemAmount(s,id,TICKET_NORMAL))===0)await grantItem(s,id,TICKET_NORMAL,20);
  if((await itemAmount(s,id,TICKET_SENIOR))===0)await grantItem(s,id,TICKET_SENIOR,30);
  if((await itemAmount(s,id,DIAMOND))===0)await grantItem(s,id,DIAMOND,500);
  const banners=Object.entries(COMMON).map(([bannerId,cfg])=>{
   const typeCfg=STYPE[String(cfg.summonType)];
   return {
    id:Number(bannerId),
    summonCount:cfg.summonCount,
    summonType:cfg.summonType,
    consume:cfg.consume,
    extra:cfg.extra,
    free:typeCfg?.startFreeCount??0,
   };
  });
  if((await itemAmount(s,id,ORACLE_CURRENCY))===0)await grantItem(s,id,ORACLE_CURRENCY,20);
  if((await itemAmount(s,id,CRYSTAL_CURRENCY))===0)await grantItem(s,id,CRYSTAL_CURRENCY,5000);
  const tickets=await ticketSnapshot(s,id);
  const normal=await stateFor(s,id,101);
  const senior=await stateFor(s,id,102);
  const oracle=await stateFor(s,id,201);
  const crystal=await stateFor(s,id,301);
  const prophetBanner=(bannerId:string,cfg:ProphetCfg)=>({
   id:Number(bannerId),
   times:cfg.times,
   summonType:cfg.summonType,
   currencyId:cfg.currencyId,
   baseCost:cfg.baseCurrencyCount,
   advCost:cfg.advCurrencyCount,
   extra:cfg.extra,
  });
  const oracleBanners=Object.entries(PROPHET).filter(([id])=>ORACLE_BANNERS.has(Number(id))).map(([id,cfg])=>prophetBanner(id,cfg));
  const crystalCfg=PROPHET[String(CRYSTAL_BANNER)];
  return {
   banners,
   tickets:{
    ...tickets,
    oracle:{itemId:ORACLE_CURRENCY,amount:await itemAmount(s,id,ORACLE_CURRENCY)},
    crystal:{itemId:CRYSTAL_CURRENCY,amount:await itemAmount(s,id,CRYSTAL_CURRENCY)},
   },
   // back-compat for 018.1 clients
   ticket:{itemId:TICKET_NORMAL,amount:tickets.normal.amount},
   states:{'101':normal,'102':senior,'201':oracle,'301':crystal},
   state:normal,
   oracle:{banners:oracleBanners,state:oracle,elements:[1,2,3,4]},
   crystal:crystalCfg?{
    banner:prophetBanner(String(CRYSTAL_BANNER),crystalCfg),
    state:crystal,
    elements:[1,2,3,4,5],
   }:undefined,
  };
 });

 app.post<{Body:{type:number;itemId?:number}}>('/v1/summon/pull',{
  schema:{body:{type:'object',required:['type'],additionalProperties:false,properties:{
   type:{type:'integer',enum:[1,2,3,4]},
   itemId:{type:'integer',minimum:0},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const cfg=COMMON[String(req.body.type)];
  if(!cfg)return reply.code(404).send({error:'summon_not_found'});
  const typeCfg=STYPE[String(cfg.summonType)];
  if(!typeCfg)return reply.code(500).send({error:'summon_type_missing'});
  let model=await loadModel(s,id,cfg.summonType,typeCfg);
  const times=Math.max(cfg.summonCount,1);
  const wantFree=req.body.itemId===0&&times===1;
  if(wantFree){
   if(model.freeCount<=0)return reply.code(409).send({error:'no_free_summon'});
   model={...model,freeCount:model.freeCount-1};
  }else{
   const costs=cfg.consume.map(row=>[row[0]!,row[1]!] as [number,number]);
   const preferred=req.body.itemId?costs.filter(c=>c[0]===req.body.itemId):costs;
   let paid=false;
   for(const [itemId,n] of preferred.length?preferred:costs){
    if(await payItem(s,id,itemId,n)){paid=true;break}
   }
   if(!paid)return reply.code(409).send({error:'insufficient_currency',need:costs});
  }
  const {items,model:after}=pullMany(cfg.summonType,model,times);
  const heroes:{sid:number;heroId:number;star:number;cardId:number}[]=[];
  for(const [cardId,n] of items){
   heroes.push(...await grantHeroCard(s,id,cardId,n));
  }
  const extras:[number,number][]=[];
  for(const row of cfg.extra){
   const itemId=row[0],n=(row[1]??0)*times;
   if(itemId&&n){extras.push([itemId,n]);await grantItem(s,id,itemId,n)}
  }
  const saved={
   ...after,
   todayCount:after.todayCount+times,
   totalCount:after.totalCount+times,
  };
  await saveModel(s,id,cfg.summonType,saved);
  {
   const c=await s.pg.connect();
   try{await taskEvent(c,id,TASK_SUMMON,[],times)}
   finally{c.release()}
  }
  const tickets=await ticketSnapshot(s,id);
  return {
   ok:true,
   type:req.body.type,
   times,
   pulls:items,
   heroes,
   extras,
   tickets,
   ticket:{itemId:TICKET_NORMAL,amount:tickets.normal.amount},
   state:{summonType:cfg.summonType,freeCount:saved.freeCount,todayCount:saved.todayCount,totalCount:saved.totalCount},
   states:{
    '101':cfg.summonType===101?{summonType:101,freeCount:saved.freeCount,todayCount:saved.todayCount,totalCount:saved.totalCount}:await stateFor(s,id,101),
    '102':cfg.summonType===102?{summonType:102,freeCount:saved.freeCount,todayCount:saved.todayCount,totalCount:saved.totalCount}:await stateFor(s,id,102),
   },
   heroCount:(await getHeroes(s,id)).length,
  };
 });

 app.post<{Body:{type:number;element:number}}>('/v1/summon/oracle',{
  schema:{body:{type:'object',required:['type','element'],additionalProperties:false,properties:{
   type:{type:'integer',enum:[1,5]},
   element:{type:'integer',minimum:1,maximum:4},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const cfg=PROPHET[String(req.body.type)];
  if(!cfg)return reply.code(404).send({error:'oracle_not_found'});
  const typeCfg=STYPE[String(cfg.summonType)];
  if(!typeCfg)return reply.code(500).send({error:'summon_type_missing'});
  const element=req.body.element;
  const cost=prophetCost(cfg,element);
  if(!(await payItem(s,id,cfg.currencyId,cost))){
   return reply.code(409).send({error:'insufficient_oracle_currency',itemId:cfg.currencyId,need:cost});
  }
  let model=await loadModel(s,id,cfg.summonType,typeCfg);
  const times=Math.max(cfg.times,1);
  const {items,model:after}=pullMany(cfg.summonType,model,times,Math.random,element);
  const heroes:{sid:number;heroId:number;star:number;cardId:number}[]=[];
  for(const [cardId,n] of items){
   heroes.push(...await grantHeroCard(s,id,cardId,n));
  }
  // ExtraReward already scaled for ×10 in config — grant once per request
  const extras:[number,number][]=[];
  for(const row of cfg.extra){
   const itemId=row[0],n=row[1]??0;
   if(itemId&&n){extras.push([itemId,n]);await grantItem(s,id,itemId,n)}
  }
  const saved={
   ...after,
   todayCount:after.todayCount+times,
   totalCount:after.totalCount+times,
  };
  await saveModel(s,id,cfg.summonType,saved);
  return {
   ok:true,
   type:req.body.type,
   element,
   times,
   cost:{itemId:cfg.currencyId,amount:cost},
   pulls:items,
   heroes,
   extras,
   oracle:{itemId:ORACLE_CURRENCY,amount:await itemAmount(s,id,ORACLE_CURRENCY)},
   state:{summonType:cfg.summonType,freeCount:saved.freeCount,todayCount:saved.todayCount,totalCount:saved.totalCount},
   heroCount:(await getHeroes(s,id)).length,
  };
 });

 app.post<{Body:{element:number}}>('/v1/summon/crystal',{
  schema:{body:{type:'object',required:['element'],additionalProperties:false,properties:{
   element:{type:'integer',minimum:1,maximum:5},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const cfg=PROPHET[String(CRYSTAL_BANNER)];
  if(!cfg)return reply.code(404).send({error:'crystal_not_found'});
  const typeCfg=STYPE[String(cfg.summonType)];
  if(!typeCfg)return reply.code(500).send({error:'summon_type_missing'});
  const element=req.body.element;
  const cost=crystalCost(cfg,element);
  if(!(await payItem(s,id,cfg.currencyId,cost))){
   return reply.code(409).send({error:'insufficient_crystal',itemId:cfg.currencyId,need:cost});
  }
  let model=await loadModel(s,id,cfg.summonType,typeCfg);
  const times=Math.max(cfg.times,1);
  const {items,model:after}=pullMany(cfg.summonType,model,times,Math.random,element);
  const heroes:{sid:number;heroId:number;star:number;cardId:number}[]=[];
  for(const [cardId,n] of items){
   heroes.push(...await grantHeroCard(s,id,cardId,n));
  }
  const saved={
   ...after,
   todayCount:after.todayCount+times,
   totalCount:after.totalCount+times,
  };
  await saveModel(s,id,cfg.summonType,saved);
  return {
   ok:true,
   type:CRYSTAL_BANNER,
   element,
   times,
   cost:{itemId:cfg.currencyId,amount:cost},
   pulls:items,
   heroes,
   extras:[],
   crystal:{itemId:CRYSTAL_CURRENCY,amount:await itemAmount(s,id,CRYSTAL_CURRENCY)},
   state:{summonType:cfg.summonType,freeCount:saved.freeCount,todayCount:saved.todayCount,totalCount:saved.totalCount},
   heroCount:(await getHeroes(s,id)).length,
  };
 });
}
