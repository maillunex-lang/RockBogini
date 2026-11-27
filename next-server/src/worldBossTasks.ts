/** Source ActivityConfig_WorldBoss._Tasks: 1060 count, 1061 sum, 2021 best single damage. */
import type {PoolClient} from 'pg';
import {worldBossEvent,type BossEvent} from './worldBossConfig.js';
export type BossTask={id:number;condition:number[];totalCount:number;rewards:number[][];isDaily:number};
export function worldBossTaskDefs(event:BossEvent):BossTask[]{
 return event.tasks.filter(t=>[1060,1061,2021].includes(t.condition[0])).sort((a,b)=>a.id-b.id);
}
export function eventTaskProgress(task:BossTask,attempts:number,best:number,total:number){
 const kind=task.condition[0];
 return kind===1060?attempts:kind===1061?total:kind===2021?best:0;
}
async function ensureBossTasks(c:PoolClient,id:string,event:BossEvent,day:string){
 const defs=worldBossTaskDefs(event);
 for(const task of defs){
  await c.query(`INSERT INTO world_boss_tasks(account_id,event_id,task_id,day)
    VALUES($1,$2,$3,$4) ON CONFLICT(account_id,event_id,task_id) DO NOTHING`,
   [id,event.id,task.id,day]);
  if(task.isDaily){
   await c.query(`UPDATE world_boss_tasks SET progress=0,claimed=false,day=$4
    WHERE account_id=$1 AND event_id=$2 AND task_id=$3 AND day<>$4`,
    [id,event.id,task.id,day]);
  }
 }
}
export async function bossTaskState(c:PoolClient,id:string,event:BossEvent,day:string){
 await ensureBossTasks(c,id,event,day);
 const rs=(await c.query('SELECT task_id,progress::text,claimed FROM world_boss_tasks WHERE account_id=$1 AND event_id=$2 FOR UPDATE',[id,event.id])).rows;
 const rows=new Map(rs.map(r=>[r.task_id,r]));
 return worldBossTaskDefs(event).map(task=>{
  const r=rows.get(task.id);
  const progress=String(r?.progress??'0');
  return {id:task.id,condition:task.condition,totalCount:task.totalCount,
   rewards:task.rewards,isDaily:task.isDaily,progress,claimed:!!r?.claimed,
   ready:!r?.claimed&&BigInt(progress)>=BigInt(task.totalCount)};
 });
}
export async function bossTaskSettlement(c:PoolClient,id:string,event:BossEvent,day:string,damage:number){
 await ensureBossTasks(c,id,event,day);
 for(const t of worldBossTaskDefs(event)){
  if(t.condition[0]===1060)
   await c.query('UPDATE world_boss_tasks SET progress=progress+1 WHERE account_id=$1 AND event_id=$2 AND task_id=$3 AND claimed=false',[id,event.id,t.id]);
  if(t.condition[0]===1061)
   await c.query('UPDATE world_boss_tasks SET progress=progress+$4::bigint WHERE account_id=$1 AND event_id=$2 AND task_id=$3 AND claimed=false',[id,event.id,t.id,damage]);
  if(t.condition[0]===2021)
   await c.query('UPDATE world_boss_tasks SET progress=GREATEST(progress,$4::bigint) WHERE account_id=$1 AND event_id=$2 AND task_id=$3 AND claimed=false',[id,event.id,t.id,damage]);
 }
}
export async function bossTaskClaim(c:PoolClient,id:string,event:BossEvent,taskId:number,day:string){
 const def=worldBossTaskDefs(event).find(t=>t.id===taskId);
 if(!def)return {error:'boss_task_not_found'} as const;
 await ensureBossTasks(c,id,event,day);
 const row=(await c.query('SELECT progress::text,claimed FROM world_boss_tasks WHERE account_id=$1 AND event_id=$2 AND task_id=$3 FOR UPDATE',[id,event.id,taskId])).rows[0];
 if(row.claimed)return {error:'boss_task_already_claimed'} as const;
 if(BigInt(row.progress)<BigInt(def.totalCount))return {error:'boss_task_not_ready'} as const;
 const rewards=new Map<number,number>();
 for(const [item,count] of def.rewards){
  if(!Number.isSafeInteger(item)||!Number.isSafeInteger(count)||item<=0||count<=0)throw Error('invalid_original_boss_task_reward');
  rewards.set(item,(rewards.get(item)??0)+count);
 }
 for(const [item,count] of rewards){
  await c.query(`INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
    ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,[id,item,count]);
 }
 await c.query('UPDATE world_boss_tasks SET claimed=true WHERE account_id=$1 AND event_id=$2 AND task_id=$3',[id,event.id,taskId]);
 return {id:taskId,eventId:event.id,rewards:Array.from(rewards),claimed:true} as const;
}
