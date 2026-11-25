import {readFileSync} from 'node:fs';
import {guideTargetForStep} from './guideTargets.js';

export type StoryLine={key:string;infoKey:string;text:string;npc?:number};
export type GuideDialog={id:number;infoKeys:string[];audioKeys:number[];npcKeys:number[];lines:StoryLine[]};
export type StoryChapterLocale={id:number;title:string;content:string};
export type GuideFingerHint={
 id:number;
 infoKey?:string;
 hideMask?:number;
 maskType?:number;
 size?:number[];
 offsetY?:number;
 text?:string;
};
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
export type PlayableHint={
 stepId:number;
 hintId:number;
 autoNext:boolean;
 size:number[];
 offsetY:number;
 maskType:number;
 targetKey:string|null;
};

type CampaignStoryFile={
 mapGuides:Record<string,StoryLine[]>;
 guideNpcDialogs:GuideDialog[];
 guideFingerHints?:GuideFingerHint[];
 guideGroups:GuideGroup[];
 storyChapters:StoryChapterLocale[];
 stats:Record<string,number>;
};

const story=JSON.parse(readFileSync(new URL('../../data/campaign-story.json',import.meta.url),'utf8')) as CampaignStoryFile;
const FINGER_BY_ID=new Map((story.guideFingerHints??[]).map(h=>[h.id,h]));
/** Served from pixi-client/public/guide/ (shipped in git). */
export const PLOT_VIDEO_PATH='guide/GuidePlot_EN.mp4';

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

function isFingerStep(s:GuideStepResolved){
 return s.kindName==='fingerHint'||s.kind===2;
}

function isPlotStep(s:GuideStepResolved){
 return s.kindName==='plotVideo'||s.kind===100;
}

/** Dummy wait hints (id 100000) that only auto-advance — skip in UI. */
function playableFingerHints(group:GuideGroup):PlayableHint[]{
 const out:PlayableHint[]=[];
 for(const s of group.sequence){
  if(!isFingerStep(s))continue;
  const hintId=s.hintId??s.arg??0;
  if(hintId===100000&&s.autoNext)continue;
  const cfg=FINGER_BY_ID.get(hintId);
  out.push({
   stepId:s.stepId,
   hintId,
   autoNext:!!s.autoNext,
   size:cfg?.size??[],
   offsetY:cfg?.offsetY??0,
   maskType:cfg?.maskType??0,
   targetKey:guideTargetForStep(s.stepId)??null,
  });
 }
 return out;
}

export function playableTutorial(completed:ReadonlySet<number>){
 const group=nextGuideGroup(completed);
 if(!group)return null;
 const lines=dialogLinesForGroup(group.id);
 const hints=playableFingerHints(group);
 const panelSteps=group.sequence.filter(s=>s.kindName==='showPanel').length;
 const plotSteps=group.sequence.filter(isPlotStep).length;
 const hasPlot=plotSteps>0;
 const hasDialog=lines.length>0;
 const hasFinger=hints.length>0;
 return {
  groupId:group.id,
  desc:group.desc,
  lines:hasPlot&&!hasDialog?[]:lines,
  hasDialog,
  hasPlot,
  hasFinger,
  fingerSteps:hints.length,
  panelSteps,
  plotSteps,
  plotVideoUrl:hasPlot?PLOT_VIDEO_PATH:null,
  hints,
  sequence:group.sequence.map(s=>({
   stepId:s.stepId,
   kindName:s.kindName??'other',
   autoNext:!!s.autoNext,
   dialogId:s.dialogId,
   hintId:s.hintId,
   panelId:s.panelId,
   lineCount:s.lines?.length??0,
   targetKey:isFingerStep(s)?guideTargetForStep(s.stepId)??null:null,
  })),
 };
}
