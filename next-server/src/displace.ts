/** Element displace (CardProphetSummon 3/4 → SummonType 401/402). */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {formationBlockedSids,getHeroes,loadHeroRow,saveHero} from './heroes.js';
import {pullOnce,prophetBanner,summonTypeCfg} from './summon.js';

type HeroBase={element:number;coreHero:number;maxStar:number};

const DISPLACE_CURRENCY=14002;
const STAR_TO_PROPHET:Record<number,number>={4:3,5:4};
const UR_CORE=3;

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];
function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}
const BASE=loadJson<Record<string,HeroBase>>('hero-base-slim.json',{});

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
 if((await itemAmount(s,id,DISPLACE_CURRENCY))===0)await grantItem(s,id,DISPLACE_CURRENCY,200);
}

type Pending={sid:number;oldHeroId:number;newHeroId:number;prophetType:number};

async function loadPending(s:Storage,id:string):Promise<Pending|null>{
 const r=await s.pg.query(
  'SELECT sid,old_hero_id,new_hero_id,prophet_type FROM player_displace WHERE account_id=$1',[id],
 );
 if(!r.rowCount)return null;
 const row=r.rows[0];
 return {sid:row.sid,oldHeroId:row.old_hero_id,newHeroId:row.new_hero_id,prophetType:row.prophet_type};
}

async function clearPending(s:Storage,id:string){
 await s.pg.query('DELETE FROM player_displace WHERE account_id=$1',[id]);
}

function eligibility(hero:{Sid:number;HeroId:number;StarLevel:number;Locked:boolean},blocked:Set<number>){
 const base=BASE[String(hero.HeroId)];
 if(!base)return {ok:false as const,reason:'unknown_hero'};
 if(hero.StarLevel!==4&&hero.StarLevel!==5)return {ok:false as const,reason:'star_not_displaceable'};
 if(base.element<1||base.element>3)return {ok:false as const,reason:'element_not_displaceable'};
 if(base.coreHero>=UR_CORE)return {ok:false as const,reason:'core_ur'};
 if(hero.Locked)return {ok:false as const,reason:'locked'};
 if(blocked.has(hero.Sid))return {ok:false as const,reason:'in_formation'};
 const prophetType=STAR_TO_PROPHET[hero.StarLevel]!;
 const cfg=prophetBanner(prophetType);
 if(!cfg)return {ok:false as const,reason:'config_missing'};
 return {
  ok:true as const,
  prophetType,
  element:base.element,
  cost:{itemId:cfg.currencyId,amount:cfg.baseCurrencyCount},
  summonType:cfg.summonType,
 };
}

export async function displaceRoutes(app:FastifyInstance,s:Storage){
 app.get<{Params:{sid:string}}>('/v1/heroes/:sid/displace',{
  schema:{params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getHeroes(s,id);
  await ensureCurrency(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHeroRow(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const blocked=await formationBlockedSids(s,id);
  const elig=eligibility(hero,blocked);
  const pending=await loadPending(s,id);
  const currency={itemId:DISPLACE_CURRENCY,amount:await itemAmount(s,id,DISPLACE_CURRENCY)};
  if(!elig.ok){
   return {
    eligible:false,
    reason:elig.reason,
    currency,
    pending:pending&&pending.sid===sid?pending:null,
   };
  }
  return {
   eligible:true,
   prophetType:elig.prophetType,
   element:elig.element,
   cost:elig.cost,
   summonType:elig.summonType,
   currency,
   pending:pending&&pending.sid===sid?pending:null,
  };
 });

 app.post<{Params:{sid:string}}>('/v1/heroes/:sid/displace',{
  schema:{params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getHeroes(s,id);
  await ensureCurrency(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHeroRow(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const existing=await loadPending(s,id);
  if(existing)return reply.code(409).send({error:'pending_exists',pending:existing});
  const blocked=await formationBlockedSids(s,id);
  const elig=eligibility(hero,blocked);
  if(!elig.ok)return reply.code(409).send({error:'ineligible',reason:elig.reason});
  const typeCfg=summonTypeCfg(elig.summonType);
  if(!typeCfg)return reply.code(500).send({error:'summon_type_missing'});
  if(!(await payItem(s,id,elig.cost.itemId,elig.cost.amount))){
   return reply.code(409).send({error:'insufficient_currency',need:elig.cost});
  }
  // load pity model for summon type
  const modelRow=await s.pg.query(
   'SELECT lib_count,lib_status,free_count,today_count,total_count FROM player_summon WHERE account_id=$1 AND summon_type=$2',
   [id,elig.summonType],
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
  const pulled=pullOnce(typeCfg,model,Math.random,elig.element,[hero.HeroId]);
  if(!pulled.item)return reply.code(409).send({error:'pull_empty'});
  const newHeroId=pulled.item[0]!;
  if(newHeroId===hero.HeroId)return reply.code(409).send({error:'pull_same_hero'});
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
   [id,elig.summonType,JSON.stringify(after.libCount),JSON.stringify(after.libStatus),after.freeCount,after.todayCount,after.totalCount],
  );
  await s.pg.query(
   `INSERT INTO player_displace(account_id,sid,old_hero_id,new_hero_id,prophet_type)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(account_id) DO UPDATE SET
     sid=EXCLUDED.sid,old_hero_id=EXCLUDED.old_hero_id,new_hero_id=EXCLUDED.new_hero_id,
     prophet_type=EXCLUDED.prophet_type,created_at=now()`,
   [id,sid,hero.HeroId,newHeroId,elig.prophetType],
  );
  return {
   ok:true,
   cost:elig.cost,
   pending:{sid,oldHeroId:hero.HeroId,newHeroId,prophetType:elig.prophetType},
   currency:{itemId:DISPLACE_CURRENCY,amount:await itemAmount(s,id,DISPLACE_CURRENCY)},
  };
 });

 app.post<{Params:{sid:string};Body:{newHeroId:number}}>('/v1/heroes/:sid/displace/save',{
  schema:{
   params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}},
   body:{type:'object',required:['newHeroId'],additionalProperties:false,properties:{newHeroId:{type:'integer',minimum:1}}},
  },
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const sid=Number(req.params.sid);
  const pending=await loadPending(s,id);
  if(!pending||pending.sid!==sid)return reply.code(409).send({error:'no_pending'});
  if(pending.newHeroId!==req.body.newHeroId)return reply.code(409).send({error:'new_hero_mismatch'});
  const hero=await loadHeroRow(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  if(hero.HeroId!==pending.oldHeroId)return reply.code(409).send({error:'hero_changed'});
  const updated=await saveHero(s,id,{...hero,HeroId:pending.newHeroId,SkinId:0});
  await clearPending(s,id);
  return {ok:true,hero:updated};
 });

 app.post<{Params:{sid:string}}>('/v1/heroes/:sid/displace/cancel',{
  schema:{params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const sid=Number(req.params.sid);
  const pending=await loadPending(s,id);
  if(!pending||pending.sid!==sid)return reply.code(409).send({error:'no_pending'});
  await clearPending(s,id);
  return {
   ok:true,
   currency:{itemId:DISPLACE_CURRENCY,amount:await itemAmount(s,id,DISPLACE_CURRENCY)},
  };
 });
}
