import type {FastifyInstance} from 'fastify';
import type {Storage} from './storage.js';
import {sessionAccount} from './auth.js';
import {getProfile} from './profile.js';
import {
 campaignChapters,
 campaignComplete,
 canChallengeMap,
 chapterForMap,
 chapterStatus,
 currentWorldId,
 mapStatus,
 mapsForChapter,
 uiClampMapId,
 worldStatus,
} from './campaignChapters.js';
import {mapWorldName} from './campaignLocales.js';
import {campaignStoryStats,guideGroups,guideLinesForMap,playableTutorial,storyChapters} from './campaignStory.js';

async function authAccount(req:{headers:{authorization?:string}},s:Storage){
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 return token?sessionAccount(s,token):null;
}

export async function campaignRoutes(app:FastifyInstance,s:Storage){
 app.get<{Querystring:{chapterId?:string}}>('/v1/campaign',async(req,reply)=>{
  const id=await authAccount(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const profile=await getProfile(s,id);
  const stage=profile.stage as number;
  const level=profile.level as number;
  const clearRows=(await s.pg.query('SELECT map_id FROM campaign_clears WHERE account_id=$1',[id])).rows as {map_id:number}[];
  const clears=new Set(clearRows.map(r=>r.map_id));
  const guideRows=(await s.pg.query('SELECT group_id FROM player_guide_groups WHERE account_id=$1',[id])).rows as {group_id:number}[];
  const completedGuides=new Set(guideRows.map(r=>r.group_id));
  // Finger/panel-only groups have no NPC lines yet — advance past them until a dialog group (or end).
  for(;;){
   const pending=playableTutorial(completedGuides);
   if(!pending||pending.hasDialog)break;
   await s.pg.query(
    'INSERT INTO player_guide_groups(account_id,group_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
    [id,pending.groupId],
   );
   completedGuides.add(pending.groupId);
  }
  const current=chapterForMap(stage)??campaignChapters.chapters[0];
  const requested=Number(req.query.chapterId);
  const focus=Number.isFinite(requested)&&requested>0
   ?campaignChapters.chapters.find(c=>c.id===requested)??current
   :current;
  const chapters=campaignChapters.chapters.map(c=>{
   const maps=mapsForChapter(c);
   const status=chapterStatus(c,stage,clears);
   const clearedCount=maps.filter(m=>mapStatus(m.id,stage,clears)==='cleared').length;
   return {
    id:c.id,
    name:c.name,
    bg:c.bg,
    worldId:c.worldId??null,
    mapCount:maps.length,
    firstMapId:maps[0]?.id??null,
    lastMapId:maps[maps.length-1]?.id??null,
    status,
    clearedCount,
    complete:status==='cleared',
   };
  });
  const maps=mapsForChapter(focus).map(m=>{
   const status=mapStatus(m.id,stage,clears);
   const levelLocked=level<m.level;
   const guide=guideLinesForMap(m.id);
   return {
    id:m.id,
    level:m.level,
    next:m.next,
    rewards:m.rewards,
    status,
    levelLocked,
    canChallenge:canChallengeMap(m.id,stage,level,clears),
    terminal:m.next===0,
    hasGuide:guide.length>0,
    guide,
   };
  });
  const worlds=campaignChapters.worlds.map(w=>{
   const status=worldStatus(w,stage,clears);
   const chapterStatuses=w.chapterIds.map(id=>{
    const ch=campaignChapters.chapters.find(c=>c.id===id);
    return ch?chapterStatus(ch,stage,clears):'locked';
   });
   return {
    id:w.id,
    name:mapWorldName(w.id),
    nameKey:`MapWorld_name_${w.id}`,
    position:w.position,
    owningMap:w.owningMap,
    chapterIds:w.chapterIds,
    status,
    clearedChapters:chapterStatuses.filter(s=>s==='cleared').length,
    chapterCount:w.chapterIds.length,
   };
  });
  return {
   stage,
   level,
   firstMapId:campaignChapters.firstMapId,
   uiClampMapId:uiClampMapId(),
   orphanMapIds:campaignChapters.orphanMapIds,
   terminalMapIds:campaignChapters.orphanMapIds.filter(mid=>{
    const prev=mapsForChapter(campaignChapters.chapters[campaignChapters.chapters.length-1]).some(m=>m.id===mid);
    return prev;
   }),
   campaignComplete:campaignComplete(stage,clears),
   chapterCount:campaignChapters.chapterCount,
   worldCount:campaignChapters.worldCount,
   currentChapterId:current?.id??null,
   currentWorldId:currentWorldId(stage,clears),
   focusChapterId:focus.id,
   focusWorldId:focus.worldId??null,
   chapters,
   maps,
   worlds,
   story:{
    stats:campaignStoryStats(),
    chapters:storyChapters().map(c=>({id:c.id,title:c.title,content:c.content})),
   },
   tutorial:{
    completedGroupIds:[...completedGuides].sort((a,b)=>a-b),
    groupCount:guideGroups().length,
    pending:playableTutorial(completedGuides),
   },
  };
 });

 app.post<{Body:{groupId?:number}}>('/v1/campaign/guide/complete',async(req,reply)=>{
  const id=await authAccount(req,s);
  if(!id)return reply.code(401).send({error:'invalid_session'});
  const groupId=Number(req.body?.groupId);
  if(!Number.isFinite(groupId)||!guideGroups().some(g=>g.id===groupId)){
   return reply.code(400).send({error:'invalid_guide_group'});
  }
  await s.pg.query(
   'INSERT INTO player_guide_groups(account_id,group_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
   [id,groupId],
  );
  const guideRows=(await s.pg.query('SELECT group_id FROM player_guide_groups WHERE account_id=$1',[id])).rows as {group_id:number}[];
  const completedGuides=new Set(guideRows.map(r=>r.group_id));
  return {
   ok:true,
   completedGroupIds:[...completedGuides].sort((a,b)=>a-b),
   pending:playableTutorial(completedGuides),
  };
 });
}
