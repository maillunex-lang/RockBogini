import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {consumeConfig,enrichItem,sellPrice,heroPieceRecipe,heroPieceRecipes} from './itemCatalog.js';

import {rollBox} from './boxRewards.js';

const CURRENCY_IDS={coin:1,vipPoint:2,diamond:3,colorDiamond:4,intelligence:7,xpWater:22} as const;
const COIN=1;

async function account(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

async function bag(s:Storage,id:string){
 const rows=(await s.pg.query(
  'SELECT item_id,amount::text FROM player_items WHERE account_id=$1 ORDER BY item_id',
  [id],
 )).rows as {item_id:number;amount:string}[];
 const balances=Object.fromEntries(rows.map(r=>[r.item_id,r.amount]));
 const items=rows.map(r=>enrichItem(r.item_id,r.amount));
 const byKind=items.reduce((acc,it)=>{acc[it.kind]=(acc[it.kind]??0)+1;return acc},{} as Record<string,number>);
 return {
  items,
  currencies:{
   coin:balances[CURRENCY_IDS.coin]??'0',
   diamond:balances[CURRENCY_IDS.diamond]??'0',
   colorDiamond:balances[CURRENCY_IDS.colorDiamond]??'0',
   intelligence:balances[CURRENCY_IDS.intelligence]??'0',
   vipPoint:balances[CURRENCY_IDS.vipPoint]??'0',
   xpWater:balances[CURRENCY_IDS.xpWater]??'0',
  },
  itemCount:rows.length,
  byKind,
 };
}

async function pay(s:Storage,id:string,itemId:number,n:number){
 const r=await s.pg.query(
  'UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3 RETURNING amount::text',
  [id,itemId,n],
 );
 return r.rowCount===1?r.rows[0].amount as string:null;
}

async function grant(s:Storage,id:string,itemId:number,n:number){
 const r=await s.pg.query(
  `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
   ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount
   RETURNING amount::text`,
  [id,itemId,n],
 );
 return r.rows[0].amount as string;
}

export async function inventoryRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/inventory',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  return bag(s,id);
 });

 app.post<{Body:{itemId:number;count?:number;selIndex?:number}}>('/v1/inventory/use',{
  schema:{body:{type:'object',required:['itemId'],additionalProperties:false,properties:{
   itemId:{type:'integer',minimum:1},
   count:{type:'integer',minimum:1,maximum:9999},
   selIndex:{type:'integer',minimum:0,maximum:99},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const itemId=req.body.itemId;
  const count=req.body.count??1;
  const cfg=consumeConfig(itemId);
  if(!cfg)return reply.code(409).send({error:'not_usable'});
  let rewards:number[][]=[];
  let costs:number[][]=[[itemId,count]];
  if(cfg.subType===1){
   rewards=cfg.param.map(([i,c])=>[i,(c??0)*count]);
  }else if(cfg.subType===3){
   const row=cfg.param[req.body.selIndex??0];
   if(!row||row.length<2)return reply.code(400).send({error:'invalid_sel_index'});
   rewards=[[row[0],row[1]*count]];
  }else if([2,5,6,7].includes(cfg.subType)){
   if(cfg.subType===6||cfg.subType===7){
    const row=cfg.param[0]??[];
    if(!row.length||row.length%2)return reply.code(409).send({error:'invalid_box_cost'});
    costs=[];for(let i=0;i<row.length;i+=2)if(row[i+1]>0)costs.push([row[i],row[i+1]*count]);
   }
   if(cfg.subType===6)rewards=cfg.param.slice(1).map(([i,n])=>[i,n*count]);
   else for(let i=0;i<count;i++){const reward=rollBox(cfg.summonType??0,cfg.showLib??[]);if(reward)rewards.push(reward)}
   if(rewards.length!==count&&cfg.subType!==6)return reply.code(409).send({error:'empty_box_pool'});
   if(!rewards.length)return reply.code(409).send({error:'empty_box_pool'});
  }else return reply.code(409).send({error:'not_usable'});
  const aggregate=(rows:number[][])=>{const m=new Map<number,number>();for(const [i,n] of rows)if(i>0&&n>0)m.set(i,(m.get(i)??0)+n);return [...m].sort((a,b)=>a[0]-b[0])};
  // Refuse malformed original config rewards rather than silently deleting resources.
  if(aggregate(rewards).some(([i,n])=>!Number.isSafeInteger(i)||!Number.isSafeInteger(n))||
     aggregate(costs).some(([i,n])=>!Number.isSafeInteger(i)||!Number.isSafeInteger(n)))
   return reply.code(409).send({error:'invalid_box_amount'});
  const c=await s.pg.connect();
  const granted:{itemId:number;amount:string;total:string}[]=[];
  let remaining='0';
  try{
   await c.query('BEGIN');
   for(const [rid,n] of aggregate(costs)){
    const paid=await c.query('UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3 RETURNING amount::text',[id,rid,n]);
    if(!paid.rowCount){await c.query('ROLLBACK');return reply.code(409).send({error:'insufficient_item',itemId:rid})}
    if(rid===itemId)remaining=paid.rows[0].amount;
   }
   for(const [rid,n] of aggregate(rewards)){
    const got=await c.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount RETURNING amount::text',[id,rid,n]);
    granted.push({itemId:rid,amount:String(n),total:got.rows[0].amount});
   }
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  return {ok:true,used:{itemId,count,remaining},rewards:granted,inventory:await bag(s,id)};
 });


 /** Original Req_Item_ComposePiece: consume RequireCount fragments, grant CardId.
     The debit and reward live in a single PostgreSQL transaction. */
 app.post<{Body:{itemId:number;count?:number}}>('/v1/inventory/compose',{
  schema:{body:{type:'object',required:['itemId'],additionalProperties:false,properties:{
   itemId:{type:'integer',minimum:1},
   count:{type:'integer',minimum:1,maximum:9999},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const recipe=heroPieceRecipe(req.body.itemId);
  if(!recipe)return reply.code(409).send({error:'not_composable'});
  const count=req.body.count??1;
  const required=recipe.need*count;
  const c=await s.pg.connect();
  let remaining:string,cardTotal:string;
  try{
   await c.query('BEGIN');
   const paid=await c.query(
    'UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3 RETURNING amount::text',
    [id,recipe.itemId,required],
   );
   if(!paid.rowCount){await c.query('ROLLBACK');return reply.code(409).send({error:'insufficient_fragments',required})}
   remaining=String(paid.rows[0].amount);
   const got=await c.query(
    `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
     ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount
     RETURNING amount::text`,
    [id,recipe.cardId,count],
   );
   cardTotal=String(got.rows[0].amount);
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
  return {ok:true,used:{itemId:recipe.itemId,count:required,remaining},rewards:[{itemId:recipe.cardId,amount:String(count),total:cardTotal}],inventory:await bag(s,id)};
 });

 /** Original Req_Item_OneClickComposePiece: combine every eligible hero fragment.
     Lock owned stacks and apply all changes atomically to avoid partial payouts. */
 app.post('/v1/inventory/compose-all',async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const recipes=new Map(heroPieceRecipes().map(r=>[r.itemId,r]));
  const c=await s.pg.connect();
  const rewards:{itemId:number;amount:string;total:string}[]=[];
  try{
   await c.query('BEGIN');
   const rows=await c.query(
    'SELECT item_id,amount::text AS amount FROM player_items WHERE account_id=$1 ORDER BY item_id FOR UPDATE',[id],
   );
   for(const row of rows.rows as {item_id:number;amount:string}[]){
    const recipe=recipes.get(row.item_id);
    if(!recipe)continue;
    const count=Math.floor(Number(row.amount)/recipe.need);
    if(count<1)continue;
    const paid=await c.query(
     'UPDATE player_items SET amount=amount-$3 WHERE account_id=$1 AND item_id=$2 AND amount>=$3',
     [id,recipe.itemId,recipe.need*count],
    );
    if(paid.rowCount!==1)throw Error('compose_inventory_changed');
    const got=await c.query(
     `INSERT INTO player_items(account_id,item_id,amount) VALUES($1,$2,$3)
      ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount
      RETURNING amount::text`,
     [id,recipe.cardId,count],
    );
    rewards.push({itemId:recipe.cardId,amount:String(count),total:String(got.rows[0].amount)});
   }
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e}
  finally{c.release()}
  return {ok:true,rewards,inventory:await bag(s,id)};
 });

 app.post<{Body:{itemId:number;count?:number}}>('/v1/inventory/sell',{
  schema:{body:{type:'object',required:['itemId'],additionalProperties:false,properties:{
   itemId:{type:'integer',minimum:1},
   count:{type:'integer',minimum:1,maximum:999999},
  }}},
 },async(req,reply)=>{
  const id=await account(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id);
  const itemId=req.body.itemId;
  const count=req.body.count??1;
  const price=sellPrice(itemId);
  if(price<=0)return reply.code(409).send({error:'not_sellable'});
  if(itemId===COIN)return reply.code(409).send({error:'not_sellable'});
  const paid=await pay(s,id,itemId,count);
  if(paid===null)return reply.code(409).send({error:'insufficient_item'});
  const coinTotal=await grant(s,id,COIN,price*count);
  return {
   ok:true,
   sold:{itemId,count,remaining:paid},
   gained:{itemId:COIN,amount:String(price*count),total:coinTotal},
   inventory:await bag(s,id),
  };
 });
}
