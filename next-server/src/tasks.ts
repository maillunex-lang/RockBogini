/** Daily/weekly TaskBase + TaskPointReward (Req_Task_DrawReward / DrawPointReward). */
import {readFileSync} from 'node:fs';
import type {PoolClient} from 'pg';
import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';

type TaskCfg={
 id:number;type:number;condition:number[];totalCount:number;point:number;
 startProgress:number;sortId:number;rewards:number[][];
};
type PointCfg={id:number;point:number;rewards:number[][]};
type PointType={id:number;nodes:number[];cycle:number};
type TaskRow={task_id:number;progress:number;completed:boolean};

const cfg=JSON.parse(readFileSync(new URL('../../data/tasks.json',import.meta.url),'utf8')) as {
 tasks:Record<string,TaskCfg>;pointRewards:Record<string,PointCfg>;pointTypes:Record<string,PointType>;
};
type MainTaskCfg=TaskCfg&{newbieSortId:number;newbieId:number};
const MAIN=JSON.parse(readFileSync(new URL('../../data/newbie-main-task-conditions.json',import.meta.url),'utf8')) as Record<string,MainTaskCfg>;
const TASKS=[...Object.values(cfg.tasks),...Object.values(MAIN)]
 .sort((a,b)=>a.type-b.type||a.sortId-b.sortId||a.id-b.id);
const BY_ID:Record<string,TaskCfg>={...cfg.tasks,...MAIN};
const MAIN_SORTED=Object.values(MAIN).sort((a,b)=>a.newbieSortId-b.newbieSortId||a.id-b.id);
type PioneerCfg={id:number;params:number[];uniqueReward:number[][];rewardsForAll:number[][];sortId:number};
const PIONEERS=Object.values(JSON.parse(readFileSync(new URL('../../data/pioneering-achievements.json',import.meta.url),'utf8')) as Record<string,PioneerCfg>)
 .sort((a,b)=>a.sortId-b.sortId||a.id-b.id);
const PIONEERS_BY_ID=new Map(PIONEERS.map(x=>[x.id,x]));
function pioneerProgress(cfg:PioneerCfg,power:number){return cfg.params[0]===2?power:0;}

const mapData=JSON.parse(readFileSync(new URL('../../data/campaign-map-meta.json',import.meta.url),'utf8')) as {
 maps:Record<string,{type:number}>;
};
const MAIN_MAP_IDS=Object.entries(mapData.maps)
 .filter(([,r])=>r.type===1).map(([id])=>Number(id)).sort((a,b)=>a-b);
const BY_COND=new Map<number,TaskCfg[]>();
for(const t of TASKS){
 const c=t.condition[0]??0;
 const list=BY_COND.get(c)??[];
 list.push(t);BY_COND.set(c,list);
}
const POINTS=cfg.pointRewards;
const POINT_TYPES=cfg.pointTypes;

export const TASK_LOGIN=1062;
export const TASK_HANG_UP=1002;
export const TASK_QUICK_BATTLE=1010;
export const TASK_SHOP_BUY=1046;
export const TASK_SUMMON=1005;

async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

function localDay(d=new Date()){
 const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
 return `${y}-${m}-${day}`;
}
function localWeek(d=new Date()){
 const t=new Date(d.getFullYear(),d.getMonth(),d.getDate());
 const day=(t.getDay()+6)%7; // Mon=0
 t.setDate(t.getDate()-day);
 return localDay(t);
}
/** DATE from node-pg is local midnight — use local Y-M-D, not toISOString. */
function sqlDate(v:unknown){
 if(v instanceof Date)return localDay(v);
 return String(v).slice(0,10);
}

function paramsMatch(want:number[],params:number[]){
 return want.every((w,i)=>!w||params[i]===w);
}

async function grant(c:PoolClient,id:string,itemId:number,n:number){
 if(n<=0)return;
 await c.query(
  `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=
    CASE WHEN EXCLUDED.item_id=7 THEN LEAST(30000,player_items.amount+EXCLUDED.amount)
    ELSE player_items.amount+EXCLUDED.amount END`,
  [id,itemId,n],
 );
}

 async function ensureMeta(c:PoolClient,id:string){
 const today=localDay();
 const week=localWeek();
 await c.query(
  `INSERT INTO player_task_meta(account_id,daily_day,weekly_day,points)
   VALUES($1,$2::date,$3::date,'{}'::jsonb) ON CONFLICT DO NOTHING`,
  [id,today,week],
 );
 const row=(await c.query(
  'SELECT daily_day,weekly_day,points FROM player_task_meta WHERE account_id=$1 FOR UPDATE',[id],
 )).rows[0];
 let daily=sqlDate(row.daily_day);
 let weekly=sqlDate(row.weekly_day);
 let points=(row.points??{}) as Record<string,{point:number;drawn:number[]}>;
 if(daily!==today){
  await resetType(c,id,2);
  points['2']={point:0,drawn:[]};
  daily=today;
 }
 if(weekly!==week){
  await resetType(c,id,3);
  points['3']={point:0,drawn:[]};
  weekly=week;
 }
 await c.query(
  'UPDATE player_task_meta SET daily_day=$2,weekly_day=$3,points=$4::jsonb WHERE account_id=$1',
  [id,daily,weekly,JSON.stringify(points)],
 );
 // ensure task rows
 for(const t of TASKS){
  await c.query(
   `INSERT INTO player_tasks(account_id,task_id,progress,completed)
    VALUES($1,$2,$3,false) ON CONFLICT DO NOTHING`,
   [id,t.id,t.startProgress],
  );
 }
 return {daily,weekly,points};
}

async function resetType(c:PoolClient,id:string,type:number){
 for(const t of TASKS.filter(x=>x.type===type)){
  await c.query(
   `INSERT INTO player_tasks(account_id,task_id,progress,completed) VALUES($1,$2,$3,false)
    ON CONFLICT(account_id,task_id) DO UPDATE SET progress=$3,completed=false`,
   [id,t.id,t.startProgress],
  );
 }
}

/** Original Racon.Game.Tasks.sync_core_state: authoritative progression, no guessed events.
 * Conditions: 2001 stages cleared, 2003 profile level, 2004 power,
 * 2007 number of heroes at least requested level.
 */
export async function syncMainTaskState(c:PoolClient,id:string){
 const profile=(await c.query('SELECT level,power,stage FROM player_profiles WHERE account_id=$1',[id])).rows[0] as
  {level:number;power:number;stage:number}|undefined;
 if(!profile)return;
 const heroes=(await c.query('SELECT level FROM player_heroes WHERE account_id=$1',[id])).rows as {level:number}[];
 const cleared=MAIN_MAP_IDS.filter(mapId=>mapId<profile.stage).length;
 const towerRows=(await c.query('SELECT tower_type,map_index FROM tower_progress WHERE account_id=$1',[id])).rows as
  {tower_type:number;map_index:number}[];
 const towers=new Map(towerRows.map(r=>[r.tower_type,r.map_index]));
 for(const t of MAIN_SORTED){
  const type=t.condition[0]??0;
  let progress:number|undefined;
  if(type===2001)progress=cleared;
  if(type===2003)progress=profile.level;
  if(type===2004)progress=profile.power;
  if(type===2007)progress=heroes.filter(x=>x.level>=(t.condition[1]??0)).length;
  if(type===2006)progress=towers.get((t.condition[1]??0)>0?t.condition[1]:99)??0;
  if(progress===undefined)continue;
  // completed means claimed; keep old progress and never overwrite an already claimed task.
  await c.query(
   'UPDATE player_tasks SET progress=GREATEST(progress,$3) WHERE account_id=$1 AND task_id=$2 AND completed=false',
   [id,t.id,progress],
  );
 }
}

/** Bump matching incomplete tasks. Call inside a transaction with profile locked. */
export async function taskEvent(c:PoolClient,id:string,cond:number,params:number[]=[],n=1){
 await ensureMeta(c,id);
 const defs=BY_COND.get(cond)??[];
 for(const t of defs){
  if(!paramsMatch(t.condition.slice(1),params))continue;
  await c.query(
   `UPDATE player_tasks SET progress=progress+$3
    WHERE account_id=$1 AND task_id=$2 AND completed=false`,
   [id,t.id,n],
  );
 }
}

export async function taskRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/tasks',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const meta=await ensureMeta(c,id);
   await taskEvent(c,id,TASK_LOGIN,[],1);
   await syncMainTaskState(c,id);
   const rows=(await c.query(
    'SELECT task_id,progress,completed FROM player_tasks WHERE account_id=$1',[id],
   )).rows as TaskRow[];
   await c.query('COMMIT');
   const byId=new Map(rows.map(r=>[r.task_id,r]));
   const list=TASKS.map(t=>{
    const r=byId.get(t.id);
    const progress=Number(r?.progress??t.startProgress);
    const completed=!!r?.completed;
    const ready=!completed&&progress>=t.totalCount;
    return {
     id:t.id,type:t.type,condition:t.condition,totalCount:t.totalCount,point:t.point,
     sortId:t.sortId,rewards:t.rewards,progress,completed,ready,
    };
   });
   const main=MAIN_SORTED.map(t=>{
    const r=byId.get(t.id);
    const progress=Number(r?.progress??t.startProgress);
    const completed=!!r?.completed;
    return {
     id:t.id,type:t.type,condition:t.condition,totalCount:t.totalCount,
     sortId:t.newbieSortId,rewards:t.rewards,
     progress,completed,ready:!completed&&progress>=t.totalCount,
    };
   });
   const chests=[2,3].map(type=>{
    const pt=POINT_TYPES[String(type)];
    const st=meta.points[String(type)]??{point:0,drawn:[]};
    const nodes=(pt?.nodes??[]).map((nodeId,index)=>{
     const box=POINTS[String(nodeId)];
     return {
      index,nodeId,need:box?.point??0,rewards:box?.rewards??[],
      claimed:st.drawn.includes(index),
      claimable:!!box&&st.point>=box.point&&!st.drawn.includes(index),
     };
    });
    return {type,point:st.point,nodes};
   });
   return {
    main,
    daily:list.filter(t=>t.type===2),
    weekly:list.filter(t=>t.type===3),
    points:chests,
    dailyDay:meta.daily,
    weeklyDay:meta.weekly,
   };
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });

 app.get('/v1/tasks/pioneering',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const p=(await c.query('SELECT power FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   for(const cfg of PIONEERS){
    if(cfg.params[0]!==2||pioneerProgress(cfg,Number(p.power))<cfg.params[1])continue;
    await c.query('INSERT INTO pioneering_winners(achievement_id,account_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[cfg.id,id]);
   }
   const won=(await c.query(`SELECT w.achievement_id,w.account_id,w.won_at,
    p.nickname FROM pioneering_winners w JOIN player_profiles p ON p.account_id=w.account_id
    WHERE w.achievement_id=ANY($1::integer[])`,[PIONEERS.map(x=>x.id)])).rows as
    {achievement_id:number;account_id:string;won_at:Date;nickname:string}[];
   const claims=(await c.query('SELECT achievement_id FROM pioneering_claims WHERE account_id=$1',[id])).rows as {achievement_id:number}[];
   await c.query('COMMIT');
   const winners=new Map(won.map(w=>[w.achievement_id,w]));
   const claimed=new Set(claims.map(x=>x.achievement_id));
   return {achievements:PIONEERS.map(cfg=>{
    const winner=winners.get(cfg.id);
    const enabled=cfg.params[0]===2;
    const myProgress=pioneerProgress(cfg,Number(p.power));
    return {id:cfg.id,type:cfg.params[0],target:cfg.params[1],sortId:cfg.sortId,
     myProgress,enabled,uniqueReward:cfg.uniqueReward,rewardsForAll:cfg.rewardsForAll,
     winner:winner?{nickname:winner.nickname,wonAt:winner.won_at}:null,
     isWinner:winner?.account_id===id,claimed:claimed.has(cfg.id),
     ready:enabled&&winner?.account_id===id&&!claimed.has(cfg.id)};
   })};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });

 app.post<{Body:{achievementIds:number[]}}>('/v1/tasks/pioneering/claim',{
  schema:{body:{type:'object',required:['achievementIds'],additionalProperties:false,properties:{
   achievementIds:{type:'array',minItems:1,maxItems:4,uniqueItems:true,items:{type:'integer'}},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const p=(await c.query('SELECT power FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   const rewards:number[][]=[];
   for(const achId of req.body.achievementIds){
    const cfg=PIONEERS_BY_ID.get(achId);
    if(!cfg){await c.query('ROLLBACK');return reply.code(404).send({error:'achievement_not_found'})}
    if(cfg.params[0]!==2||pioneerProgress(cfg,Number(p.power))<cfg.params[1]){
     await c.query('ROLLBACK');return reply.code(409).send({error:'achievement_unavailable'});
    }
    await c.query('INSERT INTO pioneering_winners(achievement_id,account_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[achId,id]);
    const winner=(await c.query('SELECT account_id FROM pioneering_winners WHERE achievement_id=$1',[achId])).rows[0];
    if(winner?.account_id!==id){
     await c.query('ROLLBACK');return reply.code(409).send({error:'another_player_won'});
    }
    const inserted=await c.query('INSERT INTO pioneering_claims(achievement_id,account_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING achievement_id',[achId,id]);
    if(!inserted.rowCount){await c.query('ROLLBACK');return reply.code(409).send({error:'already_claimed'})}
    for(const [itemId,n] of [...cfg.rewardsForAll,...cfg.uniqueReward]){
     if(itemId&&n){await grant(c,id,itemId,n);rewards.push([itemId,n])}
    }
   }
   await c.query('COMMIT');
   return {claimed:req.body.achievementIds,rewards};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });

 app.post<{Body:{taskIds:number[]}}>('/v1/tasks/claim',{
  schema:{body:{type:'object',required:['taskIds'],additionalProperties:false,properties:{
   taskIds:{type:'array',minItems:1,maxItems:50,items:{type:'integer',minimum:1}},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const meta=await ensureMeta(c,id);
   await syncMainTaskState(c,id);
   const rewards:number[][]=[];
   const claimed:number[]=[];
   for(const taskId of req.body.taskIds){
    const t=BY_ID[String(taskId)];
    if(!t){await c.query('ROLLBACK');return reply.code(404).send({error:'task_not_found'})}
    const row=(await c.query(
     'SELECT progress,completed FROM player_tasks WHERE account_id=$1 AND task_id=$2 FOR UPDATE',[id,taskId],
    )).rows[0];
    if(!row||row.completed||Number(row.progress)<t.totalCount){
     await c.query('ROLLBACK');return reply.code(409).send({error:'not_ready'});
    }
    await c.query('UPDATE player_tasks SET completed=true WHERE account_id=$1 AND task_id=$2',[id,taskId]);
    for(const [itemId,n] of t.rewards){
     if(itemId&&n){await grant(c,id,itemId,n);rewards.push([itemId,n])}
    }
    if((t.type===2||t.type===3)&&t.point>0){
     const key=String(t.type);
     const st=meta.points[key]??{point:0,drawn:[]};
     st.point+=t.point;
     meta.points[key]=st;
    }
    claimed.push(taskId);
   }
   await c.query('UPDATE player_task_meta SET points=$2::jsonb WHERE account_id=$1',[id,JSON.stringify(meta.points)]);
   await c.query('COMMIT');
   return {claimed,rewards,points:meta.points};
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });

 app.post<{Body:{type:number;index:number}}>('/v1/tasks/points',{
  schema:{body:{type:'object',required:['type','index'],additionalProperties:false,properties:{
   type:{type:'integer',enum:[2,3]},index:{type:'integer',minimum:0,maximum:20},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const {type,index}=req.body;
  const pt=POINT_TYPES[String(type)];
  const nodeId=pt?.nodes[index];
  const box=nodeId?POINTS[String(nodeId)]:undefined;
  if(!box)return reply.code(404).send({error:'chest_not_found'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const meta=await ensureMeta(c,id);
   const st=meta.points[String(type)]??{point:0,drawn:[]};
   if(st.point<box.point){await c.query('ROLLBACK');return reply.code(409).send({error:'not_enough_points'})}
   if(st.drawn.includes(index)){await c.query('ROLLBACK');return reply.code(409).send({error:'already_claimed'})}
   const rewards:number[][]=[];
   for(const [itemId,n] of box.rewards){
    if(itemId&&n){await grant(c,id,itemId,n);rewards.push([itemId,n])}
   }
   st.drawn=[...st.drawn,index];
   meta.points[String(type)]=st;
   await c.query('UPDATE player_task_meta SET points=$2::jsonb WHERE account_id=$1',[id,JSON.stringify(meta.points)]);
   await c.query('COMMIT');
   return {type,index,rewards,point:st.point};
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
 });
}
