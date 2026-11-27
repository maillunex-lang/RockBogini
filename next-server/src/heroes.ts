import {calculateHero,skillSlots} from './heroAttrs.js';
import type {Storage} from './storage.js';
import type {FastifyInstance} from 'fastify';
import {sessionAccount} from './auth.js';
import {starterHeroes} from './starterHeroes.js';
import {
 assignFodder,
 autoPickFodder,
 heroMaxStar,
 levelCost,
 levelRefund,
 nextStarPreview,
 starItemMaterials,
 starHeroMaterials,
 starMaxLevel,
 type FodderHero,
} from './heroGrowth.js';
import {
 TALENT_PVE,
 talentCost,
 talentField,
 talentMaxLevel,
 talentRefund,
 talentUnlocked,
} from './heroTalent.js';
import {
 heroJobTree,
 jobConditionOk,
 jobConfig,
 jobMaterials,
 jobRoots,
} from './heroJob.js';
import {
 LUCK_UNLOCK_STAR,
 luckClear,
 luckField,
 luckSkill,
 luckStudyCost,
 luckUnlocked,
 sameLuckType,
} from './heroLuck.js';
import {heroGear} from './holy.js';

async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

export async function getHeroes(s:Storage,id:string){
 const c=await s.pg.connect();
 try{
  await c.query('BEGIN');
  const created=await c.query('INSERT INTO hero_collections(account_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING account_id',[id]);
  if(created.rowCount){
   // An account may have received a summon before its starter collection was initialized
   // in older server revisions. Preserve that hero's SID and allocate an unused SID
   // to the missing starter instead of failing with player_heroes_pkey.
   const sidRows=await c.query('SELECT sid FROM player_heroes WHERE account_id=$1 FOR UPDATE',[id]);
   const occupied=new Set<number>(sidRows.rows.map((row:{sid:number})=>Number(row.sid)));
   let nextSid=Math.max(1003,...occupied.values())+1;
   for(const h of starterHeroes){
    const sid=occupied.has(h.Sid)?nextSid++:h.Sid;
    occupied.add(sid);
    const state={...h,Sid:sid};
    await c.query(
     'INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
     [id,sid,h.HeroId,h.Level,h.StarLevel,h.Power,h.Locked,JSON.stringify(state)],
    );
   }
  }
  const rows=(await c.query('SELECT sid,hero_id,level,star,power,locked,state FROM player_heroes WHERE account_id=$1 ORDER BY sid',[id])).rows;
  await c.query('COMMIT');
  return rows.map(r=>({...r.state,Sid:r.sid,HeroId:r.hero_id,Level:r.level,StarLevel:r.star,Power:r.power,Locked:r.locked}));
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

function enrich(h:{
 Sid:number;HeroId:number;Level:number;StarLevel:number;Power:number;Locked:boolean;
 PVETalentLevel?:number;PVPTalentLevel?:number;Job?:number;JobMap?:Record<string|number,number>;
 LuckSkill1?:number;LuckSkill2?:number;
 Attrs?:Record<string,number>;Skills?:number[];
},extra:number[][]=[],powerBonus=0){
 const pve=h.PVETalentLevel??0,pvp=h.PVPTalentLevel??0;
 const luck1=h.LuckSkill1??0,luck2=h.LuckSkill2??0;
 const jobMap=h.JobMap??{};
 const tree=heroJobTree(h.HeroId).map(node=>{
  const unlocked=(jobMap[node.jobId]??jobMap[String(node.jobId)]??0)>0;
  const preOk=node.pre===0||(jobMap[node.pre]??jobMap[String(node.pre)]??0)>0;
  const condOk=!node.cfg||jobConditionOk(h.StarLevel,node.cfg.condition);
  return {
   index:node.index,jobId:node.jobId,pre:node.pre,unlocked,
   canUnlock:!unlocked&&preOk&&condOk,
   materials:node.cfg?jobMaterials(node.jobId):[],
   condition:node.cfg?.condition??[],
   skill:node.cfg?.skill??0,
  };
 });
 const luckSlot=(index:1|2,id:number)=>({
  index,id,unlocked:luckUnlocked(h.StarLevel,index),needStar:LUCK_UNLOCK_STAR[index],
  ...(id?{type:luckSkill(id)?.type,quality:luckSkill(id)?.quality,power:luckSkill(id)?.power}:{}),
 });
 const base=calculateHero(h.HeroId,h.Level,h.StarLevel,false,extra,powerBonus);
 return {
  ...h,
  Job:h.Job??0,
  JobMap:jobMap,
  LuckSkill1:luck1,
  LuckSkill2:luck2,
  ...(extra.length||powerBonus?{Power:base.power}:{}),
  base,
  skillSlots:skillSlots(h.HeroId,h.Level,h.StarLevel),
  maxLevel:starMaxLevel(h.StarLevel),
  maxStar:heroMaxStar(h.HeroId),
  starPreview:nextStarPreview(h.HeroId,h.StarLevel),
  talent:{
   pve,pvp,max:talentMaxLevel(),
   pveUnlocked:talentUnlocked(h.Level,h.StarLevel,TALENT_PVE,pve),
   pvpUnlocked:talentUnlocked(h.Level,h.StarLevel,2,pve),
  },
  jobs:tree,
  luck:{slots:[luckSlot(1,luck1),luckSlot(2,luck2)]},
  equipExtra:extra,
  holyPowerBonus:powerBonus,
 };
}

async function enrichAll(s:Storage,id:string,heroes:Awaited<ReturnType<typeof getHeroes>>){
 const out=[];
 for(const h of heroes){
  const gear=await heroGear(s,id,h.Sid);
  out.push(enrich(h,gear.extra,gear.powerBonus));
 }
 return out;
}

async function payItems(s:Storage,id:string,costs:[number,number][]){
 for(const [itemId,n] of costs){
  if(n<=0)continue;
  const r=await s.pg.query(
   'UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3 RETURNING amount::text',
   [id,itemId,n],
  );
  if(r.rowCount!==1)return false;
 }
 return true;
}

async function grantItems(s:Storage,id:string,gains:[number,number][]){
 for(const [itemId,n] of gains){
  if(n<=0)continue;
  await s.pg.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,
   [id,itemId,n],
  );
 }
}

async function loadHero(s:Storage,id:string,sid:number){
 const r=await s.pg.query(
  'SELECT sid,hero_id,level,star,power,locked,state FROM player_heroes WHERE account_id=$1 AND sid=$2',
  [id,sid],
 );
 if(!r.rowCount)return null;
 const row=r.rows[0];
 return {...row.state,Sid:row.sid,HeroId:row.hero_id,Level:row.level,StarLevel:row.star,Power:row.power,Locked:row.locked};
}

async function formationBlocked(s:Storage,id:string):Promise<Set<number>>{
 await s.pg.query('INSERT INTO player_formations(account_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
 const row=(await s.pg.query('SELECT hero_ids FROM player_formations WHERE account_id=$1',[id])).rows[0];
 return new Set<number>((row?.hero_ids??[]).filter((x:number)=>x>0));
}

export async function saveHero(s:Storage,id:string,h:{Sid:number;HeroId:number;Level:number;StarLevel:number;Power:number;Locked:boolean}&Record<string,unknown>){
 const gear=await heroGear(s,id,h.Sid);
 const base=calculateHero(h.HeroId,h.Level,h.StarLevel,false,gear.extra,gear.powerBonus);
 const state={
  ...h,
  SkinId:0,
  Attrs:Object.fromEntries(Object.entries(base.attrs).map(([k,v])=>[k,v])),
  Skills:base.skills,
  Power:base.power,
 };
 await s.pg.query(
  'UPDATE player_heroes SET hero_id=$3,level=$4,star=$5,power=$6,state=$7 WHERE account_id=$1 AND sid=$2',
  [id,h.Sid,h.HeroId,h.Level,h.StarLevel,base.power,JSON.stringify(state)],
 );
 return enrich({...h,Power:base.power},gear.extra,gear.powerBonus);
}

export async function loadHeroRow(s:Storage,id:string,sid:number){
 return loadHero(s,id,sid);
}

export async function formationBlockedSids(s:Storage,id:string){
 return formationBlocked(s,id);
}

export async function heroRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/heroes',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  return {heroes:await enrichAll(s,id,await getHeroes(s,id))};
 });

 app.post<{Params:{sid:string};Body:{newLevel:number}}>('/v1/heroes/:sid/level',{
  schema:{
   params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}},
   body:{type:'object',required:['newLevel'],additionalProperties:false,properties:{newLevel:{type:'integer',minimum:2,maximum:1340}}},
  },
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getHeroes(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHero(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const newLevel=req.body.newLevel;
  const cap=starMaxLevel(hero.StarLevel);
  if(newLevel<=hero.Level)return reply.code(400).send({error:'level_not_higher'});
  if(newLevel>cap)return reply.code(409).send({error:'level_cap',maxLevel:cap});
  const cost=levelCost(hero.Level,newLevel);
  if(!(await payItems(s,id,cost)))return reply.code(409).send({error:'insufficient_materials',cost});
  const updated=await saveHero(s,id,{...hero,Level:newLevel});
  return {ok:true,cost,hero:updated};
 });

 app.post<{Params:{sid:string};Body:{materials?:number[];auto?:boolean}}>('/v1/heroes/:sid/star',{
  schema:{
   params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}},
   body:{type:'object',additionalProperties:false,properties:{
    materials:{type:'array',items:{type:'integer',minimum:1},maxItems:64},
    auto:{type:'boolean'},
   }},
  },
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const all=await getHeroes(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHero(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const newStar=hero.StarLevel+1;
  const maxStar=heroMaxStar(hero.HeroId);
  if(newStar>maxStar)return reply.code(409).send({error:'star_cap',maxStar});
  const heroReqs=starHeroMaterials(newStar);
  const itemCost=starItemMaterials(newStar);
  const preview=nextStarPreview(hero.HeroId,hero.StarLevel);
  const pool:FodderHero[]=all.map(h=>({sid:h.Sid,heroId:h.HeroId,star:h.StarLevel,locked:!!h.Locked}));
  const blocked=await formationBlocked(s,id);
  let fodder:number[]=[];
  if(heroReqs.length){
   if(req.body?.auto||!req.body?.materials){
    const picked=autoPickFodder(hero.HeroId,sid,heroReqs,pool,blocked);
    if(!picked)return reply.code(409).send({error:'star_needs_fodder',nextStar:newStar,requirements:preview});
    fodder=picked;
   }else{
    const assigned=assignFodder(hero.HeroId,sid,heroReqs,req.body.materials,pool.filter(h=>!blocked.has(h.sid)));
    if(!assigned)return reply.code(409).send({error:'invalid_fodder',nextStar:newStar,requirements:preview});
    fodder=assigned;
   }
  }else if(req.body?.materials?.length){
   return reply.code(400).send({error:'fodder_not_required'});
  }

  // Refund level mats from fodder, then delete them
  const refund:[number,number][]=[];
  for(const fsid of fodder){
   const f=await loadHero(s,id,fsid);
   if(!f||f.Locked||blocked.has(fsid))return reply.code(409).send({error:'fodder_unavailable',sid:fsid});
   refund.push(...levelRefund(f.Level));
  }
  if(fodder.length){
   await s.pg.query('DELETE FROM player_heroes WHERE account_id=$1 AND sid=ANY($2::int[])',[id,fodder]);
  }
  // Merge refund map
  const refundMap=new Map<number,number>();
  for(const [iid,n] of refund)refundMap.set(iid,(refundMap.get(iid)??0)+n);
  const refundList:[number,number][]=[...refundMap.entries()];
  await grantItems(s,id,refundList);

  if(!(await payItems(s,id,itemCost))){
   // Best-effort: materials already spent on fodder; surface error for item cost
   return reply.code(409).send({error:'insufficient_materials',cost:itemCost,fodderConsumed:fodder,refund:refundList});
  }

  const cap=starMaxLevel(newStar);
  const level=Math.min(hero.Level,cap||hero.Level);
  const updated=await saveHero(s,id,{...hero,StarLevel:newStar,Level:level});
  return {ok:true,cost:itemCost,fodder,refund:refundList,hero:updated,heroes:await enrichAll(s,id,await getHeroes(s,id))};
 });

 app.post<{Params:{sid:string};Body:{type:number;count?:number;materials?:number[];auto?:boolean}}>('/v1/heroes/:sid/talent',{
  schema:{
   params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}},
   body:{type:'object',required:['type'],additionalProperties:false,properties:{
    type:{type:'integer',enum:[1,2]},
    count:{type:'integer',minimum:1,maximum:6},
    materials:{type:'array',items:{type:'integer',minimum:1},maxItems:64},
    auto:{type:'boolean'},
   }},
  },
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const all=await getHeroes(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHero(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const type=req.body.type;
  const field=talentField(type);
  if(!field)return reply.code(400).send({error:'invalid_talent_type'});
  const cur=Number(hero[field]??0);
  const count=req.body.count??1;
  if(!talentUnlocked(hero.Level,hero.StarLevel,type,hero.PVETalentLevel??0)){
   return reply.code(409).send({error:'talent_locked',needStar:10});
  }
  if(cur+count>talentMaxLevel())return reply.code(409).send({error:'talent_cap',max:talentMaxLevel()});
  const cost=talentCost(cur,type,count);
  if(!cost)return reply.code(409).send({error:'talent_cap'});
  const pool:FodderHero[]=all.map(h=>({sid:h.Sid,heroId:h.HeroId,star:h.StarLevel,locked:!!h.Locked}));
  const blocked=await formationBlocked(s,id);
  let fodder:number[]=[];
  if(cost.heroReqs.length){
   if(req.body.auto||!req.body.materials){
    const picked=autoPickFodder(hero.HeroId,sid,cost.heroReqs,pool,blocked);
    if(!picked)return reply.code(409).send({error:'talent_needs_fodder',requirements:cost.heroReqs});
    fodder=picked;
   }else{
    const assigned=assignFodder(hero.HeroId,sid,cost.heroReqs,req.body.materials,pool.filter(h=>!blocked.has(h.sid)));
    if(!assigned)return reply.code(409).send({error:'invalid_fodder'});
    fodder=assigned;
   }
  }
  const refund:[number,number][]=[];
  for(const fsid of fodder){
   const f=await loadHero(s,id,fsid);
   if(!f||f.Locked||blocked.has(fsid))return reply.code(409).send({error:'fodder_unavailable',sid:fsid});
   refund.push(...levelRefund(f.Level));
  }
  if(fodder.length)await s.pg.query('DELETE FROM player_heroes WHERE account_id=$1 AND sid=ANY($2::int[])',[id,fodder]);
  const refundMap=new Map<number,number>();
  for(const [iid,n] of refund)refundMap.set(iid,(refundMap.get(iid)??0)+n);
  await grantItems(s,id,[...refundMap.entries()]);
  if(!(await payItems(s,id,cost.items)))return reply.code(409).send({error:'insufficient_materials',cost:cost.items});
  const next={...hero,[field]:cur+count};
  const updated=await saveHero(s,id,next);
  return {ok:true,cost:cost.items,fodder,hero:updated,heroes:await enrichAll(s,id,await getHeroes(s,id))};
 });

 app.post<{Params:{sid:string};Body:{type:number}}>('/v1/heroes/:sid/talent/reset',{
  schema:{
   params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}},
   body:{type:'object',required:['type'],additionalProperties:false,properties:{type:{type:'integer',enum:[1,2]}}},
  },
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getHeroes(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHero(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const field=talentField(req.body.type);
  if(!field)return reply.code(400).send({error:'invalid_talent_type'});
  const cur=Number(hero[field]??0);
  if(cur<=0)return reply.code(409).send({error:'talent_empty'});
  const refund=talentRefund(cur,req.body.type);
  await grantItems(s,id,refund);
  const updated=await saveHero(s,id,{...hero,[field]:0});
  return {ok:true,refund,hero:updated};
 });

 app.post<{Params:{sid:string};Body:{index:number}}>('/v1/heroes/:sid/job',{
  schema:{
   params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}},
   body:{type:'object',required:['index'],additionalProperties:false,properties:{index:{type:'integer',minimum:0,maximum:63}}},
  },
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getHeroes(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHero(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const tree=heroJobTree(hero.HeroId);
  const node=tree[req.body.index];
  if(!node)return reply.code(400).send({error:'invalid_job_index'});
  const cfg=jobConfig(node.jobId);
  if(!cfg)return reply.code(404).send({error:'job_not_found'});
  const jobMap:{[k:string]:number}={...(hero.JobMap??{})};
  const already=(jobMap[node.jobId]??jobMap[String(node.jobId)]??0)>0;
  if(already){
   const updated=await saveHero(s,id,{...hero,Job:node.jobId,JobMap:jobMap});
   return {ok:true,switched:true,hero:updated};
  }
  if(node.pre!==0&&!(jobMap[node.pre]??jobMap[String(node.pre)])){
   return reply.code(409).send({error:'job_prereq',pre:node.pre});
  }
  if(!jobConditionOk(hero.StarLevel,cfg.condition)){
   return reply.code(409).send({error:'job_locked',condition:cfg.condition});
  }
  const cost=jobMaterials(node.jobId);
  if(!(await payItems(s,id,cost)))return reply.code(409).send({error:'insufficient_materials',cost});
  jobMap[node.jobId]=1;
  const updated=await saveHero(s,id,{...hero,Job:node.jobId,JobMap:jobMap});
  return {ok:true,unlocked:true,cost,hero:updated};
 });

 app.post<{Params:{sid:string}}>('/v1/heroes/:sid/job/reset',{
  schema:{params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getHeroes(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHero(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const roots=new Set(jobRoots(hero.HeroId));
  const jobMap:{[k:string]:number}={...(hero.JobMap??{})};
  const refund:[number,number][]=[];
  const keep:{[k:string]:number}={};
  for(const [jid,v] of Object.entries(jobMap)){
   if(!v)continue;
   const idNum=Number(jid);
   if(roots.has(idNum)){keep[jid]=1;continue}
   refund.push(...jobMaterials(idNum));
  }
  const refundMap=new Map<number,number>();
  for(const [iid,n] of refund)refundMap.set(iid,(refundMap.get(iid)??0)+n);
  const refundList:[number,number][]=[...refundMap.entries()];
  await grantItems(s,id,refundList);
  const curJob=hero.Job??0;
  const nextJob=roots.has(curJob)?curJob:(Number(Object.keys(keep)[0])||0);
  const updated=await saveHero(s,id,{...hero,Job:nextJob,JobMap:keep});
  return {ok:true,refund:refundList,hero:updated};
 });

 app.post<{Params:{sid:string};Body:{index:number;type:number;param:number}}>('/v1/heroes/:sid/luck',{
  schema:{
   params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}},
   body:{type:'object',required:['index','type','param'],additionalProperties:false,properties:{
    index:{type:'integer',enum:[1,2]},
    type:{type:'integer',enum:[1,2]},
    param:{type:'integer',minimum:1},
   }},
  },
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getHeroes(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHero(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const field=luckField(req.body.index);
  if(!field)return reply.code(400).send({error:'invalid_luck_slot'});
  if(!luckUnlocked(hero.StarLevel,req.body.index)){
   return reply.code(409).send({error:'luck_locked',needStar:LUCK_UNLOCK_STAR[req.body.index]});
  }
  const cur=Number(hero[field]??0);
  const studied=luckStudyCost(cur,req.body.type,req.body.param);
  if(!studied)return reply.code(404).send({error:'luck_skill_not_found'});
  const otherField=luckField(3-req.body.index)!;
  if(sameLuckType(Number(hero[otherField]??0),studied.skill)){
   return reply.code(409).send({error:'luck_same_type'});
  }
  if(!(await payItems(s,id,studied.cost)))return reply.code(409).send({error:'insufficient_materials',cost:studied.cost});
  const updated=await saveHero(s,id,{...hero,[field]:studied.skill});
  return {ok:true,cost:studied.cost,hero:updated};
 });

 app.post<{Params:{sid:string};Body:{index:number;type:number}}>('/v1/heroes/:sid/luck/clear',{
  schema:{
   params:{type:'object',required:['sid'],properties:{sid:{type:'string',pattern:'^[0-9]+$'}}},
   body:{type:'object',required:['index','type'],additionalProperties:false,properties:{
    index:{type:'integer',enum:[1,2]},
    type:{type:'integer',enum:[1,2]},
   }},
  },
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getHeroes(s,id);
  const sid=Number(req.params.sid);
  const hero=await loadHero(s,id,sid);
  if(!hero)return reply.code(404).send({error:'hero_not_found'});
  const field=luckField(req.body.index);
  if(!field)return reply.code(400).send({error:'invalid_luck_slot'});
  const cur=Number(hero[field]??0);
  if(cur<=0)return reply.code(409).send({error:'luck_empty'});
  const cleared=luckClear(cur,req.body.type);
  if(!cleared)return reply.code(404).send({error:'luck_skill_not_found'});
  if(cleared.cost.length&&!(await payItems(s,id,cleared.cost))){
   return reply.code(409).send({error:'insufficient_materials',cost:cleared.cost});
  }
  await grantItems(s,id,cleared.refund);
  const updated=await saveHero(s,id,{...hero,[field]:0});
  return {ok:true,refund:cleared.refund,cost:cleared.cost,hero:updated};
 });
}
