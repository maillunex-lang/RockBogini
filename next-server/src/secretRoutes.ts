/** NEXT-021.3B: persistent Secret Area fog, loot, guardians and transactional battles. */
import type {FastifyInstance} from 'fastify';
import type {PoolClient} from 'pg';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {prepareSquad} from './battleUnits.js';
import {reportHeroes} from './battle/reportHeroes.js';
import {simulate,type Fighter} from './battle/simulation.js';
import {battleRandom} from './battle/random.js';
import {randomUUID,randomInt} from 'node:crypto';
import {secretFloor,secretMonster,secretMap,secretProp,selectPower,makeFloor,monsterCell,monsterRewards,secretDefenders,neighbours,weighted,GRASS_OUTCOMES,RESURRECTION_PRICES,SECRET_PERIOD_MS,startOfSecretPeriod,defeatSecretCell,survivingMonsterHp,type SecretCell} from './secretConfig.js';
import {taskEvent} from './tasks.js';
import {towerRewards} from './towerConfig.js';
const uuidPattern='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
type State={floor:number;view_index:number;power_level_id:number;reset_at:Date|string;cells:SecretCell[];props:number[][];hp:Record<string,number>;reward_state:number[];resurrection_count:number};
async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}
async function state(c:PoolClient,id:string,power:number):Promise<State>{
 // Profile row must be locked by caller to prevent period races and prize double-claims.
 await c.query('INSERT INTO secret_exploration(account_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
 let row=(await c.query('SELECT * FROM secret_exploration WHERE account_id=$1 FOR UPDATE',[id])).rows[0] as State;
 const started=Date.parse(row.reset_at instanceof Date?row.reset_at.toISOString():String(row.reset_at));
 const expired=Date.now()-started>=SECRET_PERIOD_MS;
 if(expired||(!row.cells.length&&secretFloor(row.floor)?.type===1)){
  const level=selectPower(power);
  const generate=makeFloor(1,level.id);
  const resetAt=new Date(startOfSecretPeriod()).toISOString();
  row=(await c.query(`UPDATE secret_exploration
   SET floor=1,view_index=$2,power_level_id=$3,reset_at=$4,cells=$5,
    props=$6,hp='{}',reward_state=$7,resurrection_count=0 WHERE account_id=$1 RETURNING *`,
   [id,generate.view,level.id,resetAt,JSON.stringify(generate.cells),JSON.stringify([[0,0],[0,0],[0,0]]),JSON.stringify([0,0,0,0])])).rows[0] as State;
  await c.query('DELETE FROM secret_pending WHERE account_id=$1',[id]);
 }
 return {...row,hp:row.hp??{},props:row.props??[[0,0],[0,0],[0,0]],cells:row.cells??[],reward_state:row.reward_state??[0,0,0,0]};
}
async function save(c:PoolClient,id:string,row:State){
 await c.query(`UPDATE secret_exploration SET floor=$2,view_index=$3,power_level_id=$4,
  reset_at=$5,cells=$6,props=$7,hp=$8,reward_state=$9,resurrection_count=$10 WHERE account_id=$1`,
 [id,row.floor,row.view_index,row.power_level_id,row.reset_at,JSON.stringify(row.cells),
  JSON.stringify(row.props),JSON.stringify(row.hp),JSON.stringify(row.reward_state),row.resurrection_count]);
}
async function grant(c:PoolClient,id:string,rewards:number[][]){
 for(const [item,n] of towerRewards(rewards)){
  await c.query(`INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount`,[id,item,n]);
 }
}
function view(row:State){
 return {floor:row.floor,viewIndex:row.view_index,powerLevelId:row.power_level_id,
  resetAt:row.reset_at,expiresAt:new Date(Date.parse(row.reset_at instanceof Date?row.reset_at.toISOString():String(row.reset_at))+SECRET_PERIOD_MS).toISOString(),
  cells:row.floor===4?[]:row.cells,props:row.props,hp:row.hp,
  rewards:row.reward_state,finished:row.floor===5,treasureFloor:row.floor===4};
}
function propAdd(row:State,type:number,count:number){
 const result=row.props.map(x=>[...x]);
 let idx=result.findIndex(x=>x[0]===type&&x[1]>0);
 if(idx<0)idx=result.findIndex(x=>x[0]===0||x[1]===0);
 if(idx<0)return null;
 result[idx]=[type,(result[idx][0]===type?result[idx][1]:0)+count];
 return result;
}
function emptyCell(cell:SecretCell):SecretCell{
 return [...cell.slice(0,3),1,1];
}
function reveal(row:State,index:number){row.cells=neighbours(row.cells,index);}
function defeat(row:State,index:number){
 const cell=row.cells[index];
 row.cells[index]=defeatSecretCell(cell);
 reveal(row,index);
 return monsterRewards(cell[6]);
}
function freshFloor(row:State){
 const generate=makeFloor(row.floor,row.power_level_id);
 row.cells=generate.cells;row.view_index=generate.view;
}
export async function secretRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/secret',async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const profile=await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await state(c,id,Number(profile.power));
   await c.query('COMMIT');return view(row);
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{index:number}}>('/v1/secret/click',{schema:{body:{type:'object',required:['index'],additionalProperties:false,properties:{index:{type:'integer',minimum:0,maximum:150}}}}},async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const profile=await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await state(c,id,Number(profile.power));
   const pending=(await c.query('SELECT battle_id FROM secret_pending WHERE account_id=$1',[id])).rows[0];
   if(pending){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_battle_pending'})}
   if(row.floor>3){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_floor_not_explorable'})}
   const cell=row.cells[req.body.index];
   if(!cell){await c.query('ROLLBACK');return reply.code(404).send({error:'secret_cell_missing'})}
   const index=req.body.index,st=cell[3],type=cell[4];
   let rewards:number[][]=[];
   if(st===2){
    row.cells[index]=[...cell.slice(0,3),1,...cell.slice(4)];
    if(type!==2&&type!==3)reveal(row,index);
   }else if(st===1&&type===4){
    const prop=secretProp(cell[5]);if(!prop){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_prop_missing'})}
    const props=propAdd(row,cell[5],Math.max(prop.count,1));
    if(!props){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_props_full'})}
    row.props=props;row.cells[index]=emptyCell(cell);
   }else if(st===1&&type===5){
    // Original LevelParam[113] weighted outcomes imported from the source.
    const selected=weighted(GRASS_OUTCOMES,x=>x[2]);
    row.cells[index]=selected[0]===4?[...cell.slice(0,3),1,4,selected[1]]:
     selected[0]===2?monsterCell(cell.slice(0,3),1,selected[1]):emptyCell(cell);
   }else if(st===1&&type===6){
    row.floor+=1;row.cells=[];row.view_index=0;
    await taskEvent(c,id,1023,[],1);
    if(row.floor<=3)freshFloor(row);
   }else{
    await c.query('ROLLBACK');return reply.code(409).send({error:'secret_cell_not_clickable'});
   }
   if(row.floor<=3)row.view_index=index;
   await save(c,id,row);await c.query('COMMIT');return {...view(row),rewards};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{index:number}}>('/v1/secret/challenge',{schema:{body:{type:'object',required:['index'],additionalProperties:false,properties:{index:{type:'integer',minimum:0,maximum:150}}}}},async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const profile=await getProfile(s,id);
  let attackers:Awaited<ReturnType<typeof prepareSquad>>;
  try{attackers=await prepareSquad(s,id)}catch(e){
   if(e instanceof Error&&['empty_formation','invalid_formation','hero_attributes_pending','hero_not_owned'].includes(e.message))
    return reply.code(409).send({error:e.message});
   throw e;
  }
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await state(c,id,Number(profile.power)),cell=row.cells[req.body.index],index=req.body.index;
   if(row.floor>3||!cell){await c.query('ROLLBACK');return reply.code(404).send({error:'secret_cell_missing'})}
   if(cell[3]!==1||![2,3].includes(cell[4])){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_monster_not_open'})}
   const pending=(await c.query('SELECT battle_id FROM secret_pending WHERE account_id=$1',[id])).rows[0];
   if(pending){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_battle_pending'})}
   const living:Fighter[]=attackers.map((u:Fighter)=>{
    const sid=String((u as Fighter&{sid?:number}).sid??0);
    const per=row.hp[sid]??1000;
    return {...u,hp:Math.max(0,Math.floor(u.hp_max*per/1000))};
   }).filter((u:Fighter)=>u.hp>0);
   if(!living.length){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_no_living_heroes'})}
   const defenders=secretDefenders(cell[5],cell[6],row.power_level_id,cell.slice(8,13),cell[7]===1);
   if(!defenders?.length){await c.query('ROLLBACK');return reply.code(503).send({error:'secret_defenders_missing'})}
   const units:Fighter[]=[...living.map(u=>({...u,camp:1 as const,is_boss:0,buffs:[],hurt:0,damage:0,cure:0} as Fighter)),...defenders];
   const seed=randomInt(1,2147483647),battle=simulate(units,battleRandom(seed),15);
   const report={version:1,mode:'secret',cellIndex:index,floor:row.floor,mapId:cell[5],
    battleId:randomUUID(),seed,maxRounds:15,preview:false,progressionApplied:false,
    heroes:reportHeroes(units,battle.units),initialUnits:units,summary:battle.summary,pages:battle.pages,
    finalPage:{dataType:99,round:battle.rounds,battleResult:battle.summary.resultCode,heroStatus:battle.summary.heroes},
    issues:battle.issues,parityReady:battle.parityReady};
   await c.query('INSERT INTO secret_battles(id,account_id,cell_index,map_id,monster_type,report) VALUES($1,$2,$3,$4,$5,$6)',
    [report.battleId,id,index,cell[5],cell[6],JSON.stringify(report)]);
   await c.query('INSERT INTO secret_pending(account_id,battle_id) VALUES($1,$2)',[id,report.battleId]);
   await c.query('COMMIT');return report;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.get('/v1/secret/pending',async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const r=(await s.pg.query(`SELECT b.report FROM secret_pending p JOIN secret_battles b ON b.id=p.battle_id
   WHERE p.account_id=$1 AND b.account_id=$1`,[id])).rows[0];
  return {report:r?.report??null};
 });
 app.post<{Body:{battleId:string}}>('/v1/secret/settle',{schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}}},async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const p=(await c.query('SELECT power FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   if(!p){await c.query('ROLLBACK');return reply.code(404).send({error:'profile_missing'})}
   const b=(await c.query('SELECT * FROM secret_battles WHERE id=$1 AND account_id=$2 FOR UPDATE',[req.body.battleId,id])).rows[0];
   if(!b){await c.query('ROLLBACK');return reply.code(404).send({error:'battle_not_found'})}
   if(b.settlement){await c.query('COMMIT');return b.settlement}
   const pending=(await c.query('SELECT battle_id FROM secret_pending WHERE account_id=$1',[id])).rows[0];
   if(pending?.battle_id!==b.id){await c.query('ROLLBACK');return reply.code(409).send({error:'battle_expired'})}
   const row=await state(c,id,Number(p.power)),cell=row.cells[b.cell_index];
   if(!cell||cell[5]!==b.map_id||cell[6]!==b.monster_type||cell[3]!==1||![2,3].includes(cell[4])){
    await c.query('ROLLBACK');return reply.code(409).send({error:'secret_battle_expired'});
   }
   const won=b.report.summary.resultCode===2;
   let rewards:number[][]=[];
   const heroes=b.report.summary.heroes as {id:number;camp:number;hp:number;hpMax:number}[];
   const full=b.report.initialUnits as {id:number;sid:number}[];
   for(const hero of heroes.filter(x=>x.camp===1)){
    const sid=full.find(x=>x.id===hero.id)?.sid;
    if(sid)row.hp[String(sid)]=Math.max(0,Math.floor(hero.hp/Math.max(1,hero.hpMax)*1000));
   }
   if(won){rewards=defeat(row,b.cell_index);await grant(c,id,rewards)}
   else{
    // Keep remaining monster HP in original MapBase roster order.
    const defeated=heroes.filter(x=>x.camp===-1);
    const map=secretMap(b.map_id);
    if(!map){await c.query('ROLLBACK');return reply.code(503).send({error:'secret_map_missing'})}
    const initial=b.report.initialUnits as {id:number;station:number;camp:number}[];
    const final=defeated.flatMap(x=>{
     const unit=initial.find(y=>y.id===x.id&&y.camp===-1);
     return unit?[{station:unit.station,hp:x.hp,hpMax:x.hpMax}]:[];
    });
    const hps=survivingMonsterHp(cell.slice(8,13),final,map.heroes);
    cell.splice(8,5,...hps);
   }
   await save(c,id,row);
   const settlement={battleId:b.id,result:won?1:0,mapId:b.map_id,floor:row.floor,cellIndex:b.cell_index,rewards};
   await c.query('UPDATE secret_battles SET settlement=$2,report=$3 WHERE id=$1',
    [b.id,JSON.stringify(settlement),JSON.stringify({archived:true})]);
   await c.query('DELETE FROM secret_pending WHERE account_id=$1',[id]);
   await c.query('COMMIT');return settlement;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{battleId:string}}>('/v1/secret/cancel',{schema:{body:{type:'object',required:['battleId'],additionalProperties:false,properties:{battleId:{type:'string',pattern:uuidPattern}}}}},async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const res=await c.query('DELETE FROM secret_pending WHERE account_id=$1 AND battle_id=$2 RETURNING battle_id',[id,req.body.battleId]);
   if(res.rowCount)await c.query(`UPDATE secret_battles SET report=jsonb_build_object('archived',true)
    WHERE id=$1 AND account_id=$2 AND settlement IS NULL`,[req.body.battleId,id]);
   await c.query('COMMIT');return {cancelled:res.rowCount===1};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{slot:number;index?:number}}>('/v1/secret/use-prop',{
  schema:{body:{type:'object',required:['slot'],additionalProperties:false,properties:{slot:{type:'integer',minimum:0,maximum:2},index:{type:'integer',minimum:0,maximum:150}}}},
 },async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const p=await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await state(c,id,Number(p.power));
   const pending=(await c.query('SELECT battle_id FROM secret_pending WHERE account_id=$1',[id])).rows[0];
   if(pending){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_battle_pending'})}
   if(row.floor>3){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_no_exploration'})}
   const [type,count]=row.props[req.body.slot]??[];
   if(!type||!count){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_prop_empty'})}
   const index=req.body.index,cell=index===undefined?null:row.cells[index];
   const requiresTarget=[1,2,5].includes(type);
   if(requiresTarget&&!cell){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_prop_target_required'})}
   let rewards:number[][]=[];
   if(type===1){
    if(cell![3]!==1||![2,3].includes(cell![4])){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_not_open_monster'})}
    cell![7]=1;
   }else if(type===2){
    if(cell![3]!==1||cell![4]!==2){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_bomb_requires_monster'})}
    rewards=defeat(row,index!);
    await grant(c,id,rewards);
   }else if(type===3){
    row.hp={}; // Original Resurrection resets all hero HP, including defeated heroes.
   }else if(type===4){
    const heal=secretProp(4)?.param[0]??300;
    for(const [sid,value] of Object.entries(row.hp))if(value>0)row.hp[sid]=Math.min(1000,value+heal);
   }else if(type===5){
    const radius=secretProp(5)?.param[0]??2;
    const [x,y,z]=cell!;
    row.cells=row.cells.map(cel=>{
     const radiusInCube=Math.floor((Math.abs(cel[0]-x)+Math.abs(cel[1]-y)+Math.abs(cel[2]-z))/2);
     return cel[3]!==1&&radiusInCube<=radius?[...cel.slice(0,3),1,...cel.slice(4)]:cel;
    });
   }else{
    await c.query('ROLLBACK');return reply.code(409).send({error:'secret_unknown_prop'});
   }
   if(requiresTarget)row.view_index=index!;
   row.props[req.body.slot]=count>1?[type,count-1]:[0,0];
   await save(c,id,row);await c.query('COMMIT');return {...view(row),rewards:towerRewards(rewards)};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post('/v1/secret/resurrect',async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const p=await getProfile(s,id);
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT account_id FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id]);
   const row=await state(c,id,Number(p.power));
   const pending=(await c.query('SELECT battle_id FROM secret_pending WHERE account_id=$1',[id])).rows[0];
   if(pending){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_battle_pending'})}
   if(row.floor>3){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_no_exploration'})}
   const price=RESURRECTION_PRICES[Math.min(row.resurrection_count,RESURRECTION_PRICES.length-1)];
   if(!price||!Number.isSafeInteger(price)){await c.query('ROLLBACK');return reply.code(503).send({error:'secret_price_unavailable'})}
   const result=await c.query('UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3',[id,3,price]);
   if(!result.rowCount){await c.query('ROLLBACK');return reply.code(409).send({error:'insufficient_diamond',cost:price})}
   row.hp={};row.resurrection_count+=1;
   await save(c,id,row);await c.query('COMMIT');return {...view(row),diamonds:price};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
 app.post<{Body:{index:number}}>('/v1/secret/treasure',{schema:{body:{type:'object',required:['index'],additionalProperties:false,properties:{index:{type:'integer',minimum:0,maximum:3}}}}},async(req,reply)=>{
  const id=await account(req,s);if(!id)return reply.code(401).send({error:'invalid_session'});
  const c=await s.pg.connect();
  try{
   await c.query('BEGIN');
   const p=(await c.query('SELECT power FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0];
   if(!p){await c.query('ROLLBACK');return reply.code(404).send({error:'profile_missing'})}
   const row=await state(c,id,Number(p.power));
   if(row.floor!==4){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_not_treasure_floor'})}
   const index=req.body.index;
   if(row.reward_state[index]){await c.query('ROLLBACK');return reply.code(409).send({error:'secret_treasure_claimed'})}
   const treasure=secretFloor(4)?.rewards[index];
   if(!treasure){await c.query('ROLLBACK');return reply.code(503).send({error:'secret_treasure_unavailable'})}
   const rewards:number[][]=[];
   for(let i=0;i+1<treasure.length;i+=2)rewards.push([treasure[i],treasure[i+1]]);
   await grant(c,id,rewards);
   row.reward_state[index]=1;if(row.reward_state.every(x=>x===1))row.floor=5;
   await save(c,id,row);await c.query('COMMIT');
   return {index,rewards:towerRewards(rewards),finished:row.floor===5};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 });
}
