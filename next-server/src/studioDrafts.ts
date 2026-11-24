import type {Storage} from './storage.js';
export type DraftKey={model:string;kind:'hero'|'skill';slot:number};
function validate(k:DraftKey,payload:unknown,actor:string){
 if(!/^[A-Za-z0-9_]{1,100}$/.test(k.model)||!['hero','skill'].includes(k.kind)||!Number.isInteger(k.slot)||k.slot<0||k.slot>1000)throw Error('INVALID_KEY');
 if(!actor||actor.length>128||!payload||typeof payload!=='object'||Array.isArray(payload)||Buffer.byteLength(JSON.stringify(payload))>262144)throw Error('INVALID_DRAFT');
}
export async function history(s:Storage,k:DraftKey){const r=await s.pg.query('SELECT revision,payload,actor,created_at,restored_from FROM studio_draft_versions WHERE model=$1 AND kind=$2 AND slot=$3 ORDER BY revision DESC LIMIT 100',[k.model,k.kind,k.slot]);return r.rows}
export async function saveDraft(s:Storage,k:DraftKey,payload:unknown,actor:string,expected:number,restore?:number){
 validate(k,payload,actor);if(!Number.isInteger(expected)||expected<0)throw Error('INVALID_REVISION');
 const c=await s.pg.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([k.model,k.kind,k.slot])]);
 const args=[k.model,k.kind,k.slot];const r=await c.query('SELECT COALESCE(MAX(revision),0)::integer AS revision FROM studio_draft_versions WHERE model=$1 AND kind=$2 AND slot=$3',args);if(r.rows[0].revision!==expected)throw Error('REVISION_CONFLICT');
 if(restore!==undefined){const old=await c.query('SELECT payload FROM studio_draft_versions WHERE model=$1 AND kind=$2 AND slot=$3 AND revision=$4',[...args,restore]);if(!old.rowCount)throw Error('VERSION_NOT_FOUND');payload=old.rows[0].payload}
 const result=await c.query('INSERT INTO studio_draft_versions(model,kind,slot,revision,payload,actor,restored_from) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING revision,payload,actor,created_at,restored_from',[...args,expected+1,JSON.stringify(payload),actor,restore??null]);await c.query('COMMIT');return result.rows[0]
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
export function restoreDraft(s:Storage,k:DraftKey,revision:number,actor:string,expected:number){if(!Number.isInteger(revision)||revision<1)throw Error('INVALID_REVISION');return saveDraft(s,k,{},actor,expected,revision)}
