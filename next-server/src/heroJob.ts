/** Hero job tree from HeroBase.Jobs + HeroJob configs. */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

type JobCfg={stage:number;condition:number[][];materials:number[][];skill:number;power:number};
type JobMap=Record<string,JobCfg>;
type HeroJobs=Record<string,number[][]>;

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];

function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}

const JOBS:JobMap=loadJson('hero-job.json',{});
const BY_HERO:HeroJobs=loadJson('hero-jobs-by-hero.json',{});

export function heroJobTree(heroId:number):{index:number;jobId:number;pre:number;cfg:JobCfg|null}[]{
 const arr=BY_HERO[String(heroId)]??[];
 return arr.map((row,index)=>{
  const jobId=row[0]??0,pre=row[1]??0;
  return {index,jobId,pre,cfg:JOBS[String(jobId)]??null};
 });
}

export function jobConfig(jobId:number):JobCfg|undefined{
 return JOBS[String(jobId)];
}

export function jobConditionOk(star:number,condition:number[][]):boolean{
 return condition.every(c=>{
  if(!c.length)return true;
  if(c[0]===1)return star>=(c[1]??0);
  return true;
 });
}

export function jobMaterials(jobId:number):[number,number][]{
 const cfg=JOBS[String(jobId)];
 if(!cfg)return [];
 return (cfg.materials??[]).filter(m=>m[0]&&m[1]).map(m=>[m[0],m[1]] as [number,number]);
}

export function jobRoots(heroId:number):number[]{
 return (BY_HERO[String(heroId)]??[]).filter(r=>(r[1]??0)===0).map(r=>r[0]);
}
