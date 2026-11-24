import {randomBytes,randomUUID,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import type {Storage} from './storage.js';
const derive=promisify(scrypt);
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64) as Buffer;return salt+':'+key.toString('hex')}
export async function verifyPassword(password:string,stored:string){const [salt,hex]=stored.split(':');if(!salt||!hex||!/^[a-f0-9]{128}$/.test(hex))return false;const key=await derive(password,salt,64) as Buffer;return timingSafeEqual(key,Buffer.from(hex,'hex'))}
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function createGuest(s:Storage){
 const id=randomUUID(),token=randomBytes(32).toString('base64url');
 const c=await s.pg.connect();try{await c.query('BEGIN');await c.query('INSERT INTO accounts(id) VALUES($1)',[id]);await c.query("INSERT INTO sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '365 days')",[tokenHash(token),id]);await c.query('COMMIT');return {id,token}}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
export async function sessionAccount(s:Storage,token:string){const r=await s.pg.query('SELECT account_id FROM sessions WHERE token_hash=$1 AND expires_at>now()',[tokenHash(token)]);return r.rows[0]?.account_id??null}
