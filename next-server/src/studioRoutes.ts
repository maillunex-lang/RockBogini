import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {tokenHash} from './auth.js';
import {history,saveDraft,restoreDraft,type DraftKey} from './studioDrafts.js';
type Params={model:string;kind:string;slot:string};
type DraftBody={expectedRevision:number;payload:unknown};
type RestoreBody={expectedRevision:number;restoreRevision:number};
const paramsSchema={type:'object',additionalProperties:false,required:['model','kind','slot'],properties:{
 model:{type:'string',minLength:1,maxLength:100,pattern:'^[A-Za-z0-9_]+$'},
 kind:{type:'string',enum:['hero','skill']},
 slot:{type:'string',pattern:'^(0|[1-9][0-9]{0,3})$'}
}} as const;
const routeParams=(p:Params):DraftKey=>({model:p.model,kind:p.kind as DraftKey['kind'],slot:Number(p.slot)});
const bearer=(h:string|undefined)=>/^Bearer ([A-Za-z0-9_-]{43})$/.exec(h??'')?.[1];
export async function studioRoutes(app:FastifyInstance,s:Storage){
 app.addHook('preHandler',async(req,reply)=>{
  if(!req.url.startsWith('/v1/studio/'))return;
  const t=bearer(req.headers.authorization);
  if(!t)return reply.code(401).send({error:'invalid_session'});
  const r=await s.pg.query(`SELECT a.account_id FROM sessions a INNER JOIN studio_admins b ON b.account_id=a.account_id INNER JOIN accounts c ON c.id=a.account_id WHERE a.token_hash=$1 AND a.expires_at>now() AND c.email IS NOT NULL LIMIT 1`,[tokenHash(t)]);
  if(!r.rowCount)return reply.code(403).send({error:'admin_required'});
  const key='studio:rate:'+r.rows[0].account_id;
  const n=Number(await s.redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",{keys:[key],arguments:[]}));
  if(n>120)return reply.code(429).send({error:'rate_limit'});
  (req as typeof req&{studioActor:string}).studioActor=r.rows[0].account_id;
 });
 app.get('/v1/studio/me',async(req)=>({admin:true,accountId:(req as typeof req&{studioActor:string}).studioActor}));
 app.get<{Params:Params}>('/v1/studio/drafts/:model/:kind/:slot',{schema:{params:paramsSchema}},async req=>{
  const k=routeParams(req.params);if(k.slot>1000)return {error:'invalid_draft'};
  const versions=await history(s,k);
  return {revision:versions[0]?.revision??0,payload:versions[0]?.payload??null,history:versions};
 });
 const saveSchema={type:'object',required:['expectedRevision','payload'],additionalProperties:false,properties:{expectedRevision:{type:'integer',minimum:0},payload:{type:'object',maxProperties:1000}}} as const;
 const restoreSchema={type:'object',required:['expectedRevision','restoreRevision'],additionalProperties:false,properties:{expectedRevision:{type:'integer',minimum:0},restoreRevision:{type:'integer',minimum:1}}} as const;
 const responseError=(reply:import('fastify').FastifyReply,e:unknown)=>{
  const m=e instanceof Error?e.message:'unknown';
  if(m==='REVISION_CONFLICT')return reply.code(409).send({error:'revision_conflict'});
  if(m==='VERSION_NOT_FOUND')return reply.code(404).send({error:'version_not_found'});
  if(['INVALID_KEY','INVALID_REVISION','INVALID_DRAFT'].includes(m))return reply.code(400).send({error:'invalid_draft'});
  throw e;
 };
 app.put<{Params:Params;Body:DraftBody}>('/v1/studio/drafts/:model/:kind/:slot',{schema:{params:paramsSchema,body:saveSchema},bodyLimit:280000},async(req,reply)=>{
  try{return await saveDraft(s,routeParams(req.params),req.body.payload,(req as typeof req&{studioActor:string}).studioActor,req.body.expectedRevision)}
  catch(e){return responseError(reply,e)}
 });
 app.post<{Params:Params;Body:RestoreBody}>('/v1/studio/drafts/:model/:kind/:slot/restore',{schema:{params:paramsSchema,body:restoreSchema}},async(req,reply)=>{
  try{return await restoreDraft(s,routeParams(req.params),req.body.restoreRevision,(req as typeof req&{studioActor:string}).studioActor,req.body.expectedRevision)}
  catch(e){return responseError(reply,e)}
 });
}
