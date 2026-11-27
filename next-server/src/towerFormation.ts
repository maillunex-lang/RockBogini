/** Original MapType attacker formation SIDs 141–145 for elemental towers. */
import {readFileSync} from 'node:fs';
import {formations} from './formationConfig.js';
import {getHeroes} from './heroes.js';
import {buildUnit} from './battleUnits.js';
import type {Storage} from './storage.js';
import type {Fighter} from './battle/simulation.js';
type Hero={Sid:number;HeroId:number;Level:number;StarLevel:number;Attrs:Record<string,number>;Skills:number[];SkinId:number};
const mapTypes=JSON.parse(readFileSync(new URL('../../data/tower-attacker-formations.json',import.meta.url),'utf8')) as Record<string,number[]>;
export const towerElementTypes=[1,2,3,4,5,101,102,103,104,105] as const;
export function towerFormationSid(type:number){
 const mapType=type>=101&&type<=105?type-80:type>=1&&type<=5?type+20:3;
 return mapTypes[String(mapType)]?.[0]??null;
}
export function towerFormationType(type:number){return towerFormationSid(type);}
export function towerElementRoot(type:number){return type>=101&&type<=105?type-100:type;}
export function checkTowerRoster(ids:number[],formationType:number):boolean{
 const used=ids.filter(x=>x>0);
 return ids.length===6&&ids.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=2147483647)&&
  new Set(used).size===used.length&&formations.some(f=>f.Id===formationType&&f.Data.length===6);
}
export function towerUnits(ids:number[],formationType:number,heroes:Hero[]):Fighter[]{
 if(!checkTowerRoster(ids,formationType))throw Error('invalid_tower_formation');
 const f=formations.find(f=>f.Id===formationType)!;
 const owned=new Map(heroes.map(h=>[h.Sid,h]));
 return ids.flatMap((sid,index)=>{
  if(sid===0)return [];
  const hero=owned.get(sid);
  if(!hero)throw Error('hero_not_owned');
  return [buildUnit(hero,f.Data[index]-1) as unknown as Fighter];
 });
}
export async function savedTowerFormations(s:Storage,id:string){
 await getHeroes(s,id);
 const r=await s.pg.query('SELECT tower_type,formation_type,hero_ids FROM tower_formations WHERE account_id=$1 ORDER BY tower_type',[id]);
 return Object.fromEntries(r.rows.map(x=>[x.tower_type,{formationType:x.formation_type,heroIds:x.hero_ids}])) as Record<number,{formationType:number;heroIds:number[]}>;
}
export async function towerAttackers(s:Storage,id:string,type:number):Promise<Fighter[]>{
 if(towerFormationSid(type)===null)throw Error('invalid_tower_formation');
 if(towerFormationSid(type)===1){
  const {prepareSquad}=await import('./battleUnits.js');
  return prepareSquad(s,id) as Promise<Fighter[]>;
 }
 const roster=await savedTowerFormations(s,id);
 const saved=roster[towerElementRoot(type)];
 if(!saved||!saved.heroIds.some(x=>x>0))throw Error('empty_tower_formation');
 const heroes=await getHeroes(s,id) as Hero[];
 return towerUnits(saved.heroIds,saved.formationType,heroes);
}
