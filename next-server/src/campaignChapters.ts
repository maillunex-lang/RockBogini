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

const cfg=JSON.parse(readFileSync(new URL('../../data/campaign-chapters.json',import.meta.url),'utf8')) as CampaignChaptersFile;

export const campaignChapters=cfg;

export function chapterForMap(mapId:number):CampaignChapterRow|undefined{
 const id=cfg.mapChapter[String(mapId)];
 return id==null?undefined:cfg.chapters.find(c=>c.id===id);
}

export function mapStatus(mapId:number,stage:number):'cleared'|'available'|'locked'{
 if(mapId<stage)return 'cleared';
 if(mapId===stage)return 'available';
 return 'locked';
}

export function chapterStatus(chapter:CampaignChapterRow,stage:number):'cleared'|'current'|'locked'{
 const first=chapter.mapIds[0]??Infinity;
 const last=chapter.mapIds[chapter.mapIds.length-1]??-Infinity;
 if(stage>last)return 'cleared';
 if(stage>=first)return 'current';
 return 'locked';
}
