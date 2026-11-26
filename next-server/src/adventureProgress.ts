/** AdventureReward + online LevelParam 129 (Req_Adventure_ReceiveRewards / Req_Player_OnlineRewards). */
import {readFileSync} from 'node:fs';
import type {PoolClient} from 'pg';
import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';

type AdventureRow={id:number;mapId:number;rewards:number[][]};
type OnlineTier={itemId:number;count:number;minutes:number};
type Cfg={adventureRewards:AdventureRow[];onlineRewards:OnlineTier[]};

const cfg=JSON.parse(readFileSync(new URL('../../data/adventure-progress-rewards.json',import.meta.url),'utf8')) as Cfg;
const ADVENTURE=cfg.adventureRewards.slice().sort((a,b)=>a.id-b.id);
const ONLINE=cfg.onlineRewards;

async function authAccount(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

async function grant(c:PoolClient,id:string,item:number,amount:number){
 await c.query(
  `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=
    CASE WHEN EXCLUDED.item_id=7 THEN LEAST(30000,player_items.amount+EXCLUDED.amount)
    ELSE player_items.amount+EXCLUDED.amount END`,
  [id,item,amount],
 );
}

export function pendingAdventure(claimed:number,stage:number){
 return ADVENTURE.filter(r=>r.id>claimed&&r.mapId<stage);
}

export function pendingOnline(index:number,onlineMs:number){
 const ready:OnlineTier[]=[];
 for(let i=index;i<ONLINE.length;i++){
  const tier=ONLINE[i]!;
  if(tier.minutes*60_000>onlineMs)break;
  ready.push(tier);
 }
 return ready;
}

export async function adventureProgressRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/campaign/progress-rewards',async(req,reply)=>{
  const id=await authAccount(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const row=(await s.pg.query(
   'SELECT stage,adventure_reward_index,online_reward_index,last_login_at FROM player_profiles WHERE account_id=$1',[id],
  )).rows[0];
  const stage=Number(row.stage);
  const claimed=Number(row.adventure_reward_index??0);
  const onlineIndex=Number(row.online_reward_index??0);
  const onlineMs=Math.max(0,Date.now()-Number(new Date(row.last_login_at)));
  const adventure=pendingAdventure(claimed,stage).map(r=>({id:r.id,mapId:r.mapId,rewards:r.rewards}));
  const online=pendingOnline(onlineIndex,onlineMs).map(t=>({itemId:t.itemId,count:t.count,minutes:t.minutes}));
  const nextOnline=ONLINE[onlineIndex]??null;
  return {
   stage,
   adventure:{claimed,pending:adventure,claimable:adventure.length>0},
   online:{
    index:onlineIndex,
    onlineMinutes:Math.floor(onlineMs/60_000),
    pending:online,
    claimable:online.length>0,
    next:nextOnline,
    tiers:ONLINE,
    lastLoginAt:new Date(row.last_login_at).toISOString(),
   },
  };
 });

 app.post('/v1/campaign/progress-rewards/adventure',async(req,reply)=>{
  const id=await authAccount(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const row=(await c.query(
    'SELECT stage,adventure_reward_index FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id],
   )).rows[0];
   const pending=pendingAdventure(Number(row.adventure_reward_index??0),Number(row.stage));
   if(!pending.length){await c.query('ROLLBACK');return reply.code(409).send({error:'nothing_to_claim'})}
   const rewards:number[][]=[];
   for(const r of pending){
    for(const [item,n] of r.rewards){
     if(item&&n){await grant(c,id,item,n);rewards.push([item,n])}
    }
   }
   const last=pending[pending.length-1]!.id;
   await c.query('UPDATE player_profiles SET adventure_reward_index=$2 WHERE account_id=$1',[id,last]);
   await c.query('COMMIT');
   return {claimed:last,rewards,rows:pending.map(r=>r.id)};
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });

 app.post('/v1/campaign/progress-rewards/online',async(req,reply)=>{
  const id=await authAccount(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const row=(await c.query(
    'SELECT online_reward_index,last_login_at FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id],
   )).rows[0];
   const index=Number(row.online_reward_index??0);
   const onlineMs=Math.max(0,Date.now()-Number(new Date(row.last_login_at)));
   const ready=pendingOnline(index,onlineMs);
   if(!ready.length){await c.query('ROLLBACK');return reply.code(409).send({error:'nothing_to_claim'})}
   const rewards:number[][]=[];
   for(const t of ready){
    await grant(c,id,t.itemId,t.count);
    rewards.push([t.itemId,t.count]);
   }
   const next=index+ready.length;
   await c.query('UPDATE player_profiles SET online_reward_index=$2 WHERE account_id=$1',[id,next]);
   await c.query('COMMIT');
   return {index:next,rewards,onlineMinutes:Math.floor(onlineMs/60_000)};
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });
}
