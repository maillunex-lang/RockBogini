import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {campaignChapters,chapterForMap,chapterStatus,mapStatus} from './campaignChapters.js';

export async function campaignRoutes(app:FastifyInstance,s:Storage){
 app.get<{Querystring:{chapterId?:string}}>('/v1/campaign',async(req,reply)=>{
  const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
  const id=token&&await sessionAccount(s,token);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const profile=await getProfile(s,id);
  const stage=profile.stage as number;
  const level=profile.level as number;
  const current=chapterForMap(stage)??campaignChapters.chapters[0];
  const requested=Number(req.query.chapterId);
  const focus=Number.isFinite(requested)&&requested>0
   ?campaignChapters.chapters.find(c=>c.id===requested)??current
   :current;
  const chapters=campaignChapters.chapters.map(c=>{
   const status=chapterStatus(c,stage);
   const clearedCount=c.mapIds.filter(m=>m<stage).length;
   return {
    id:c.id,
    name:c.name,
    bg:c.bg,
    worldId:c.worldId??null,
    mapCount:c.mapIds.length,
    firstMapId:c.mapIds[0]??null,
    lastMapId:c.mapIds[c.mapIds.length-1]??null,
    status,
    clearedCount,
    complete:status==='cleared',
   };
  });
  const maps=focus.maps.map(m=>({
   id:m.id,
   level:m.level,
   next:m.next,
   rewards:m.rewards,
   status:mapStatus(m.id,stage),
   levelLocked:level<m.level,
   canChallenge:m.id<=stage&&level>=m.level,
  }));
  return {
   stage,
   level,
   firstMapId:campaignChapters.firstMapId,
   orphanMapIds:campaignChapters.orphanMapIds,
   chapterCount:campaignChapters.chapterCount,
   worldCount:campaignChapters.worldCount,
   currentChapterId:current?.id??null,
   focusChapterId:focus.id,
   chapters,
   maps,
   worlds:campaignChapters.worlds,
  };
 });
}
