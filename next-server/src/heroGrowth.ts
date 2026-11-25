/** Hero level/star growth from original HeroLevel + HeroStar + HeroBase configs. */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

type Mat=number[];
type LevelMap=Record<string,Mat[]>;
type StarRow={maxLevel:number;itemMaterials:Mat[];heroMaterials:Mat[]};
type StarMap=Record<string,StarRow>;
type HeroBase={element:number;bondHero:number;coreHero:number;maxStar:number};
type BaseMap=Record<string,HeroBase>;

export type FodderHero={sid:number;heroId:number;star:number;locked:boolean};

const UR=3;
const CHAOS=6;

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];

function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}

const LEVELS:LevelMap=loadJson('hero-level-materials.json',{});
const STARS:StarMap=loadJson('hero-star.json',{});
const BASE:BaseMap=loadJson('hero-base-slim.json',{});

function totals(lv:number):Map<number,number>{
 if(lv<=1)return new Map();
 const mats=LEVELS[String(lv)]??[];
 const m=new Map<number,number>();
 for(const row of mats){
  const id=row[0],n=row[1];
  if(!id||!n)continue;
  m.set(id,(m.get(id)??0)+n);
 }
 return m;
}

/** Cost to go from `from` level to `to` level (cumulative delta). */
export function levelCost(from:number,to:number):[number,number][]{
 if(to<=from)return [];
 const a=totals(from),b=totals(to);
 const out:[number,number][]=[];
 for(const [id,n] of b){
  const d=n-(a.get(id)??0);
  if(d>0)out.push([id,d]);
 }
 return out;
}

export function levelRefund(level:number):[number,number][]{
 return levelCost(1,level);
}

export function starMaxLevel(star:number):number{
 return STARS[String(star)]?.maxLevel??0;
}

export function starRow(star:number):StarRow|undefined{
 return STARS[String(star)];
}

export function heroBase(heroId:number):HeroBase|undefined{
 return BASE[String(heroId)];
}

export function heroMaxStar(heroId:number):number{
 return BASE[String(heroId)]?.maxStar??0;
}

export function starItemMaterials(newStar:number):[number,number][]{
 const row=STARS[String(newStar)];
 if(!row)return [];
 return (row.itemMaterials??[]).filter(r=>r[0]&&r[1]).map(r=>[r[0],r[1]] as [number,number]);
}

export function starHeroMaterials(newStar:number):[number,number,number][]{
 const row=STARS[String(newStar)];
 if(!row)return [];
 return (row.heroMaterials??[]).filter(r=>r[2]>0).map(r=>[r[0],r[1],r[2]] as [number,number,number]);
}

/** Legacy helper: null when fodder heroes are required. */
export function starItemCost(newStar:number):[number,number][]|null{
 const heroes=starHeroMaterials(newStar);
 if(heroes.length)return null;
 return starItemMaterials(newStar);
}

function heroFits(targetHeroId:number,type:number,star:number,fodder:FodderHero):boolean{
 if(fodder.star!==star)return false;
 const tb=heroBase(targetHeroId),hb=heroBase(fodder.heroId);
 if(!tb||!hb)return false;
 switch(type){
  case 1: case 5: return fodder.heroId===targetHeroId;
  case 2: return tb.bondHero>0&&fodder.heroId===tb.bondHero;
  case 3: return hb.element===tb.element&&hb.coreHero<UR;
  case 4: return hb.coreHero<UR&&(tb.element===CHAOS||hb.element!==CHAOS);
  default: return false;
 }
}

/**
 * Assign fodder sids to heroMaterials reqs `[[type,star,count],...]`.
 * Returns used sids or null if materials cannot satisfy.
 */
export function assignFodder(
 targetHeroId:number,
 targetSid:number,
 reqs:[number,number,number][],
 materials:number[],
 pool:FodderHero[],
):number[]|null{
 const bySid=new Map(pool.map(h=>[h.sid,h]));
 if(new Set(materials).size!==materials.length)return null;
 if(materials.includes(targetSid))return null;
 const remaining=new Set(materials);
 const used:number[]=[];
 // stricter types first
 const order=new Map([[5,0],[1,1],[2,2],[3,3],[4,4]]);
 const sorted=[...reqs].sort((a,b)=>(order.get(a[0])??9)-(order.get(b[0])??9)||b[1]-a[1]);
 for(const [type,star,need] of sorted){
  let got=0;
  for(const sid of [...remaining]){
   if(got>=need)break;
   const h=bySid.get(sid);
   if(!h||h.locked)continue;
   if(!heroFits(targetHeroId,type,star,h))continue;
   remaining.delete(sid);
   used.push(sid);
   got++;
  }
  if(got!==need)return null;
 }
 if(remaining.size)return null; // extras not allowed
 return used;
}

/** Auto-pick eligible fodder from pool (not locked, not target). */
export function autoPickFodder(
 targetHeroId:number,
 targetSid:number,
 reqs:[number,number,number][],
 pool:FodderHero[],
 blocked:Set<number>,
):number[]|null{
 const candidates=pool.filter(h=>h.sid!==targetSid&&!h.locked&&!blocked.has(h.sid));
 const picked:number[]=[];
 const used=new Set<number>();
 const order=new Map([[5,0],[1,1],[2,2],[3,3],[4,4]]);
 const sorted=[...reqs].sort((a,b)=>(order.get(a[0])??9)-(order.get(b[0])??9)||b[1]-a[1]);
 for(const [type,star,need] of sorted){
  let got=0;
  for(const h of candidates){
   if(got>=need)break;
   if(used.has(h.sid))continue;
   if(!heroFits(targetHeroId,type,star,h))continue;
   used.add(h.sid);
   picked.push(h.sid);
   got++;
  }
  if(got!==need)return null;
 }
 return picked;
}

export function nextStarPreview(heroId:number,star:number){
 const max=heroMaxStar(heroId);
 const next=star+1;
 if(next>max)return {nextStar:null as number|null,maxStar:max,heroMaterials:[] as [number,number,number][],itemMaterials:[] as [number,number][],needsFodder:false};
 return {
  nextStar:next,
  maxStar:max,
  heroMaterials:starHeroMaterials(next),
  itemMaterials:starItemMaterials(next),
  needsFodder:starHeroMaterials(next).length>0,
 };
}
