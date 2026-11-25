import {readFileSync} from 'node:fs';

export type CampaignMapRow={id:number;level:number;next:number;rewards:number[][]};
export type CampaignChapterRow={
 id:number;
 name:string;
 bg:string;
 worldId?:number;
 mapIds:number[];
 maps:CampaignMapRow[];
};
type CampaignChaptersFile={
 firstMapId:number;
 orphanMapIds:number[];
 chapterCount:number;
 worldCount:number;
 chapters:CampaignChapterRow[];
 worlds:{id:number;chapterIds:number[];owningMap:number;position:number[]}[];
 mapChapter:Record<string,number>;
};

const rewards=JSON.parse(readFileSync(new URL('../../data/campaign-rewards.json',import.meta.url),'utf8')) as Record<string,{level:number;next:number;rewards:number[][]}>;
const cfg=JSON.parse(readFileSync(new URL('../../data/campaign-chapters.json',import.meta.url),'utf8')) as CampaignChaptersFile;

export const campaignChapters=cfg;

/** Last AdventureChapter MapId — original DataUtlity.GetChapterConfigByMapId clamp target. */
export function uiClampMapId(){
 const last=cfg.chapters[cfg.chapters.length-1];
 return last?.mapIds[last.mapIds.length-1]??cfg.firstMapId;
}

/** Main-line NextId chain from firstMapId until next=0 (includes terminal 105701). */
export function mainLineChain():number[]{
 const out:number[]=[];
 let id=cfg.firstMapId;
 const seen=new Set<number>();
 while(id>0&&!seen.has(id)){
  seen.add(id);out.push(id);
  const n=rewards[String(id)]?.next??0;
  id=n>0?n:0;
 }
 return out;
}

const chain=mainLineChain();
const chainIndex=new Map(chain.map((id,i)=>[id,i]));

export function chapterForMap(mapId:number):CampaignChapterRow|undefined{
 const direct=cfg.mapChapter[String(mapId)];
 if(direct!=null)return cfg.chapters.find(c=>c.id===direct);
 // Original clamp: Math.min(progress, lastChapter.lastMap) then range lookup.
 const clamp=Math.min(mapId,uiClampMapId());
 return cfg.chapters.find(c=>{
  const first=c.mapIds[0]??Infinity;
  const last=c.mapIds[c.mapIds.length-1]??-Infinity;
  return clamp>=first&&clamp<=last;
 });
}

/**
 * Progress status using MainLine NextId order + optional campaign_clears.
 * Falls back to chain position vs stage when clears omit historical rows.
 */
export function mapStatus(mapId:number,stage:number,clears?:ReadonlySet<number>):'cleared'|'available'|'locked'{
 if(mapId===stage){
  if(clears?.has(mapId)&& (rewards[String(mapId)]?.next??0)===0)return 'cleared';
  return 'available';
 }
 const mi=chainIndex.get(mapId),si=chainIndex.get(stage);
 if(mi!=null&&si!=null){
  if(mi<si)return 'cleared';
  return 'locked';
 }
 if(clears?.has(mapId))return 'cleared';
 return 'locked';
}

export function chapterStatus(chapter:CampaignChapterRow,stage:number,clears?:ReadonlySet<number>):'cleared'|'current'|'locked'{
 const maps=mapsForChapter(chapter);
 const statuses=maps.map(m=>mapStatus(m.id,stage,clears));
 if(statuses.every(s=>s==='cleared'))return 'cleared';
 if(statuses.some(s=>s==='available'||s==='cleared'))return 'current';
 return 'locked';
}

/** Chapter maps plus terminal MainLine stage attached after last chapter (e.g. 105701). */
export function mapsForChapter(chapter:CampaignChapterRow):CampaignMapRow[]{
 const maps=[...chapter.maps];
 const last=maps[maps.length-1];
 if(!last||last.next<=0)return maps;
 if(chapter.mapIds.includes(last.next))return maps;
 const terminal=rewards[String(last.next)];
 if(!terminal)return maps;
 // Only append if this is the chapter that owns the predecessor (matches orphan terminal after last chapter).
 if(cfg.mapChapter[String(last.id)]!==chapter.id)return maps;
 if(cfg.mapChapter[String(last.next)]!=null)return maps;
 maps.push({id:last.next,level:terminal.level,next:terminal.next,rewards:terminal.rewards});
 return maps;
}

export function canChallengeMap(mapId:number,stage:number,level:number,clears?:ReadonlySet<number>){
 const cfgRow=rewards[String(mapId)];
 if(!cfgRow)return false;
 if(level<cfgRow.level)return false;
 const st=mapStatus(mapId,stage,clears);
 return st==='available'||st==='cleared';
}

export function campaignComplete(stage:number,clears:ReadonlySet<number>){
 const next=rewards[String(stage)]?.next??0;
 return next===0&&clears.has(stage);
}
