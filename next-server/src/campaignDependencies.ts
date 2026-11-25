import {readFileSync} from 'node:fs';
import {randomInt} from 'node:crypto';
import type {PoolClient} from 'pg';
const cfg=JSON.parse(readFileSync(new URL('../../data/campaign-dependencies.json',import.meta.url),'utf8')) as {idle:Record<number,{common:number[][];random:number[][]}>;libs:Record<number,number[][]>;modules:{id:number;r1:number[][];r2:number[][]}[];limit:number};
type Counts=Record<number,number>;
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
