/** Hero equipment put-on / put-off from ItemEquipment (slots 1..4). */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';

type EquipCfg={slot:number;star:number;nextId:number;score:number;xp:number;attrs:number[][]};
type EquipMap=Record<string,EquipCfg>;

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
   await s.pg.query('UPDATE player_equipment SET owner_sid=0 WHERE account_id=$1 AND sid=$2',[id,cur.Sid]);
   await grantItem(s,id,cur.ItemId,1);
  }
  const sid=await nextSid(s,id);
  await s.pg.query(
   'INSERT INTO player_equipment(account_id,sid,item_id,owner_sid,xp) VALUES($1,$2,$3,$4,0)',
   [id,sid,itemId,ownerId],
  );
  return {ok:true,equipment:await listEquip(s,id)};
 });

 app.post<{Body:{sid:number}}>('/v1/equipment/put-off',{
  schema:{body:{type:'object',required:['sid'],additionalProperties:false,properties:{sid:{type:'integer',minimum:1}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const r=await s.pg.query(
   'UPDATE player_equipment SET owner_sid=0 WHERE account_id=$1 AND sid=$2 AND owner_sid>0 RETURNING item_id',
   [id,req.body.sid],
  );
  if(r.rowCount!==1)return reply.code(409).send({error:'equip_not_worn'});
  await grantItem(s,id,r.rows[0].item_id,1);
  await s.pg.query('DELETE FROM player_equipment WHERE account_id=$1 AND sid=$2',[id,req.body.sid]);
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
  const slots=[1,2,3,4].map(slot=>({slot,equip:worn.find(e=>e.slot===slot)??null}));
  return {ownerId:owner,slots};
 });
}
