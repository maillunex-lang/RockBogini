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

async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

export async function getHeroes(s:Storage,id:string){
 const c=await s.pg.connect();
 try{
  await c.query('BEGIN');
  const created=await c.query('INSERT INTO hero_collections(account_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING account_id',[id]);
  if(created.rowCount)for(const h of starterHeroes)await c.query('INSERT INTO player_heroes(account_id,sid,hero_id,level,star,power,locked,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,h.Sid,h.HeroId,h.Level,h.StarLevel,h.Power,h.Locked,JSON.stringify(h)]);
  const rows=(await c.query('SELECT sid,hero_id,level,star,power,locked,state FROM player_heroes WHERE account_id=$1 ORDER BY sid',[id])).rows;
  await c.query('COMMIT');
  return rows.map(r=>({...r.state,Sid:r.sid,HeroId:r.hero_id,Level:r.level,StarLevel:r.star,Power:r.power,Locked:r.locked}));
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

function enrich(h:{Sid:number;HeroId:number;Level:number;StarLevel:number;Power:number;Locked:boolean;Attrs?:Record<string,number>;Skills?:number[]}){
 return {
  ...h,
  base:calculateHero(h.HeroId,h.Level,h.StarLevel),
  skillSlots:skillSlots(h.HeroId,h.Level,h.StarLevel),
  maxLevel:starMaxLevel(h.StarLevel),
  maxStar:heroMaxStar(h.HeroId),
  starPreview:nextStarPreview(h.HeroId,h.StarLevel),
 };
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

async function saveHero(s:Storage,id:string,h:{Sid:number;HeroId:number;Level:number;StarLevel:number;Power:number;Locked:boolean}){
 const base=calculateHero(h.HeroId,h.Level,h.StarLevel);
 const state={...h,Attrs:Object.fromEntries(Object.entries(base.attrs).map(([k,v])=>[k,v])),Skills:base.skills,Power:base.power};
 await s.pg.query(
  'UPDATE player_heroes SET level=$3,star=$4,power=$5,state=$6 WHERE account_id=$1 AND sid=$2',
  [id,h.Sid,h.Level,h.StarLevel,base.power,JSON.stringify(state)],
 );
 return enrich({...h,Power:base.power});
}

export async function heroRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/heroes',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  return {heroes:(await getHeroes(s,id)).map(enrich)};
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
  return {ok:true,cost:itemCost,fodder,refund:refundList,hero:updated,heroes:(await getHeroes(s,id)).map(enrich)};
 });
}
