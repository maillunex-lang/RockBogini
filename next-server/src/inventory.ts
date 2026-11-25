import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {enrichItem} from './itemCatalog.js';

const CURRENCY_IDS={coin:1,vipPoint:2,diamond:3,colorDiamond:4,intelligence:7,xpWater:22} as const;

export async function inventoryRoutes(app:FastifyInstance,s:Storage){
 app.get('/v1/inventory',async(req,reply)=>{
  const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
  const id=token&&await sessionAccount(s,token);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  await getProfile(s,id); // ensure starter items exist
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
 });
}
