import {readFileSync} from 'node:fs';

export type StoryLine={key:string;infoKey:string;text:string;npc?:number};
export type GuideDialog={id:number;infoKeys:string[];audioKeys:number[];npcKeys:number[];lines:StoryLine[]};
export type StoryChapterLocale={id:number;title:string;content:string};
export type GuideStepResolved={
 stepId:number;
 kind:number;
 kindName?:string;
 arg?:number;
 autoNext?:boolean;
 type?:number[];
 dialogId?:number;
 lines?:StoryLine[];
 hintId?:number;
 text?:string;
 infoKey?:string;
 panelId?:number;
};
export type GuideGroup={
 id:number;
 desc:string;
 steps1:number[];
 steps2:number[];
 preStep:number[];
 sequence:GuideStepResolved[];
};

type CampaignStoryFile={
 mapGuides:Record<string,StoryLine[]>;
 guideNpcDialogs:GuideDialog[];
 guideGroups:GuideGroup[];
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

export function guideGroups():GuideGroup[]{
 return story.guideGroups??[];
}

/** NPC dialog lines for a GuideGroup (original Type[0]==1 steps), in sequence order. */
export function dialogLinesForGroup(groupId:number):StoryLine[]{
 const g=guideGroups().find(x=>x.id===groupId);
 if(!g)return [];
 const out:StoryLine[]=[];
 for(const st of g.sequence){
  if(st.kindName==='npcDialog'&&st.lines?.length)out.push(...st.lines);
 }
 return out;
}

export function nextGuideGroup(completed:ReadonlySet<number>):GuideGroup|undefined{
 return guideGroups().find(g=>!completed.has(g.id));
}

export function playableTutorial(completed:ReadonlySet<number>){
 const group=nextGuideGroup(completed);
 if(!group)return null;
 const lines=dialogLinesForGroup(group.id);
 const fingerSteps=group.sequence.filter(s=>s.kindName==='fingerHint').length;
 const panelSteps=group.sequence.filter(s=>s.kindName==='showPanel').length;
 const plotSteps=group.sequence.filter(s=>s.kindName==='plotVideo'||s.kind===100).length;
 const hasPlot=plotSteps>0&&lines.length===0;
 return {
  groupId:group.id,
  desc:group.desc,
  lines:hasPlot?[{key:`plot_${group.id}`,infoKey:`plot_${group.id}`,text:'Сюжетный ролик этого шага обучения пока не перенесён. Продолжите, чтобы пропустить.'}]:lines,
  hasDialog:lines.length>0,
  hasPlot,
  fingerSteps,
  panelSteps,
  plotSteps,
  sequence:group.sequence.map(s=>({
   stepId:s.stepId,
   kindName:s.kindName??'other',
   autoNext:!!s.autoNext,
   dialogId:s.dialogId,
   hintId:s.hintId,
   panelId:s.panelId,
   lineCount:s.lines?.length??0,
  })),
 };
}
