/** Hero equipment put-on / put-off / forge from ItemEquipment (slots 1..4). */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {calculateHero} from './heroAttrs.js';

type EquipCfg={slot:number;star:number;nextId:number;score:number;xp:number;attrs:number[][]};
type EquipMap=Record<string,EquipCfg>;
type Mat={itemId:number;count:number;unit:number};

const COIN=1;
/** GlobalSetting EquipmentXpPrice */
export const EQUIP_XP_PRICE=200;

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];

function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}

const EQ:EquipMap=loadJson('item-equipment.json',{});

export function equipConfig(itemId:number):EquipCfg|undefined{
 return EQ[String(itemId)];
}

/** Flat attr pairs for worn ItemEquipment (+ Score → attr 82). */
export function equipExtraPairs(itemIds:number[]):number[][]{
 const out:number[][]=[];
 let score=0;
 for(const id of itemIds){
  const cfg=equipConfig(id);
  if(!cfg)continue;
  for(const [k,v] of cfg.attrs)if(k&&v)out.push([k,v]);
  score+=cfg.score;
 }
 if(score)out.push([82,score]);
 return out;
}

export async function wornItemIds(s:Storage,accountId:string,ownerSid:number):Promise<number[]>{
 const r=await s.pg.query(
  'SELECT item_id FROM player_equipment WHERE account_id=$1 AND owner_sid=$2 ORDER BY sid',
  [accountId,ownerSid],
 );
 return r.rows.map(x=>Number(x.item_id));
}

/** Coin XP cost from original forge_cost (own base+xp vs materials). */
export function forgeCost(own:number,mats:Mat[]):number{
 if(!mats.length)return 0;
 const sorted=[...mats].sort((a,b)=>a.unit-b.unit);
 const last=sorted[sorted.length-1]!;
 const init=sorted.slice(0,-1);
 const total=(list:Mat[])=>list.reduce((s,m)=>s+m.unit*m.count,0);
 return own>last.unit?total(sorted):own+total(init);
}

/** Climb NextId while total >= next.Xp; return final itemId + leftover xp. */
export function climbEquip(startId:number,total:number):{itemId:number;xp:number}|null{
 let id=startId;
 let cfg=equipConfig(id);
 if(!cfg)return null;
 for(;;){
  if(cfg.nextId<=0)return {itemId:id,xp:0};
  const next=equipConfig(cfg.nextId);
  if(!next||total<next.xp)return {itemId:id,xp:Math.max(0,total-cfg.xp)};
  id=cfg.nextId;
  cfg=next;
 }
}

async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

async function nextSid(s:Storage,id:string){
 const r=await s.pg.query('SELECT COALESCE(MAX(sid),0)+1 AS n FROM player_equipment WHERE account_id=$1',[id]);
 return Number(r.rows[0].n);
}

async function listEquip(s:Storage,id:string){
 const rows=(await s.pg.query(
  'SELECT sid,item_id,owner_sid,xp FROM player_equipment WHERE account_id=$1 ORDER BY sid',[id],
 )).rows as {sid:number;item_id:number;owner_sid:number;xp:number}[];
 return rows.map(r=>{
  const cfg=equipConfig(r.item_id);
  return {
   Sid:r.sid,ItemId:r.item_id,OwnerId:r.owner_sid,Xp:r.xp,
   slot:cfg?.slot??0,star:cfg?.star??0,score:cfg?.score??0,attrs:cfg?.attrs??[],
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

async function slotEquip(s:Storage,id:string,owner:number,slot:number){
 const all=await listEquip(s,id);
 return all.find(e=>e.OwnerId===owner&&e.slot===slot)??null;
}

async function refreshOwner(s:Storage,id:string,ownerSid:number){
 if(ownerSid<=0)return;
 const r=await s.pg.query(
  'SELECT sid,hero_id,level,star,power,locked,state FROM player_heroes WHERE account_id=$1 AND sid=$2',
  [id,ownerSid],
 );
 if(!r.rowCount)return;
 const row=r.rows[0];
 const h={...row.state,Sid:row.sid,HeroId:row.hero_id,Level:row.level,StarLevel:row.star,Power:row.power,Locked:row.locked};
 const extra=equipExtraPairs(await wornItemIds(s,id,ownerSid));
 const base=calculateHero(h.HeroId,h.Level,h.StarLevel,false,extra);
 const state={...h,Attrs:Object.fromEntries(Object.entries(base.attrs).map(([k,v])=>[k,v])),Skills:base.skills,Power:base.power};
 await s.pg.query(
  'UPDATE player_heroes SET power=$3,state=$4 WHERE account_id=$1 AND sid=$2',
  [id,ownerSid,base.power,JSON.stringify(state)],
 );
}

export async function equipmentRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/equipment',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  return {equipment:await listEquip(s,id)};
 });

 app.post<{Body:{itemId:number;ownerId:number}}>('/v1/equipment/put-on',{
  schema:{body:{type:'object',required:['itemId','ownerId'],additionalProperties:false,properties:{
   itemId:{type:'integer',minimum:1},
   ownerId:{type:'integer',minimum:1},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const {itemId,ownerId}=req.body;
  const cfg=equipConfig(itemId);
  if(!cfg)return reply.code(404).send({error:'equip_not_found'});
  if(!(await heroExists(s,id,ownerId)))return reply.code(404).send({error:'hero_not_found'});
  if(!(await payItem(s,id,itemId,1)))return reply.code(409).send({error:'insufficient_items'});
  const cur=await slotEquip(s,id,ownerId,cfg.slot);
  if(cur){
   await grantItem(s,id,cur.ItemId,1);
   await s.pg.query('DELETE FROM player_equipment WHERE account_id=$1 AND sid=$2',[id,cur.Sid]);
  }
  const sid=await nextSid(s,id);
  await s.pg.query(
   'INSERT INTO player_equipment(account_id,sid,item_id,owner_sid,xp) VALUES($1,$2,$3,$4,0)',
   [id,sid,itemId,ownerId],
  );
  await refreshOwner(s,id,ownerId);
  return {ok:true,equipment:await listEquip(s,id)};
 });

 app.post<{Body:{sid:number}}>('/v1/equipment/put-off',{
  schema:{body:{type:'object',required:['sid'],additionalProperties:false,properties:{sid:{type:'integer',minimum:1}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const cur=await s.pg.query(
   'SELECT item_id,owner_sid FROM player_equipment WHERE account_id=$1 AND sid=$2 AND owner_sid>0',
   [id,req.body.sid],
  );
  if(cur.rowCount!==1)return reply.code(409).send({error:'equip_not_worn'});
  const ownerSid=Number(cur.rows[0].owner_sid);
  await grantItem(s,id,cur.rows[0].item_id,1);
  await s.pg.query('DELETE FROM player_equipment WHERE account_id=$1 AND sid=$2',[id,req.body.sid]);
  await refreshOwner(s,id,ownerSid);
  return {ok:true,equipment:await listEquip(s,id)};
 });

 app.get<{Params:{sid:string}}>('/v1/heroes/:sid/equipment',{
  schema:{params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const owner=Number(req.params.sid);
  if(!(await heroExists(s,id,owner)))return reply.code(404).send({error:'hero_not_found'});
  const worn=(await listEquip(s,id)).filter(e=>e.OwnerId===owner);
  const slots=[1,2,3,4].map(slot=>{
   const equip=worn.find(e=>e.slot===slot)??null;
   const cur=equip?equipConfig(equip.ItemId):null;
   const next=cur?.nextId?equipConfig(cur.nextId):null;
   return {slot,equip,nextId:cur?.nextId||null,nextNeed:next?.xp??null,ownXp:cur?(cur.xp+(equip?.Xp??0)):0};
  });
  return {ownerId:owner,slots};
 });

 app.post<{Body:{sid:number;materials:{itemId:number;count:number}[]}}>('/v1/equipment/forge',{
  schema:{body:{type:'object',required:['sid','materials'],additionalProperties:false,properties:{
   sid:{type:'integer',minimum:1},
   materials:{type:'array',minItems:1,maxItems:32,items:{type:'object',required:['itemId','count'],additionalProperties:false,properties:{
    itemId:{type:'integer',minimum:1},
    count:{type:'integer',minimum:1,maximum:999},
   }}},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const row=await s.pg.query(
   'SELECT sid,item_id,owner_sid,xp FROM player_equipment WHERE account_id=$1 AND sid=$2',
   [id,req.body.sid],
  );
  if(!row.rowCount)return reply.code(404).send({error:'equip_not_found'});
  const rec=row.rows[0] as {sid:number;item_id:number;owner_sid:number;xp:number};
  const cfg=equipConfig(rec.item_id);
  if(!cfg)return reply.code(404).send({error:'equip_config_missing'});
  if(cfg.nextId<=0)return reply.code(409).send({error:'equip_max'});
  const mats:Mat[]=[];
  for(const m of req.body.materials){
   const mc=equipConfig(m.itemId);
   if(!mc)return reply.code(400).send({error:'invalid_material',itemId:m.itemId});
   mats.push({itemId:m.itemId,count:m.count,unit:mc.xp});
  }
  const own=cfg.xp+rec.xp;
  const gained=mats.reduce((s,m)=>s+m.unit*m.count,0);
  const xpCost=forgeCost(own,mats);
  const coin=xpCost*EQUIP_XP_PRICE;
  for(const m of mats){
   if(!(await payItem(s,id,m.itemId,m.count)))return reply.code(409).send({error:'insufficient_materials',itemId:m.itemId});
  }
  if(coin>0&&!(await payItem(s,id,COIN,coin)))return reply.code(409).send({error:'insufficient_coin',cost:coin});
  const climbed=climbEquip(rec.item_id,own+gained);
  if(!climbed)return reply.code(500).send({error:'forge_failed'});
  await s.pg.query(
   'UPDATE player_equipment SET item_id=$3,xp=$4 WHERE account_id=$1 AND sid=$2',
   [id,rec.sid,climbed.itemId,climbed.xp],
  );
  if(rec.owner_sid>0)await refreshOwner(s,id,rec.owner_sid);
  return {
   ok:true,
   cost:[[COIN,coin],...mats.map(m=>[m.itemId,m.count] as [number,number])],
   gained,
   before:{ItemId:rec.item_id,Xp:rec.xp},
   after:{ItemId:climbed.itemId,Xp:climbed.xp},
   equipment:await listEquip(s,id),
  };
 });
}
