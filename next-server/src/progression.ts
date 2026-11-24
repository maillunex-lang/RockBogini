import type {Storage} from './storage.js';
import {playerLevels} from './playerLevels.js';
import {getProfile} from './profile.js';
/** Internal trusted game service only; never exposed as a client reward endpoint. */
export async function grantExperience(s:Storage,id:string,amount:bigint){
 if(amount<=0n)throw Error('positive experience required');
 await getProfile(s,id);
 const c=await s.pg.connect();
 try{
 await c.query('BEGIN');
 const old=(await c.query('SELECT level FROM player_profiles WHERE account_id=$1 FOR UPDATE',[id])).rows[0].level as number;
 const row=(await c.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,5,$2) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount RETURNING amount::text',[id,amount.toString()])).rows[0];
 const xp=BigInt(row.amount);let level=old,diamonds=0;
 for(const r of playerLevels)if(r.id>old&&BigInt(r.xp)<=xp){level=r.id;for(const reward of r.rewards)diamonds+=reward[1]}
 if(diamonds)await c.query('INSERT INTO player_items(account_id,item_id,amount) VALUES($1,3,$2) ON CONFLICT(account_id,item_id) DO UPDATE SET amount=player_items.amount+EXCLUDED.amount',[id,diamonds]);
 await c.query('UPDATE player_profiles SET level=$2 WHERE account_id=$1',[id,level]);
 await c.query('COMMIT');return {level,xp:xp.toString(),diamonds};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
