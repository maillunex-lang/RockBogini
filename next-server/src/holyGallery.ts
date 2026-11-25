/** Holy equipment gallery + resonance (Elixir Racon.Game.Team.Gallery). */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

type GalleryLevelCfg={materials:number[][];attrs1:number[][];attrs2:number[][];attrs3:number[][];attrs4:number[][]};
type GallerySlotCfg={type:number;requirements:number};
type ResonanceCfg={requirements:number;attrs:number[][]};
type SlotAddonCfg={allAttrs:number[][][];selfAttrs:number[][][];allAttrIds:number[];selfAttrIds:number[]};
type CommonCfg={attrs:number[][]};

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];
function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}

const GLEVEL=loadJson<Record<string,GalleryLevelCfg>>('holy-equip-gallery-level.json',{});
const GSLOT=loadJson<Record<string,GallerySlotCfg>>('holy-equip-gallery-slot.json',{});
const RES=loadJson<Record<string,ResonanceCfg>>('holy-equip-resonance.json',{});
const ADDON=loadJson<Record<string,SlotAddonCfg>>('holy-equip-slot-addon.json',{});
const COMMON=loadJson<Record<string,CommonCfg>>('common-attrs.json',{});

const ATTR_KEYS=['attrs1','attrs2','attrs3','attrs4'] as const;

export function gallerySlotCfg(slot:number):GallerySlotCfg|undefined{return GSLOT[String(slot)]}
export function galleryLevelCfg(level:number):GalleryLevelCfg|undefined{return GLEVEL[String(level)]}

export function gallerySlotsForType(type:number):{id:number;requirements:number}[]{
 return Object.entries(GSLOT)
  .map(([id,c])=>({id:Number(id),requirements:c.requirements,type:c.type}))
  .filter(s=>s.type===type)
  .sort((a,b)=>a.id-b.id);
}

function commonPairs(id:number):number[][]{
 return COMMON[String(id)]?.attrs??[];
}

function addonAllPairs(addonId:number,index:number):number[][]{
 const a=ADDON[String(addonId)];
 if(!a)return [];
 if(a.allAttrIds.length){
  const id=a.allAttrIds[index];
  return id?commonPairs(id):[];
 }
 return a.allAttrs[index]??[];
}

function addonSelfPairs(addonId:number,index:number):number[][]{
 const a=ADDON[String(addonId)];
 if(!a)return [];
 if(a.selfAttrIds.length){
  const id=a.selfAttrIds[index];
  return id?commonPairs(id):[];
 }
 return a.selfAttrs[index]??[];
}

function pushPairs(out:number[][],rows:number[][]){
 for(const row of rows){
  const k=row[0],v=row[1];
  if(k!=null&&v)out.push([k,v]);
 }
}

/** Cumulative Materials[next]-Materials[cur] → [[itemId,count]]. */
export function galleryLevelCost(cur:number,next:number):[number,number][]{
 const n=galleryLevelCfg(next);
 if(!n)return [];
 const c=cur>0?galleryLevelCfg(cur):undefined;
 const curMap=new Map<number,number>();
 for(const row of c?.materials??[]){
  if(row[0]&&row[1])curMap.set(row[0],(curMap.get(row[0])??0)+row[1]);
 }
 const out:[number,number][]=[];
 for(const row of n.materials){
  const id=row[0],need=row[1];
  if(!id||!need)continue;
  const d=need-(curMap.get(id)??0);
  if(d>0)out.push([id,d]);
 }
 return out;
}

export type GalleryShown={ItemId:number;Star:number;Step:number;GallerySlot:number;type:number;state:number};

/** Team bonus 129: gallery levels + displayed slot addons + resonance. */
export function galleryTeamExtra(levels:number[],shown:GalleryShown[]):number[][]{
 const out:number[][]=[];
 for(let t=1;t<=4;t++){
  const lv=levels[t-1]??0;
  if(lv<=0)continue;
  const cfg=galleryLevelCfg(lv);
  if(!cfg)continue;
  pushPairs(out,cfg[ATTR_KEYS[t-1]!]??[]);
 }
 for(const e of shown){
  pushPairs(out,addonAllPairs(10+e.type,e.Star));
  if(e.Step>0)pushPairs(out,addonAllPairs(10*e.state+e.type,e.Step-1));
 }
 pushPairs(out,resonanceAttrs(shown));
 return out;
}

export function resonanceAttrs(shown:GalleryShown[]):number[][]{
 const stars=new Map<number,number>();
 for(const e of shown)stars.set(e.type,(stars.get(e.type)??0)+e.Star);
 let best:ResonanceCfg|null=null;
 for(const r of Object.values(RES).sort((a,b)=>a.requirements-b.requirements)){
  if([1,2,3,4].every(t=>(stars.get(t)??0)>=r.requirements))best=r;
  else break;
 }
 return best?.attrs??[];
}

export function resonanceTier(shown:GalleryShown[]):{id:number;requirements:number}|null{
 const stars=new Map<number,number>();
 for(const e of shown)stars.set(e.type,(stars.get(e.type)??0)+e.Star);
 let best:{id:number;requirements:number}|null=null;
 for(const [id,r] of Object.entries(RES).sort((a,b)=>a[1].requirements-b[1].requirements)){
  if([1,2,3,4].every(t=>(stars.get(t)??0)>=r.requirements))best={id:Number(id),requirements:r.requirements};
  else break;
 }
 return best;
}

/** SelfAttr when displayed (client indexes SelfAttrIds[Star]; State tiers 10*y+type). */
export function gallerySelfExtra(type:number,state:number,star:number,gallerySlot:number):number[][]{
 if(gallerySlot<=0)return [];
 const out:number[][]=[];
 const maxY=Math.max(state,1);
 for(let y=1;y<=maxY;y++)pushPairs(out,addonSelfPairs(10*y+type,star));
 return out;
}
