import {readFileSync} from 'node:fs';
import {randomInt} from 'node:crypto';
import type {PoolClient} from 'pg';
const cfg=JSON.parse(readFileSync(new URL('../../data/campaign-dependencies.json',import.meta.url),'utf8')) as {idle:Record<number,{common:number[][];random:number[][]}>;libs:Record<number,number[][]>;modules:{id:number;r1:number[][];r2:number[][]}[];limit:number};
type Counts=Record<number,number>;
export const IDLE_LIMIT_MINUTES=cfg.limit;
/** GlobalSetting / LevelParam 109 (non-VIP). */
export const QUICK_BATTLE_MINUTES=120;
export const QUICK_FREE_DAILY=1;
export const QUICK_PAID_DAILY=3;
export const QUICK_DIAMOND_COSTS=[50,100,150] as const;
export const DIAMOND_ITEM=3;
export function idleStageRates(stage:number){
 const row=cfg.idle[stage];
 if(!row)return {common:[] as {itemId:number;perMinute:number}[],random:[] as {libId:number;perMinute:number}[]};
 return {
  common:row.common.map(([itemId,rate])=>({itemId,perMinute:rate/100000})),
  random:row.random.map(([libId,rate])=>({libId,perMinute:rate/100000})),
 };
}
/** Pending rewards ordered by stage common then random-lib product order (Elixir pending/1). */
export function orderedIdleRewards(stage:number,rewards:Counts):[number,number][]{
 const row=cfg.idle[stage];
 const out:[number,number][]=[];
 const seen=new Set<number>();
 if(row){
  for(const [itemId] of row.common){
   const n=rewards[itemId]??0;
   if(n>0){out.push([itemId,n]);seen.add(itemId)}
  }
  for(const [libId] of row.random){
   for(const [itemId] of cfg.libs[libId]??[]){
    if(seen.has(itemId)||!itemId)continue;
    const n=rewards[itemId]??0;
    if(n>0){out.push([itemId,n]);seen.add(itemId)}
   }
  }
 }
 for(const [k,n] of Object.entries(rewards)){
  const itemId=Number(k);
  if(!seen.has(itemId)&&n>0)out.push([itemId,n]);
 }
 return out;
}
export function accrueIdle(stage:number,minutes:number,points:Counts={},pick:(max:number)=>number=max=>randomInt(max)+1){
 const row=cfg.idle[stage];if(!row)throw Error('idle_stage_missing');const rewards:Counts={},next={...points};
 const add=(id:number,n:number)=>{if(n>0)rewards[id]=(rewards[id]??0)+n};
 for(const [kind,rows] of [[2,row.common],[1,row.random]] as const)for(const [id,rate] of rows){const key=id*100+kind,total=(next[key]??0)+rate*minutes,whole=Math.floor(total/100000);next[key]=total%100000;if(kind===2)add(id,whole);else{const entries=cfg.libs[id]??[],max=entries.reduce((s,e)=>s+e[2],0);if(max>0)for(let i=0;i<whole;i++){let n=pick(max);for(const [item,count,w] of entries){n-=w;if(n<=0){add(item,count);break}}}}}
 return {points:next,rewards};
}
export async function settleIdle(c:PoolClient,id:string,stage:number){
 await c.query('INSERT INTO campaign_idle(account_id,received_at,settled_at) SELECT id,created_at,created_at FROM accounts WHERE id=$1 ON CONFLICT DO NOTHING',[id]);
 const row=(await c.query('SELECT * FROM campaign_idle WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
 const from=Math.max(+row.received_at,+row.settled_at),minutes=Math.max(0,Math.floor((Math.min(Date.now(),+row.received_at+cfg.limit*60000)-from)/60000));
 const a=accrueIdle(stage,minutes,row.points);const rewards={...row.rewards};for(const [k,n] of Object.entries(a.rewards))rewards[k]=(rewards[k]??0)+n;
 await c.query('UPDATE campaign_idle SET settled_at=$2,points=$3,rewards=$4 WHERE account_id=$1',[id,new Date(from+minutes*60000),JSON.stringify(a.points),JSON.stringify(rewards)]);
 return {minutes,rewards,receivedAt:+row.received_at,settledAt:from+minutes*60000,limitMinutes:cfg.limit};
}
/** Claim hang-up chest: settle, grant, clear rewards, reset receive/settlement clocks (keep fractional points). */
export async function claimIdle(c:PoolClient,id:string,stage:number){
 const settled=await settleIdle(c,id,stage);
 const pending=orderedIdleRewards(stage,settled.rewards as Counts);
 const grant=async(item:number,amount:number)=>{
  await c.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=
     CASE WHEN EXCLUDED.item_id=7 THEN LEAST(30000,player_items.amount+EXCLUDED.amount)
     ELSE player_items.amount+EXCLUDED.amount END`,
   [id,item,amount],
  );
 };
 for(const [item,amount] of pending)await grant(item,amount);
 const now=new Date();
 await c.query(
  'UPDATE campaign_idle SET rewards=$2::jsonb,received_at=$3,settled_at=$3 WHERE account_id=$1',
  [id,JSON.stringify({}),now],
 );
 return {rewards:pending,minutes:settled.minutes,limitMinutes:cfg.limit,receivedAt:+now,settledAt:+now};
}

function utcDay(d=new Date()){return d.toISOString().slice(0,10)}

async function ensureIdleRow(c:PoolClient,id:string){
 await c.query(
  'INSERT INTO campaign_idle(account_id,received_at,settled_at) SELECT id,created_at,created_at FROM accounts WHERE id=$1 ON CONFLICT DO NOTHING',
  [id],
 );
}

/** Reset daily quick-battle counters when UTC day rolls. */
export async function refreshQuickDaily(c:PoolClient,id:string){
 await ensureIdleRow(c,id);
 const row=(await c.query(
  'SELECT daily_count,daily_quick_count,daily_day,quick_points FROM campaign_idle WHERE account_id=$1 FOR UPDATE',[id],
 )).rows[0];
 const today=utcDay();
 const day=row.daily_day instanceof Date?row.daily_day.toISOString().slice(0,10):String(row.daily_day).slice(0,10);
 if(day!==today){
  await c.query(
   'UPDATE campaign_idle SET daily_count=0,daily_quick_count=0,daily_day=$2 WHERE account_id=$1',
   [id,today],
  );
  return {dailyCount:0,dailyQuickCount:0,quickPoints:(row.quick_points??{}) as Counts};
 }
 return {
  dailyCount:Number(row.daily_count??0),
  dailyQuickCount:Number(row.daily_quick_count??0),
  quickPoints:(row.quick_points??{}) as Counts,
 };
}

export function quickBattleCost(dailyQuickCount:number){
 return QUICK_DIAMOND_COSTS[Math.min(dailyQuickCount,QUICK_DIAMOND_COSTS.length-1)]!;
}

export type QuickBattlePreview={
 freeLeft:number;
 paidLeft:number;
 nextCost:number|null;
 durationMinutes:number;
 dailyCount:number;
 dailyQuickCount:number;
};

export async function previewQuickBattle(c:PoolClient,id:string):Promise<QuickBattlePreview>{
 const d=await refreshQuickDaily(c,id);
 const freeLeft=Math.max(0,QUICK_FREE_DAILY-d.dailyCount);
 const paidLeft=Math.max(0,QUICK_PAID_DAILY-d.dailyQuickCount);
 return {
  freeLeft,paidLeft,
  nextCost:freeLeft>0?0:paidLeft>0?quickBattleCost(d.dailyQuickCount):null,
  durationMinutes:QUICK_BATTLE_MINUTES,
  dailyCount:d.dailyCount,
  dailyQuickCount:d.dailyQuickCount,
 };
}

/**
 * Instant 120-minute accrual (separate QuickPoints). Free once/day, then diamond costs.
 * Grants immediately — does not fill hang-up chest.
 */
export async function runQuickBattle(c:PoolClient,id:string,stage:number){
 const d=await refreshQuickDaily(c,id);
 let paid=0;
 let dailyCount=d.dailyCount;
 let dailyQuickCount=d.dailyQuickCount;
 if(dailyCount<QUICK_FREE_DAILY){
  dailyCount+=1;
 }else if(dailyQuickCount<QUICK_PAID_DAILY){
  paid=quickBattleCost(dailyQuickCount);
  const pay=await c.query(
   'UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3 RETURNING amount',
   [id,DIAMOND_ITEM,paid],
  );
  if(!pay.rowCount)return {error:'insufficient_diamond' as const};
  dailyQuickCount+=1;
 }else{
  return {error:'quick_limit' as const};
 }
 const a=accrueIdle(stage,QUICK_BATTLE_MINUTES,d.quickPoints);
 const rewards=orderedIdleRewards(stage,a.rewards);
 const grant=async(item:number,amount:number)=>{
  await c.query(
   `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=
     CASE WHEN EXCLUDED.item_id=7 THEN LEAST(30000,player_items.amount+EXCLUDED.amount)
     ELSE player_items.amount+EXCLUDED.amount END`,
   [id,item,amount],
  );
 };
 for(const [item,amount] of rewards)await grant(item,amount);
 await c.query(
  `UPDATE campaign_idle SET quick_points=$2::jsonb,daily_count=$3,daily_quick_count=$4,daily_day=$5
   WHERE account_id=$1`,
  [id,JSON.stringify(a.points),dailyCount,dailyQuickCount,utcDay()],
 );
 return {
  rewards,
  paid,
  durationMinutes:QUICK_BATTLE_MINUTES,
  dailyCount,
  dailyQuickCount,
  freeLeft:Math.max(0,QUICK_FREE_DAILY-dailyCount),
  paidLeft:Math.max(0,QUICK_PAID_DAILY-dailyQuickCount),
  nextCost:dailyCount<QUICK_FREE_DAILY?0:dailyQuickCount<QUICK_PAID_DAILY?quickBattleCost(dailyQuickCount):null,
 };
}
export function eligibleModules(p:{level:number;stage:number;days:number;vip:number;power:number;towers?:Counts}){
 const met=(r:number[][])=>r.length>0&&r.every(([k,v,w])=>k===1?p.level>=v:k===2?p.days>=v:k===3?p.stage>v:k===4?p.vip>=v:k===5?p.power>=v:k===101?(p.towers?.[99]??0)>=v:k===102?(p.towers?.[v]??0)>=w:false);
 return cfg.modules.filter(m=>met(m.r1)||met(m.r2)).map(m=>m.id);
}
export async function refreshModules(c:PoolClient,id:string,level:number,stage:number){
 const p=(await c.query('SELECT power,created_at FROM player_profiles WHERE account_id=$1',[id])).rows[0];
 const ids=eligibleModules({level,stage,days:Math.max(1,Math.floor((Date.now()-+p.created_at)/86400000)+1),vip:0,power:p.power});
 const r=await c.query('INSERT INTO player_modules(account_id,module_id) SELECT $1,unnest($2::integer[]) ON CONFLICT DO NOTHING RETURNING module_id',[id,ids]);return r.rows.map(x=>x.module_id).sort((a,b)=>a-b);
}
