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
type BlessCfg={typeId:number;level:number;attrs:number[];score:number};
type BlessTypeCfg={unlockLevel:number;type:number;weight:number;desc:number[]};
type BlessLevelCfg={xp:number;materials:number[][];levelUp:number[];levelCrit:number[]};
export type BlessingModel={BlessingId:number;Level:number;Xp:number;Pool:number[]};

const SLOT_KEYS=['weapon','coat','glove','shoes'] as const;
const UNMATCHED_KEYS=['unmatchedWeapon','unmatchedCoat','unmatchedGlove','unmatchedShoes'] as const;
const XP_ITEMS=[101,102,103,104];
const COIN=1;
const SCORE_ATTR=82;
const POOL_MAX=8;

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
type SoulCfg={attr:number;materials:number[][];unlockStar:number};
const SOUL=loadJson<Record<string,SoulCfg>>('holy-equip-soul.json',{});
const BLESS=loadJson<Record<string,BlessCfg>>('holy-equip-blessing.json',{});
const BLESS_TYPE=loadJson<Record<string,BlessTypeCfg>>('holy-equip-blessing-type.json',{});
const BLESS_LEVEL=loadJson<Record<string,BlessLevelCfg>>('holy-equip-blessing-level.json',{});

export function holyConfig(itemId:number):HolyCfg|undefined{return HE[String(itemId)]}
function gs(key:string,fallback=0):number{
 const v=GS[key];
 return typeof v==='number'&&!Number.isNaN(v)?v:fallback;
}
function starCfg(star:number):StarCfg|undefined{return STAR[String(100+star)]}
function stepCfg(step:number):StarCfg|undefined{return STAR[String(200+step)]}
function levelCfg(level:number):LevelCfg|undefined{return LEVEL[String(level)]}
function xpUnits():number[]{return LP['123']??[1000,5000,20000,50000]}
function blessCfg(id:number):BlessCfg|undefined{return BLESS[String(id)]}
function blessLevelCfg(level:number):BlessLevelCfg|undefined{return BLESS_LEVEL[String(level)]}
function soulCfg(stage:number):SoulCfg|undefined{return SOUL[String(stage)]}
export function blessingUnlockStar(index:1|2):number{
 return Math.trunc(gs(`HolyEquipBlessingUnlock${index}`,index));
}

/** Next soul stage cost for equipment Type (1..4): Materials[type-1] = [itemId, count]. */
export function nextSoulTarget(itemId:number,stage:number,star:number):{
 stage:number;attr:number;unlockStar:number;itemId:number;count:number;ready:boolean;
}|null{
 const cfg=holyConfig(itemId);
 const next=soulCfg(stage+1);
 if(!cfg||!next)return null;
 const mat=next.materials[cfg.type-1];
 const fodderId=mat?.[0]??0;
 const count=mat?.[1]??0;
 if(!fodderId||!count)return null;
 return {
  stage:stage+1,attr:next.attr,unlockStar:next.unlockStar,
  itemId:fodderId,count,ready:star>=next.unlockStar,
 };
}

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
 Blessing1?:BlessingModel|null;Blessing2?:BlessingModel|null;
};

function applyBlessing(attrs:number[][],score:number,b:BlessingModel|null|undefined):number{
 if(!b||!b.BlessingId)return score;
 const cfg=blessCfg(b.BlessingId);
 if(!cfg)return score;
 if(cfg.attrs.length>=2)attrs.push([cfg.attrs[0]!,cfg.attrs[1]!]);
 return score+cfg.score;
}

/** Weighted random blessing id = TypeId*100 + effect (HolyEquipBlessing). */
export function randomBlessing(level:number,effect:number,rng:()=>number=Math.random):number{
 const types=Object.entries(BLESS_TYPE)
  .map(([id,t])=>({id:Number(id),...t}))
  .filter(t=>t.unlockLevel<=level&&!!blessCfg(t.id*100+effect));
 const pool=types.length?types:Object.entries(BLESS_TYPE).map(([id,t])=>({id:Number(id),...t}));
 const total=pool.reduce((s,t)=>s+Math.max(t.weight,1),0);
 let roll=Math.floor(rng()*Math.max(total,1))+1;
 let picked=pool[0]!;
 for(const t of pool){
  const w=Math.max(t.weight,1);
  if(roll<=w){picked=t;break}
  roll-=w;
 }
 const id=picked.id*100+effect;
 return blessCfg(id)?id:picked.id*100+1;
}

export function blessOnce(bl:BlessingModel,effectMax:number,rng:()=>number=Math.random):BlessingModel{
 const next=blessLevelCfg(bl.Level+1);
 let xp=bl.Xp+1;
 let level=bl.Level;
 if(next&&xp>=next.xp){level=bl.Level+1;xp=0}
 const effect=Math.max(Math.min(level,effectMax),1);
 return {...bl,Level:level,Xp:xp,Pool:[...bl.Pool,randomBlessing(level,effect,rng)]};
}

/** Piece attrs + score (attr 82) from GetHolyEquipmentData (no gallery). */
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
 score=applyBlessing(attrs,score,e.Blessing1);
 score=applyBlessing(attrs,score,e.Blessing2);
 const f=e.Stage>0?1000+(soulCfg(e.Stage)?.attr??0):1000;
 if(e.Stage>0)score=Math.floor(score*f/1000);
 const out:number[][]=[];
 for(const [k,v] of attrs)out.push([k,Math.floor(v*f/1000)]);
 if(score)out.push([SCORE_ATTR,score]);
 return out;
}

function parseBlessing(raw:unknown):BlessingModel|null{
 if(!raw||typeof raw!=='object')return null;
 const o=raw as Record<string,unknown>;
 const id=Number(o.BlessingId??0);
 if(!id)return null;
 return {
  BlessingId:id,
  Level:Number(o.Level??1),
  Xp:Number(o.Xp??0),
  Pool:Array.isArray(o.Pool)?o.Pool.map(Number):[],
 };
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
  `SELECT sid,item_id,star,level,xp,stage,step,owner_sid,blessing1,blessing2
   FROM player_holy_equipment WHERE account_id=$1 AND owner_sid=$2 ORDER BY sid`,
  [accountId,ownerSid],
 );
 return r.rows.map(row=>({
  Sid:row.sid,ItemId:row.item_id,Star:row.star,Level:row.level,Xp:row.xp,
  Stage:row.stage,Step:row.step,OwnerId:row.owner_sid,
  Blessing1:parseBlessing(row.blessing1),Blessing2:parseBlessing(row.blessing2),
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
  `SELECT sid,item_id,star,level,xp,stage,step,owner_sid,blessing1,blessing2
   FROM player_holy_equipment WHERE account_id=$1 ORDER BY sid`,[id],
 )).rows as {sid:number;item_id:number;star:number;level:number;xp:number;stage:number;step:number;owner_sid:number;blessing1:unknown;blessing2:unknown}[];
 return rows.map(r=>{
  const cfg=holyConfig(r.item_id);
  const rec:HolyRec={
   Sid:r.sid,ItemId:r.item_id,Star:r.star,Level:r.level,Xp:r.xp,Stage:r.stage,Step:r.step,OwnerId:r.owner_sid,
   Blessing1:parseBlessing(r.blessing1),Blessing2:parseBlessing(r.blessing2),
  };
  const extra=holyPieceExtra(rec);
  return {
   ...rec,
   type:cfg?.type??0,suitId:cfg?.suitId??0,
   maxLevel:starCfg(r.star)?.maxLevel??0,
   blessingUnlock:[blessingUnlockStar(1),blessingUnlockStar(2)],
   attrs:extra.filter(p=>p[0]!==SCORE_ATTR),
   score:extra.find(p=>p[0]===SCORE_ATTR)?.[1]??0,
  };
 });
}

function blessingField(index:number):'blessing1'|'blessing2'|null{
 if(index===1)return 'blessing1';
 if(index===2)return 'blessing2';
 return null;
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
    nextSoul:equip?nextSoulTarget(equip.ItemId,equip.Stage,equip.Star):null,
   };
  });
  const bonus=holyWornBonus(worn.map(e=>({
   Sid:e.Sid,ItemId:e.ItemId,Star:e.Star,Level:e.Level,Xp:e.Xp,Stage:e.Stage,Step:e.Step,OwnerId:e.OwnerId,
   Blessing1:e.Blessing1,Blessing2:e.Blessing2,
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

 async function loadHolyRow(id:string,sid:number){
  const row=await s.pg.query(
   `SELECT sid,item_id,star,level,xp,stage,step,owner_sid,blessing1,blessing2
    FROM player_holy_equipment WHERE account_id=$1 AND sid=$2`,[id,sid],
  );
  if(!row.rowCount)return null;
  const r=row.rows[0];
  return {
   sid:r.sid as number,item_id:r.item_id as number,star:r.star as number,level:r.level as number,
   xp:r.xp as number,stage:r.stage as number,step:r.step as number,owner_sid:r.owner_sid as number,
   Blessing1:parseBlessing(r.blessing1),Blessing2:parseBlessing(r.blessing2),
  };
 }

 app.post<{Body:{sid:number;index:number}}>('/v1/holy/blessing/unlock',{
  schema:{body:{type:'object',required:['sid','index'],additionalProperties:false,properties:{
   sid:{type:'integer',minimum:1},
   index:{type:'integer',enum:[1,2]},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const index=req.body.index as 1|2;
  const field=blessingField(index);
  if(!field)return reply.code(400).send({error:'invalid_index'});
  const rec=await loadHolyRow(id,req.body.sid);
  if(!rec)return reply.code(404).send({error:'holy_not_found'});
  const need=blessingUnlockStar(index);
  if(rec.star<need)return reply.code(409).send({error:'holy_blessing_locked',need});
  const cur=index===1?rec.Blessing1:rec.Blessing2;
  if(cur&&cur.BlessingId>0)return reply.code(409).send({error:'holy_blessing_exists'});
  const blessing:BlessingModel={BlessingId:randomBlessing(1,1),Level:1,Xp:0,Pool:[]};
  await s.pg.query(
   `UPDATE player_holy_equipment SET ${field}=$3 WHERE account_id=$1 AND sid=$2`,
   [id,rec.sid,JSON.stringify(blessing)],
  );
  if(rec.owner_sid>0)await refreshHeroGear(s,id,rec.owner_sid);
  return {ok:true,index,blessing,holy:await listHoly(s,id)};
 });

 app.post<{Body:{sid:number;index:number;count?:number}}>('/v1/holy/blessing/bless',{
  schema:{body:{type:'object',required:['sid','index'],additionalProperties:false,properties:{
   sid:{type:'integer',minimum:1},
   index:{type:'integer',enum:[1,2]},
   count:{type:'integer',minimum:1,maximum:8},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const index=req.body.index as 1|2;
  const field=blessingField(index)!;
  const rec=await loadHolyRow(id,req.body.sid);
  if(!rec)return reply.code(404).send({error:'holy_not_found'});
  const bl=index===1?rec.Blessing1:rec.Blessing2;
  if(!bl||bl.BlessingId<=0)return reply.code(409).send({error:'holy_blessing_missing'});
  if(bl.Pool.length>=POOL_MAX)return reply.code(409).send({error:'holy_blessing_pool_full'});
  const effectMax=starCfg(rec.star)?.blessingMaxLevel??0;
  const want=Math.min(req.body.count??1,POOL_MAX-bl.Pool.length);
  let cur={...bl,Pool:[...bl.Pool]};
  const costs:[number,number][]=[];
  for(let i=0;i<want;i++){
   const cost=matPairs(blessLevelCfg(cur.Level)?.materials??[]);
   const paid:typeof cost=[];
   let failed:number|null=null;
   for(const [itemId,n] of cost){
    if(!(await payItem(s,id,itemId,n))){failed=itemId;break}
    paid.push([itemId,n]);
   }
   if(failed!=null){
    for(const [itemId,n] of paid)await grantItem(s,id,itemId,n);
    if(costs.length===0)return reply.code(409).send({error:'insufficient_materials',itemId:failed});
    break;
   }
   costs.push(...paid);
   cur=blessOnce(cur,effectMax);
   if(cur.Pool.length>=POOL_MAX)break;
  }
  await s.pg.query(
   `UPDATE player_holy_equipment SET ${field}=$3 WHERE account_id=$1 AND sid=$2`,
   [id,rec.sid,JSON.stringify(cur)],
  );
  if(rec.owner_sid>0)await refreshHeroGear(s,id,rec.owner_sid);
  return {ok:true,index,blessing:cur,cost:costs,holy:await listHoly(s,id)};
 });

 app.post<{Body:{sid:number;index:number;poolIndex:number}}>('/v1/holy/blessing/replace',{
  schema:{body:{type:'object',required:['sid','index','poolIndex'],additionalProperties:false,properties:{
   sid:{type:'integer',minimum:1},
   index:{type:'integer',enum:[1,2]},
   poolIndex:{type:'integer',minimum:0,maximum:7},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const index=req.body.index as 1|2;
  const field=blessingField(index)!;
  const rec=await loadHolyRow(id,req.body.sid);
  if(!rec)return reply.code(404).send({error:'holy_not_found'});
  const bl=index===1?rec.Blessing1:rec.Blessing2;
  if(!bl)return reply.code(409).send({error:'holy_blessing_missing'});
  const pick=bl.Pool[req.body.poolIndex];
  if(pick==null)return reply.code(409).send({error:'holy_blessing_pool_miss'});
  const next:BlessingModel={...bl,BlessingId:pick,Pool:[]};
  await s.pg.query(
   `UPDATE player_holy_equipment SET ${field}=$3 WHERE account_id=$1 AND sid=$2`,
   [id,rec.sid,JSON.stringify(next)],
  );
  if(rec.owner_sid>0)await refreshHeroGear(s,id,rec.owner_sid);
  return {ok:true,index,blessing:next,holy:await listHoly(s,id)};
 });

 app.post<{Body:{sid:number;index:number}}>('/v1/holy/blessing/clear',{
  schema:{body:{type:'object',required:['sid','index'],additionalProperties:false,properties:{
   sid:{type:'integer',minimum:1},
   index:{type:'integer',enum:[1,2]},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const index=req.body.index as 1|2;
  const field=blessingField(index)!;
  const rec=await loadHolyRow(id,req.body.sid);
  if(!rec)return reply.code(404).send({error:'holy_not_found'});
  const bl=index===1?rec.Blessing1:rec.Blessing2;
  if(!bl||!bl.Pool.length)return reply.code(409).send({error:'holy_blessing_pool_empty'});
  const next:BlessingModel={...bl,Pool:[]};
  await s.pg.query(
   `UPDATE player_holy_equipment SET ${field}=$3 WHERE account_id=$1 AND sid=$2`,
   [id,rec.sid,JSON.stringify(next)],
  );
  return {ok:true,index,blessing:next,holy:await listHoly(s,id)};
 });

 app.post<{Body:{sid:number}}>('/v1/holy/soul',{
  schema:{body:{type:'object',required:['sid'],additionalProperties:false,properties:{sid:{type:'integer',minimum:1}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const rec=await loadHolyRow(id,req.body.sid);
  if(!rec)return reply.code(404).send({error:'holy_not_found'});
  const target=nextSoulTarget(rec.item_id,rec.stage,rec.star);
  if(!target)return reply.code(409).send({error:'holy_max_soul'});
  if(!target.ready)return reply.code(409).send({error:'holy_soul_locked',need:target.unlockStar});
  const spare=await s.pg.query(
   `SELECT sid FROM player_holy_equipment
    WHERE account_id=$1 AND item_id=$2 AND owner_sid=0 AND sid<>$3
    ORDER BY sid LIMIT $4`,
   [id,target.itemId,rec.sid,target.count],
  );
  if((spare.rowCount??0)<target.count){
   return reply.code(409).send({error:'insufficient_soul_materials',itemId:target.itemId,need:target.count,have:spare.rowCount??0});
  }
  const sids=spare.rows.map(r=>Number(r.sid));
  await s.pg.query(
   'DELETE FROM player_holy_equipment WHERE account_id=$1 AND sid=ANY($2::int[])',[id,sids],
  );
  const stage=rec.stage+1;
  await s.pg.query(
   'UPDATE player_holy_equipment SET stage=$3 WHERE account_id=$1 AND sid=$2',[id,rec.sid,stage],
  );
  if(rec.owner_sid>0)await refreshHeroGear(s,id,rec.owner_sid);
  return {
   ok:true,
   consumed:sids.map(sid=>({sid,itemId:target.itemId})),
   before:{Stage:rec.stage},
   after:{Stage:stage,attr:target.attr},
   holy:await listHoly(s,id),
  };
 });
}
