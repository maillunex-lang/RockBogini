/** Holy equipment (HolyEquipment_Model): put-on/off, level-up, attrs → power. */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {calculateHero} from './heroAttrs.js';
import {equipConfig,equipExtraPairs,wornItemIds} from './equipment.js';

type HolyCfg={type:number;suitId:number;attrs:number[][];canDisplace:number;state:number;nextStateId:number};
type StarCfg={
 maxLevel:number;blessingMaxLevel:number;score:number;materials:number[][];
 weapon:number[][];coat:number[][];glove:number[][];shoes:number[][];
 unmatchedWeapon:number[][];unmatchedCoat:number[][];unmatchedGlove:number[][];unmatchedShoes:number[][];
 unlock:number[];displaceMaterials:number[][];
};
type LevelCfg={xp:number;score:number;weapon:number[][];coat:number[][];glove:number[][];shoes:number[][]};
type SuitCfg={skillTwoId:number;skillFourId:number;upStepSkillTwoId:number;upStepSkillFourId:number};

const SLOT_KEYS=['weapon','coat','glove','shoes'] as const;
const UNMATCHED_KEYS=['unmatchedWeapon','unmatchedCoat','unmatchedGlove','unmatchedShoes'] as const;
const XP_ITEMS=[101,102,103,104];
const COIN=1;
const SCORE_ATTR=82;

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];

function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}

const HE=loadJson<Record<string,HolyCfg>>('holy-equipment.json',{});
const STAR=loadJson<Record<string,StarCfg>>('holy-equipment-star.json',{});
const LEVEL=loadJson<Record<string,LevelCfg>>('holy-equipment-level.json',{});
const SUIT=loadJson<Record<string,SuitCfg>>('holy-equip-suit.json',{});
const GS=loadJson<Record<string,number>>('holy-global.json',{});
const LP=loadJson<Record<string,number[]>>('holy-level-param.json',{'123':[1000,5000,20000,50000]});
const SOUL=loadJson<Record<string,{attr:number}>>('holy-equip-soul.json',{});

export function holyConfig(itemId:number):HolyCfg|undefined{return HE[String(itemId)]}
function gs(key:string,fallback=0):number{
 const v=GS[key];
 return typeof v==='number'&&!Number.isNaN(v)?v:fallback;
}
function starCfg(star:number):StarCfg|undefined{return STAR[String(100+star)]}
function stepCfg(step:number):StarCfg|undefined{return STAR[String(200+step)]}
function levelCfg(level:number):LevelCfg|undefined{return LEVEL[String(level)]}
function xpUnits():number[]{return LP['123']??[1000,5000,20000,50000]}

/** type 1 = Star, type 2 = Step (Req_Holy_EquipmentStarUp). */
export function nextStarTarget(star:number,step:number,type:1|2):{
 field:'Star'|'Step';value:number;cfg:StarCfg;materials:[number,number][];
}|null{
 if(type===2){
  const cfg=stepCfg(step+1);
  if(!cfg)return null;
  return {field:'Step',value:step+1,cfg,materials:matPairs(cfg.materials)};
 }
 const cfg=starCfg(star+1);
 if(!cfg)return null;
 return {field:'Star',value:star+1,cfg,materials:matPairs(cfg.materials)};
}

function matPairs(rows:number[][]):[number,number][]{
 const out:[number,number][]=[];
 for(const row of rows){
  const id=row[0],n=row[1];
  if(id&&n)out.push([id,n]);
 }
 return out;
}

function unlockOk(star:number,step:number,unlock:number[]):boolean{
 if(unlock.length<2)return true;
 return star>=(unlock[0]??0)&&step>=(unlock[1]??0);
}

export function canStarUp(star:number,step:number,type:1|2):boolean{
 const next=nextStarTarget(star,step,type);
 if(!next)return false;
 return unlockOk(star,step,next.cfg.unlock);
}

function addPairs(out:number[][],rows:number[][]|undefined){
 if(!rows)return;
 for(const row of rows){
  const k=row[0],v=row[1];
  if(k&&v)out.push([k,v]);
 }
}

export type HolyRec={
 Sid:number;ItemId:number;Star:number;Level:number;Xp:number;Stage:number;Step:number;OwnerId:number;
};

/** Piece attrs + score (attr 82) from GetHolyEquipmentData (no gallery/blessing). */
export function holyPieceExtra(e:HolyRec):number[][]{
 const c=holyConfig(e.ItemId);
 if(!c)return [];
 const slot=c.type>=1&&c.type<=4?c.type-1:-1;
 const attrs:number[][]=[];
 addPairs(attrs,c.attrs);
 let score=gs('HolyEquipmentScore',10000);
 if(e.Level>0){
  const lv=levelCfg(e.Level);
  if(lv){
   if(slot>=0)addPairs(attrs,lv[SLOT_KEYS[slot]!]);
   score+=lv.score;
  }
 }
 const sc=starCfg(e.Star);
 if(sc){
  if(slot>=0)addPairs(attrs,sc[SLOT_KEYS[slot]!]);
  score+=sc.score;
 }
 if(e.Step!==0){
  const st=stepCfg(e.Step);
  if(st&&slot>=0){
   addPairs(attrs,st[UNMATCHED_KEYS[slot]!]);
   score+=st.score;
  }
 }
 const f=e.Stage>0?1000+(SOUL[String(e.Stage)]?.attr??0):1000;
 if(e.Stage>0)score=Math.floor(score*f/1000);
 const out:number[][]=[];
 for(const [k,v] of attrs)out.push([k,Math.floor(v*f/1000)]);
 if(score)out.push([SCORE_ATTR,score]);
 return out;
}

/** Worn holy extras + suit flat power (HolyEquipSuit/Step N Power). */
export function holyWornBonus(worn:HolyRec[]):{extra:number[][];powerBonus:number}{
 const extra:number[][]=[];
 const suitCount=new Map<number,number>();
 const suitStep=new Map<number,number>();
 for(const e of worn){
  const c=holyConfig(e.ItemId);
  if(!c)continue;
  extra.push(...holyPieceExtra(e));
  suitCount.set(c.suitId,(suitCount.get(c.suitId)??0)+1);
  suitStep.set(c.suitId,(suitStep.get(c.suitId)??0)+(e.Step>0?1:0));
 }
 let powerBonus=0;
 for(const [suitId,n] of [...suitCount.entries()].sort((a,b)=>a[0]-b[0])){
  if(!SUIT[String(suitId)])continue;
  const stepped=suitStep.get(suitId)??0;
  if(n>=4){
   const kind=stepped>=4?'Step':'Suit';
   powerBonus+=gs(`HolyEquip${kind}4Power`);
   extra.push([SCORE_ATTR,gs(`HolyEquip${kind}4Score`)]);
  }else if(n>=2){
   const kind=stepped>=2?'Step':'Suit';
   powerBonus+=gs(`HolyEquip${kind}2Power`);
   extra.push([SCORE_ATTR,gs(`HolyEquip${kind}2Score`)]);
  }
 }
 return {extra,powerBonus};
}

export async function wornHoly(s:Storage,accountId:string,ownerSid:number):Promise<HolyRec[]>{
 const r=await s.pg.query(
  `SELECT sid,item_id,star,level,xp,stage,step,owner_sid
   FROM player_holy_equipment WHERE account_id=$1 AND owner_sid=$2 ORDER BY sid`,
  [accountId,ownerSid],
 );
 return r.rows.map(row=>({
  Sid:row.sid,ItemId:row.item_id,Star:row.star,Level:row.level,Xp:row.xp,
  Stage:row.stage,Step:row.step,OwnerId:row.owner_sid,
 }));
}

/** Combined normal+holy gear for calculateHero. */
export async function heroGear(s:Storage,accountId:string,ownerSid:number):Promise<{extra:number[][];powerBonus:number}>{
 const eq=equipExtraPairs(await wornItemIds(s,accountId,ownerSid));
 const holy=holyWornBonus(await wornHoly(s,accountId,ownerSid));
 return {extra:[...eq,...holy.extra],powerBonus:holy.powerBonus};
}

export async function refreshHeroGear(s:Storage,id:string,ownerSid:number){
 if(ownerSid<=0)return;
 const r=await s.pg.query(
  'SELECT sid,hero_id,level,star,power,locked,state FROM player_heroes WHERE account_id=$1 AND sid=$2',
  [id,ownerSid],
 );
 if(!r.rowCount)return;
 const row=r.rows[0];
 const h={...row.state,Sid:row.sid,HeroId:row.hero_id,Level:row.level,StarLevel:row.star,Power:row.power,Locked:row.locked};
 const {extra,powerBonus}=await heroGear(s,id,ownerSid);
 const base=calculateHero(h.HeroId,h.Level,h.StarLevel,false,extra,powerBonus);
 const state={...h,Attrs:Object.fromEntries(Object.entries(base.attrs).map(([k,v])=>[k,v])),Skills:base.skills,Power:base.power};
 await s.pg.query(
  'UPDATE player_heroes SET power=$3,state=$4 WHERE account_id=$1 AND sid=$2',
  [id,ownerSid,base.power,JSON.stringify(state)],
 );
}

async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

async function nextSid(s:Storage,id:string){
 const r=await s.pg.query('SELECT COALESCE(MAX(sid),0)+1 AS n FROM player_holy_equipment WHERE account_id=$1',[id]);
 return Number(r.rows[0].n);
}

async function listHoly(s:Storage,id:string){
 const rows=(await s.pg.query(
  `SELECT sid,item_id,star,level,xp,stage,step,owner_sid
   FROM player_holy_equipment WHERE account_id=$1 ORDER BY sid`,[id],
 )).rows as {sid:number;item_id:number;star:number;level:number;xp:number;stage:number;step:number;owner_sid:number}[];
 return rows.map(r=>{
  const cfg=holyConfig(r.item_id);
  const rec:HolyRec={Sid:r.sid,ItemId:r.item_id,Star:r.star,Level:r.level,Xp:r.xp,Stage:r.stage,Step:r.step,OwnerId:r.owner_sid};
  return {
   ...rec,
   type:cfg?.type??0,suitId:cfg?.suitId??0,
   maxLevel:starCfg(r.star)?.maxLevel??0,
   attrs:holyPieceExtra(rec).filter(p=>p[0]!==SCORE_ATTR),
   score:holyPieceExtra(rec).find(p=>p[0]===SCORE_ATTR)?.[1]??0,
  };
 });
}

async function heroExists(s:Storage,id:string,sid:number){
 const r=await s.pg.query('SELECT 1 FROM player_heroes WHERE account_id=$1 AND sid=$2',[id,sid]);
 return r.rowCount===1;
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

async function slotHoly(s:Storage,id:string,owner:number,slot:number){
 const all=await listHoly(s,id);
 return all.find(e=>e.OwnerId===owner&&e.type===slot)??null;
}

/** Clear normal equipment occupying the same slot (returns to bag). */
export async function clearNormalSlot(s:Storage,id:string,owner:number,slot:number){
 const rows=(await s.pg.query(
  'SELECT sid,item_id FROM player_equipment WHERE account_id=$1 AND owner_sid=$2',[id,owner],
 )).rows as {sid:number;item_id:number}[];
 for(const row of rows){
  const cfg=equipConfig(row.item_id);
  if(cfg?.slot!==slot)continue;
  await grantItem(s,id,row.item_id,1);
  await s.pg.query('DELETE FROM player_equipment WHERE account_id=$1 AND sid=$2',[id,row.sid]);
 }
}

/** Clear holy occupying slot (OwnerId → 0). */
export async function clearHolySlot(s:Storage,id:string,owner:number,slot:number){
 const cur=await slotHoly(s,id,owner,slot);
 if(!cur)return;
 await s.pg.query(
  'UPDATE player_holy_equipment SET owner_sid=0 WHERE account_id=$1 AND sid=$2',[id,cur.Sid],
 );
}

function levelFor(xp:number,maxLevel:number):number{
 let best=0;
 for(let i=0;i<=maxLevel;i++){
  const cfg=levelCfg(i);
  if(cfg&&cfg.xp<=xp)best=i;
 }
 return best;
}

function refundExtra(extra:number,xps:number[]):[number,number][]{
 if(extra<=0)return [];
 let left=extra;
 const items:[number,number][]=[];
 for(let i=XP_ITEMS.length-1;i>=0;i--){
  const unit=xps[i]??0;
  if(unit<=0)continue;
  const n=Math.floor(left/unit);
  left=left%unit;
  if(n>0)items.push([XP_ITEMS[i]!,n]);
 }
 return items;
}

export async function holyRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/holy',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  return {holy:await listHoly(s,id)};
 });

 app.post<{Body:{itemId:number;ownerId:number}}>('/v1/holy/put-on',{
  schema:{body:{type:'object',required:['itemId','ownerId'],additionalProperties:false,properties:{
   itemId:{type:'integer',minimum:1},
   ownerId:{type:'integer',minimum:1},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const {itemId,ownerId}=req.body;
  const cfg=holyConfig(itemId);
  if(!cfg)return reply.code(404).send({error:'holy_not_found'});
  if(!(await heroExists(s,id,ownerId)))return reply.code(404).send({error:'hero_not_found'});
  if(!(await payItem(s,id,itemId,1)))return reply.code(409).send({error:'insufficient_items'});
  await clearNormalSlot(s,id,ownerId,cfg.type);
  const cur=await slotHoly(s,id,ownerId,cfg.type);
  if(cur){
   await s.pg.query('UPDATE player_holy_equipment SET owner_sid=0 WHERE account_id=$1 AND sid=$2',[id,cur.Sid]);
  }
  const sid=await nextSid(s,id);
  await s.pg.query(
   `INSERT INTO player_holy_equipment(account_id,sid,item_id,star,level,xp,stage,step,owner_sid)
    VALUES($1,$2,$3,0,0,0,0,0,$4)`,
   [id,sid,itemId,ownerId],
  );
  await refreshHeroGear(s,id,ownerId);
  return {ok:true,holy:await listHoly(s,id)};
 });

 app.post<{Body:{sid:number;ownerId:number}}>('/v1/holy/wear',{
  schema:{body:{type:'object',required:['sid','ownerId'],additionalProperties:false,properties:{
   sid:{type:'integer',minimum:1},
   ownerId:{type:'integer',minimum:1},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const {sid,ownerId}=req.body;
  if(!(await heroExists(s,id,ownerId)))return reply.code(404).send({error:'hero_not_found'});
  const row=await s.pg.query(
   'SELECT sid,item_id,owner_sid FROM player_holy_equipment WHERE account_id=$1 AND sid=$2',[id,sid],
  );
  if(!row.rowCount)return reply.code(404).send({error:'holy_not_found'});
  const rec=row.rows[0];
  const cfg=holyConfig(rec.item_id);
  if(!cfg)return reply.code(404).send({error:'holy_config_missing'});
  const oldOwner=Number(rec.owner_sid);
  await clearNormalSlot(s,id,ownerId,cfg.type);
  const cur=await slotHoly(s,id,ownerId,cfg.type);
  if(cur&&cur.Sid!==sid){
   await s.pg.query('UPDATE player_holy_equipment SET owner_sid=0 WHERE account_id=$1 AND sid=$2',[id,cur.Sid]);
  }
  await s.pg.query('UPDATE player_holy_equipment SET owner_sid=$3 WHERE account_id=$1 AND sid=$2',[id,sid,ownerId]);
  if(oldOwner>0&&oldOwner!==ownerId)await refreshHeroGear(s,id,oldOwner);
  await refreshHeroGear(s,id,ownerId);
  return {ok:true,holy:await listHoly(s,id)};
 });

 app.post<{Body:{sid:number}}>('/v1/holy/put-off',{
  schema:{body:{type:'object',required:['sid'],additionalProperties:false,properties:{sid:{type:'integer',minimum:1}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const cur=await s.pg.query(
   'SELECT owner_sid FROM player_holy_equipment WHERE account_id=$1 AND sid=$2 AND owner_sid>0',
   [id,req.body.sid],
  );
  if(cur.rowCount!==1)return reply.code(409).send({error:'holy_not_worn'});
  const ownerSid=Number(cur.rows[0].owner_sid);
  await s.pg.query('UPDATE player_holy_equipment SET owner_sid=0 WHERE account_id=$1 AND sid=$2',[id,req.body.sid]);
  await refreshHeroGear(s,id,ownerSid);
  return {ok:true,holy:await listHoly(s,id)};
 });

 app.get<{Params:{sid:string}}>('/v1/heroes/:sid/holy',{
  schema:{params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const owner=Number(req.params.sid);
  if(!(await heroExists(s,id,owner)))return reply.code(404).send({error:'hero_not_found'});
  const worn=(await listHoly(s,id)).filter(e=>e.OwnerId===owner);
  const slots=[1,2,3,4].map(slot=>{
   const equip=worn.find(e=>e.type===slot)??null;
   const maxLevel=equip?starCfg(equip.Star)?.maxLevel??0:0;
   const starNext=equip?nextStarTarget(equip.Star,equip.Step,1):null;
   const stepNext=equip?nextStarTarget(equip.Star,equip.Step,2):null;
   return {
    slot,equip,maxLevel,
    nextStar:starNext&&canStarUp(equip!.Star,equip!.Step,1)?{value:starNext.value,materials:starNext.materials}:null,
    nextStep:stepNext&&canStarUp(equip!.Star,equip!.Step,2)?{value:stepNext.value,materials:stepNext.materials}:null,
   };
  });
  const bonus=holyWornBonus(worn.map(e=>({
   Sid:e.Sid,ItemId:e.ItemId,Star:e.Star,Level:e.Level,Xp:e.Xp,Stage:e.Stage,Step:e.Step,OwnerId:e.OwnerId,
  })));
  return {ownerId:owner,slots,powerBonus:bonus.powerBonus,score:bonus.extra.filter(p=>p[0]===SCORE_ATTR).reduce((s,p)=>s+(p[1]??0),0)};
 });

 app.post<{Body:{sid:number;counts:number[]}}>('/v1/holy/level-up',{
  schema:{body:{type:'object',required:['sid','counts'],additionalProperties:false,properties:{
   sid:{type:'integer',minimum:1},
   counts:{type:'array',minItems:4,maxItems:4,items:{type:'integer',minimum:0,maximum:9999}},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const row=await s.pg.query(
   'SELECT sid,item_id,star,level,xp,stage,step,owner_sid FROM player_holy_equipment WHERE account_id=$1 AND sid=$2',
   [id,req.body.sid],
  );
  if(!row.rowCount)return reply.code(404).send({error:'holy_not_found'});
  const rec=row.rows[0] as {sid:number;item_id:number;star:number;level:number;xp:number;stage:number;step:number;owner_sid:number};
  const sc=starCfg(rec.star);
  if(!sc)return reply.code(404).send({error:'star_config_missing'});
  if(rec.level>=sc.maxLevel)return reply.code(409).send({error:'holy_max_level'});
  const maxXp=levelCfg(sc.maxLevel)?.xp;
  if(maxXp==null)return reply.code(500).send({error:'level_config_missing'});
  const xps=xpUnits();
  const counts=req.body.counts;
  const items:[number,number][]=[];
  let added=0;
  for(let i=0;i<4;i++){
   const n=counts[i]??0;
   if(n>0){items.push([XP_ITEMS[i]!,n]);added+=n*(xps[i]??0)}
  }
  if(!items.length)return reply.code(400).send({error:'no_materials'});
  const newXp=Math.min(rec.xp+added,maxXp);
  const gained=newXp-rec.xp;
  const coin=Math.round(gained*gs('HolyEquipmentXpPrice',0.2));
  for(const [itemId,n] of items){
   if(!(await payItem(s,id,itemId,n)))return reply.code(409).send({error:'insufficient_materials',itemId});
  }
  if(coin>0&&!(await payItem(s,id,COIN,coin)))return reply.code(409).send({error:'insufficient_coin',cost:coin});
  const refund=refundExtra(rec.xp+added-newXp,xps);
  for(const [itemId,n] of refund)await grantItem(s,id,itemId,n);
  const level=levelFor(newXp,sc.maxLevel);
  await s.pg.query(
   'UPDATE player_holy_equipment SET xp=$3,level=$4 WHERE account_id=$1 AND sid=$2',
   [id,rec.sid,newXp,level],
  );
  if(rec.owner_sid>0)await refreshHeroGear(s,id,rec.owner_sid);
  return {
   ok:true,
   cost:[[COIN,coin],...items],
   refund,
   before:{Level:rec.level,Xp:rec.xp},
   after:{Level:level,Xp:newXp},
   holy:await listHoly(s,id),
  };
 });

 app.post<{Body:{sid:number;type?:number}}>('/v1/holy/star-up',{
  schema:{body:{type:'object',required:['sid'],additionalProperties:false,properties:{
   sid:{type:'integer',minimum:1},
   type:{type:'integer',enum:[1,2]},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const kind=(req.body.type===2?2:1) as 1|2;
  const row=await s.pg.query(
   'SELECT sid,item_id,star,level,xp,stage,step,owner_sid FROM player_holy_equipment WHERE account_id=$1 AND sid=$2',
   [id,req.body.sid],
  );
  if(!row.rowCount)return reply.code(404).send({error:'holy_not_found'});
  const rec=row.rows[0] as {sid:number;item_id:number;star:number;level:number;xp:number;stage:number;step:number;owner_sid:number};
  const next=nextStarTarget(rec.star,rec.step,kind);
  if(!next)return reply.code(409).send({error:kind===2?'holy_max_step':'holy_max_star'});
  if(!unlockOk(rec.star,rec.step,next.cfg.unlock))return reply.code(409).send({error:'holy_unlock',need:next.cfg.unlock});
  if(!next.materials.length)return reply.code(500).send({error:'star_materials_missing'});
  for(const [itemId,n] of next.materials){
   if(!(await payItem(s,id,itemId,n)))return reply.code(409).send({error:'insufficient_materials',itemId});
  }
  if(next.field==='Star'){
   await s.pg.query('UPDATE player_holy_equipment SET star=$3 WHERE account_id=$1 AND sid=$2',[id,rec.sid,next.value]);
  }else{
   await s.pg.query('UPDATE player_holy_equipment SET step=$3 WHERE account_id=$1 AND sid=$2',[id,rec.sid,next.value]);
  }
  if(rec.owner_sid>0)await refreshHeroGear(s,id,rec.owner_sid);
  return {
   ok:true,
   type:kind,
   cost:next.materials,
   before:{Star:rec.star,Step:rec.step},
   after:{Star:next.field==='Star'?next.value:rec.star,Step:next.field==='Step'?next.value:rec.step},
   holy:await listHoly(s,id),
  };
 });
}
