/** Personality item displace (CardProphetSummon 6 → SummonType 12). */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {pullOnce,prophetBanner,summonTypeCfg} from './summon.js';

type PersItem={type:number;element:number;quality:number;star:number};

const PERSONALITY_CFG=6;
const PERSONALITY_CURRENCY=50;

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];
function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}
const PERS=loadJson<Record<string,PersItem>>('item-personality.json',{});

export function isPersonalityItem(itemId:number){
 return !!PERS[String(itemId)];
}

export function personalityMeta(itemId:number){
 return PERS[String(itemId)];
}

async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

async function itemAmount(s:Storage,id:string,itemId:number){
 const r=await s.pg.query('SELECT amount::int AS n FROM player_items WHERE account_id=$1 AND item_id=$2',[id,itemId]);
 return r.rowCount?Number(r.rows[0].n):0;
}

async function grantItem(s:Storage,id:string,itemId:number,n:number){
 await s.pg.query(
  `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,
  [id,itemId,n],
 );
}

async function payItem(s:Storage,id:string,itemId:number,n:number){
 const r=await s.pg.query(
  'UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3 RETURNING amount::text',
  [id,itemId,n],
 );
 return r.rowCount===1;
}

async function ensureCurrency(s:Storage,id:string){
 if((await itemAmount(s,id,PERSONALITY_CURRENCY))===0)await grantItem(s,id,PERSONALITY_CURRENCY,100);
}

type Pending={oldItemId:number;newItemId:number};

async function loadPending(s:Storage,id:string):Promise<Pending|null>{
 const r=await s.pg.query(
  'SELECT old_item_id,new_item_id FROM player_personality_displace WHERE account_id=$1',[id],
 );
 if(!r.rowCount)return null;
 return {oldItemId:r.rows[0].old_item_id,newItemId:r.rows[0].new_item_id};
}

async function clearPending(s:Storage,id:string){
 await s.pg.query('DELETE FROM player_personality_displace WHERE account_id=$1',[id]);
}

export async function personalityDisplaceRoutes(app:FastifyInstance,s:Storage){
 app.get<{Querystring:{itemId?:string}}>('/v1/inventory/personality/displace',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await ensureCurrency(s,id);
  const cfg=prophetBanner(PERSONALITY_CFG);
  if(!cfg)return reply.code(500).send({error:'config_missing'});
  const pending=await loadPending(s,id);
  const currency={itemId:PERSONALITY_CURRENCY,amount:await itemAmount(s,id,PERSONALITY_CURRENCY)};
  const itemId=Number(req.query.itemId);
  if(!Number.isFinite(itemId)||itemId<=0){
   return {cost:{itemId:cfg.currencyId,amount:cfg.baseCurrencyCount},currency,pending,eligible:false,reason:'item_required'};
  }
  const meta=personalityMeta(itemId);
  if(!meta)return {eligible:false,reason:'not_personality',currency,pending,cost:{itemId:cfg.currencyId,amount:cfg.baseCurrencyCount}};
  if(meta.element<1||meta.element>3)return {eligible:false,reason:'element_not_displaceable',currency,pending,cost:{itemId:cfg.currencyId,amount:cfg.baseCurrencyCount}};
  const owned=await itemAmount(s,id,itemId);
  if(owned<=0)return {eligible:false,reason:'not_owned',currency,pending,cost:{itemId:cfg.currencyId,amount:cfg.baseCurrencyCount}};
  return {
   eligible:true,
   itemId,
   element:meta.element,
   cost:{itemId:cfg.currencyId,amount:cfg.baseCurrencyCount},
   currency,
   pending,
   owned,
  };
 });

 app.post<{Body:{itemId:number}}>('/v1/inventory/personality/displace',{
  schema:{body:{type:'object',required:['itemId'],additionalProperties:false,properties:{itemId:{type:'integer',minimum:1}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await ensureCurrency(s,id);
  const itemId=req.body.itemId;
  const meta=personalityMeta(itemId);
  if(!meta)return reply.code(409).send({error:'not_personality'});
  if(meta.element<1||meta.element>3)return reply.code(409).send({error:'element_not_displaceable'});
  if((await itemAmount(s,id,itemId))<=0)return reply.code(409).send({error:'not_owned'});
  const existing=await loadPending(s,id);
  if(existing)return reply.code(409).send({error:'pending_exists',pending:existing});
  const cfg=prophetBanner(PERSONALITY_CFG);
  if(!cfg)return reply.code(500).send({error:'config_missing'});
  const typeCfg=summonTypeCfg(cfg.summonType);
  if(!typeCfg)return reply.code(500).send({error:'summon_type_missing'});
  if(!(await payItem(s,id,cfg.currencyId,cfg.baseCurrencyCount))){
   return reply.code(409).send({error:'insufficient_currency',need:{itemId:cfg.currencyId,amount:cfg.baseCurrencyCount}});
  }
  const modelRow=await s.pg.query(
   'SELECT lib_count,lib_status,free_count,today_count,total_count FROM player_summon WHERE account_id=$1 AND summon_type=$2',
   [id,cfg.summonType],
  );
  let model={
   libCount:{} as Record<string,number>,
   libStatus:{} as Record<string,number>,
   freeCount:typeCfg.startFreeCount,
   todayCount:0,
   totalCount:0,
  };
  if(modelRow.rowCount){
   const row=modelRow.rows[0];
   model={
    libCount:(row.lib_count??{}) as Record<string,number>,
    libStatus:(row.lib_status??{}) as Record<string,number>,
    freeCount:Number(row.free_count??0),
    todayCount:Number(row.today_count??0),
    totalCount:Number(row.total_count??0),
   };
  }
  const pulled=pullOnce(typeCfg,model,Math.random,meta.element,[itemId]);
  if(!pulled.item)return reply.code(409).send({error:'pull_empty'});
  const newItemId=pulled.item[0]!;
  if(newItemId===itemId)return reply.code(409).send({error:'pull_same_item'});
  const after={
   ...pulled.model,
   todayCount:pulled.model.todayCount+1,
   totalCount:pulled.model.totalCount+1,
  };
  await s.pg.query(
   `INSERT INTO player_summon(account_id,summon_type,lib_count,lib_status,free_count,today_count,total_count)
    VALUES($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7)
    ON CONFLICT(account_id,summon_type) DO UPDATE SET
     lib_count=EXCLUDED.lib_count,lib_status=EXCLUDED.lib_status,
     free_count=EXCLUDED.free_count,today_count=EXCLUDED.today_count,total_count=EXCLUDED.total_count`,
   [id,cfg.summonType,JSON.stringify(after.libCount),JSON.stringify(after.libStatus),after.freeCount,after.todayCount,after.totalCount],
  );
  await s.pg.query(
   `INSERT INTO player_personality_displace(account_id,old_item_id,new_item_id)
    VALUES($1,$2,$3)
    ON CONFLICT(account_id) DO UPDATE SET old_item_id=EXCLUDED.old_item_id,new_item_id=EXCLUDED.new_item_id,created_at=now()`,
   [id,itemId,newItemId],
  );
  return {
   ok:true,
   cost:{itemId:cfg.currencyId,amount:cfg.baseCurrencyCount},
   pending:{oldItemId:itemId,newItemId},
   currency:{itemId:PERSONALITY_CURRENCY,amount:await itemAmount(s,id,PERSONALITY_CURRENCY)},
  };
 });

 app.post<{Body:{itemId:number;newItemId:number}}>('/v1/inventory/personality/displace/save',{
  schema:{body:{type:'object',required:['itemId','newItemId'],additionalProperties:false,properties:{
   itemId:{type:'integer',minimum:1},
   newItemId:{type:'integer',minimum:1},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const pending=await loadPending(s,id);
  if(!pending)return reply.code(409).send({error:'no_pending'});
  if(pending.oldItemId!==req.body.itemId||pending.newItemId!==req.body.newItemId){
   return reply.code(409).send({error:'pending_mismatch'});
  }
  if(!(await payItem(s,id,pending.oldItemId,1))){
   return reply.code(409).send({error:'not_owned'});
  }
  await grantItem(s,id,pending.newItemId,1);
  await clearPending(s,id);
  return {
   ok:true,
   swapped:{from:pending.oldItemId,to:pending.newItemId},
   owned:{
    old:await itemAmount(s,id,pending.oldItemId),
    neu:await itemAmount(s,id,pending.newItemId),
   },
  };
 });

 app.post('/v1/inventory/personality/displace/cancel',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const pending=await loadPending(s,id);
  if(!pending)return reply.code(409).send({error:'no_pending'});
  await clearPending(s,id);
  return {
   ok:true,
   currency:{itemId:PERSONALITY_CURRENCY,amount:await itemAmount(s,id,PERSONALITY_CURRENCY)},
  };
 });
}
