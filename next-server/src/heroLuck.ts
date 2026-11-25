/** Luck skills (LuckSkill1/2) from LuckyCharmSkill + HeroLuckyCharm. */
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

type SkillCfg={type:number;quality:number;power:number;understand:number[][];decompose:number[][]};
type CharmCfg={skillId:number;packing:number[][]};
type SkillMap=Record<string,SkillCfg>;
type CharmMap=Record<string,CharmCfg>;

/** GlobalSetting HeroLuckyCharmUnlock1/2 (★). Index 1/2. */
export const LUCK_UNLOCK_STAR:number[]=[0,11,12];

const here=dirname(fileURLToPath(import.meta.url));
const candidates=[join(process.cwd(),'data'),join(here,'..','data'),join(here,'..','..','data')];

function loadJson<T>(name:string,fallback:T):T{
 for(const dir of candidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* next */}
 }
 return fallback;
}

const SKILLS:SkillMap=loadJson('lucky-charm-skill.json',{});
const CHARMS:CharmMap=loadJson('hero-lucky-charm.json',{});

export function luckField(index:number):'LuckSkill1'|'LuckSkill2'|null{
 if(index===1)return 'LuckSkill1';
 if(index===2)return 'LuckSkill2';
 return null;
}

export function luckUnlocked(star:number,index:number):boolean{
 return star>=(LUCK_UNLOCK_STAR[index]??99);
}

export function luckSkill(id:number):SkillCfg|undefined{
 return SKILLS[String(id)];
}

export function luckCharm(itemId:number):CharmCfg|undefined{
 return CHARMS[String(itemId)];
}

function pairs(mats:number[][]):[number,number][]{
 return mats.filter(m=>m[0]&&m[1]).map(m=>[m[0],m[1]] as [number,number]);
}

/** Study Type1: Param=skillId; cost = UnderstandMaterials delta vs current. */
export function luckStudyCost(currentSkill:number,type:number,param:number):{skill:number;cost:[number,number][]}|null{
 if(type===1){
  const cfg=luckSkill(param);
  if(!cfg)return null;
  const have=new Map<number,number>();
  if(currentSkill){
   const cur=luckSkill(currentSkill);
   for(const [id,n] of pairs(cur?.understand??[]))have.set(id,n);
  }
  const cost:[number,number][]=[];
  for(const [id,n] of pairs(cfg.understand)){
   const d=n-(have.get(id)??0);
   if(d>0)cost.push([id,d]);
  }
  return {skill:param,cost};
 }
 if(type===2){
  const charm=luckCharm(param);
  if(!charm?.skillId)return null;
  return {skill:charm.skillId,cost:[[param,1]]};
 }
 return null;
}

export function sameLuckType(otherSkill:number,skill:number):boolean{
 if(!otherSkill)return false;
 const a=luckSkill(otherSkill),b=luckSkill(skill);
 return !!a&&!!b&&a.type===b.type;
}

/** Clear Type1: DecomposeItems refund. Type2: pay Packing, grant charm item. */
export function luckClear(skill:number,type:number):{cost:[number,number][];refund:[number,number][]}|null{
 const cfg=luckSkill(skill);
 if(!cfg)return null;
 if(type===1)return {cost:[],refund:pairs(cfg.decompose)};
 if(type===2){
  const pack=Object.entries(CHARMS).find(([,c])=>c.skillId===skill);
  if(!pack)return null;
  const itemId=Number(pack[0]);
  return {cost:pairs(pack[1].packing),refund:[[itemId,1]]};
 }
 return null;
}

export function luckCatalog():{id:number;type:number;quality:number;power:number;understand:[number,number][]}[]{
 return Object.entries(SKILLS).map(([id,s])=>({
  id:Number(id),type:s.type,quality:s.quality,power:s.power,understand:pairs(s.understand),
 })).sort((a,b)=>a.id-b.id);
}
