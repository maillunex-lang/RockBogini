/** PVE/PVP talent costs from HeroTalentItemConsume + GlobalSetting unlocks. */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

type Tier={pveCommon:number[][];pveHero:number[][];pvpCommon:number[][];pvpHero:number[][]};
type TierMap=Record<string,Tier>;

const PER_TIER=6;
export const TALENT_PVE=1;
export const TALENT_PVP=2;

/** From GlobalSetting */
export const TALENT_LEVEL_UNLOCK=1;
export const TALENT_STAR_UNLOCK=10;
export const TALENT_PVP_UNLOCK_PVE=0;
export const TALENT_RESET_RATIO=1000;

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];

function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}

const TIERS:TierMap=loadJson('hero-talent-consume.json',{});

export function talentMaxLevel():number{
 return Object.keys(TIERS).length*PER_TIER;
}

export function talentField(type:number):'PVETalentLevel'|'PVPTalentLevel'|null{
 if(type===TALENT_PVE)return 'PVETalentLevel';
 if(type===TALENT_PVP)return 'PVPTalentLevel';
 return null;
}

export function talentUnlocked(level:number,star:number,type:number,pveLevel:number):boolean{
 if(level<TALENT_LEVEL_UNLOCK||star<TALENT_STAR_UNLOCK)return false;
 if(type===TALENT_PVP&&pveLevel<TALENT_PVP_UNLOCK_PVE)return false;
 return true;
}

function tierForLevel(lv:number):Tier|undefined{
 // cost to go from lv → lv+1 uses tier div(lv,6)+1
 return TIERS[String(Math.floor(lv/PER_TIER)+1)];
}

function mergePairs(pairs:number[][]):[number,number][]{
 const m=new Map<number,number>();
 for(const p of pairs){
  if(!p[0]||!p[1])continue;
  m.set(p[0],(m.get(p[0])??0)+p[1]);
 }
 return [...m.entries()];
}

function mergeReqs(reqs:number[][]):[number,number,number][]{
 const m=new Map<string,[number,number,number]>();
 for(const r of reqs){
  if(!r[2])continue;
  const k=`${r[0]}:${r[1]}`;
  const prev=m.get(k);
  if(prev)prev[2]+=r[2];
  else m.set(k,[r[0],r[1],r[2]]);
 }
 return [...m.values()];
}

/** Cost for `count` talent levels starting at current `lv` (0-based level before upgrade). */
export function talentCost(lv:number,type:number,count:number):{items:[number,number][];heroReqs:[number,number,number][]}|null{
 const items:number[][]=[];
 const reqs:number[][]=[];
 for(let i=0;i<count;i++){
  const tier=tierForLevel(lv+i);
  if(!tier)return null;
  if(type===TALENT_PVE){items.push(...tier.pveCommon);reqs.push(...tier.pveHero)}
  else{items.push(...tier.pvpCommon);reqs.push(...tier.pvpHero)}
 }
 return {items:mergePairs(items),heroReqs:mergeReqs(reqs)};
}

export function talentRefund(lv:number,type:number):[number,number][]{
 if(lv<=0)return [];
 const items:number[][]=[];
 for(let l=0;l<lv;l++){
  const tier=tierForLevel(l);
  if(!tier)continue;
  const common=type===TALENT_PVE?tier.pveCommon:tier.pvpCommon;
  const heroes=type===TALENT_PVE?tier.pveHero:tier.pvpHero;
  items.push(...common);
  // hero mats refund as soul item 6005 × count (original)
  for(const r of heroes)if(r[2])items.push([6005,r[2]]);
 }
 return mergePairs(items).map(([id,n])=>[id,Math.floor(n*TALENT_RESET_RATIO/1000)] as [number,number]).filter(([,n])=>n>0);
}
