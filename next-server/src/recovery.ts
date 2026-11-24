import {randomBytes,createHmac} from 'node:crypto';
import type {Storage} from './storage.js';
import {hashPassword,tokenHash} from './auth.js';
const SECRET=process.env.NEXT_RECOVERY_SECRET;
if(!SECRET||SECRET.length<32)throw Error('NEXT_RECOVERY_SECRET must be set to a unique random secret');
export function hashCode(code:string){return createHmac('sha256',SECRET!).update(code.replace(/[^A-Za-z0-9]/g,'').toUpperCase()).digest('hex')}
export function newRecoveryCodes(){return Array.from({length:8},()=>{const a=randomBytes(12).toString('hex').toUpperCase();return a.match(/.{1,6}/g)!.join('-')})}
export async function issueRecoveryCodes(s:Storage,accountId:string){
 const codes=newRecoveryCodes(),c=await s.pg.connect();
 try{await c.query('BEGIN');await c.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE',[accountId]);await c.query('DELETE FROM recovery_codes WHERE account_id=$1',[accountId]);
 for(const code of codes)await c.query('INSERT INTO recovery_codes(account_id,code_hash) VALUES($1,$2)',[accountId,hashCode(code)]);
 await c.query('COMMIT');return codes
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
export async function recoverWithCode(s:Storage,email:string,code:string,password:string){
 // A user can recover without email delivery only if they saved one of their codes.
 const c=await s.pg.connect();try{await c.query('BEGIN');
 const a=await c.query('SELECT id FROM accounts WHERE email=$1 FOR UPDATE',[email.trim().toLowerCase()]);
 if(!a.rows.length){await c.query('ROLLBACK');return null}
 const id=a.rows[0].id as string;
 const r=await c.query('DELETE FROM recovery_codes WHERE account_id=$1 AND code_hash=$2 RETURNING code_hash',[id,hashCode(code)]);
 if(!r.rowCount){await c.query('ROLLBACK');return null}
 const pass=await hashPassword(password),token=randomBytes(32).toString('base64url');
 await c.query('UPDATE accounts SET password_hash=$1 WHERE id=$2',[pass,id]);
 await c.query('DELETE FROM sessions WHERE account_id=$1',[id]);
 await c.query("INSERT INTO sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '365 days')",[tokenHash(token),id]);
 await c.query('COMMIT');return {id,token}
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
