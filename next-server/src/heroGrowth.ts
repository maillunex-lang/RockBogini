/** Hero level/star growth from original HeroLevel + HeroStar configs. */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

type Mat=number[];
type LevelMap=Record<string,Mat[]>;
type StarRow={maxLevel:number;itemMaterials:Mat[];heroMaterials:Mat[]};
type StarMap=Record<string,StarRow>;

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

export function starMaxLevel(star:number):number{
 return STARS[String(star)]?.maxLevel??0;
}

export function starRow(star:number):StarRow|undefined{
 return STARS[String(star)];
}

/** Cost to reach `newStar` (ItemMaterials only; empty heroMaterials required for this MVP). */
export function starItemCost(newStar:number):[number,number][]|null{
 const row=STARS[String(newStar)];
 if(!row)return null;
 if((row.heroMaterials?.length??0)>0)return null; // needs fodder heroes — deferred
 return (row.itemMaterials??[]).filter(r=>r[0]&&r[1]).map(r=>[r[0],r[1]] as [number,number]);
}
