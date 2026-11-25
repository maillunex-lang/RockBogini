import {readFileSync} from 'node:fs';

export type StoryLine={key:string;infoKey:string;text:string;npc?:number};
export type GuideDialog={id:number;infoKeys:string[];audioKeys:number[];npcKeys:number[];lines:StoryLine[]};
export type StoryChapterLocale={id:number;title:string;content:string};

type CampaignStoryFile={
 mapGuides:Record<string,StoryLine[]>;
 guideNpcDialogs:GuideDialog[];
 storyChapters:StoryChapterLocale[];
 stats:Record<string,number>;
};

const story=JSON.parse(readFileSync(new URL('../../data/campaign-story.json',import.meta.url),'utf8')) as CampaignStoryFile;

export function guideLinesForMap(mapId:number):StoryLine[]{
 return story.mapGuides[String(mapId)]??[];
}

export function guideDialogById(id:number):GuideDialog|undefined{
 return story.guideNpcDialogs.find(d=>d.id===id);
}

export function storyChapters():StoryChapterLocale[]{
 return story.storyChapters;
}

export function campaignStoryStats(){
 return story.stats;
}
