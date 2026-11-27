/** Original Abyss MapType 10 uses three formation SIDs 101..103 and layout 902. */
import {readFileSync} from 'node:fs';
import {buildUnit} from './battleUnits.js';
import {formations} from './formationConfig.js';
import {getHeroes} from './heroes.js';
import type {Storage} from './storage.js';
import type {Fighter} from './battle/simulation.js';
type Hero={Sid:number;HeroId:number;Level:number;StarLevel:number;Attrs:Record<string,number>;Skills:number[];SkinId:number};
const FORMATIONS=JSON.parse(readFileSync(new URL('../../data/abyss-single-formations.json',import.meta.url),'utf8')) as Record<string,{id:number;data:number[]}>;
export const ABYSS_SINGLE_STATIONS=FORMATIONS['902'].data.map(x=>x-1);
export const ABYSS_SINGLE_SIDS=[101,102,103] as const;
export type AbyssRoster={single:number[];team:number[];teamType:number;main:number[];mainType:number};
export function checkSingleRoster(ids:number[]):boolean{
 return ids.length===3&&ids.every(id=>Number.isSafeInteger(id)&&id>=0)&&
  new Set(ids.filter(id=>id>0)).size===ids.filter(id=>id>0).length;
}
export function checkTeamRoster(ids:number[],formationType:number):boolean{
 const used=ids.filter(id=>id>0);
 return ids.length===6&&ids.every(id=>Number.isSafeInteger(id)&&id>=0)&&
  new Set(used).size===used.length&&formations.some(x=>x.Id===formationType&&x.Data.length===6);
}
export function teamUnits(ids:number[],formationType:number,heroes:Hero[]):Fighter[]{
 if(!checkTeamRoster(ids,formationType))throw Error('invalid_abyss_formation');
 const layout=formations.find(f=>f.Id===formationType)!;
 const owned=new Map(heroes.map(h=>[h.Sid,h]));
 return ids.flatMap((sid,i)=>{
  if(sid===0)return [];
  const hero=owned.get(sid);
  if(!hero)throw Error('hero_not_owned');
  return [buildUnit(hero,layout.Data[i]-1) as unknown as Fighter];
 });
}
export function singleUnits(ids:number[],heroes:Hero[]):Fighter[]{
 if(!checkSingleRoster(ids))throw Error('invalid_abyss_formation');
 const owned=new Map(heroes.map(h=>[h.Sid,h]));
 return ids.flatMap((sid,i)=>{
  if(sid===0)return [];
  const hero=owned.get(sid);
  if(!hero)throw Error('hero_not_owned');
  return [buildUnit(hero,ABYSS_SINGLE_STATIONS[i]) as unknown as Fighter];
 });
}
export async function savedAbyssRoster(s:Storage,id:string):Promise<AbyssRoster>{
 await getHeroes(s,id);
 await s.pg.query('INSERT INTO player_formations(account_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
 const rows=await s.pg.query('SELECT single_hero_ids,abyss_team_hero_ids,abyss_team_formation_type,hero_ids,formation_type FROM player_formations WHERE account_id=$1',[id]);
 const f=rows.rows[0];
 return {single:f.single_hero_ids??[0,0,0],team:f.abyss_team_hero_ids??[0,0,0,0,0,0],teamType:f.abyss_team_formation_type??101,main:f.hero_ids,mainType:f.formation_type};
}
export async function abyssAttackers(s:Storage,id:string,type:1|2=1):Promise<Fighter[]>{
 const heroes=await getHeroes(s,id) as Hero[];
 const roster=await savedAbyssRoster(s,id);
 if(type===1){
  if(!roster.single.some(x=>x>0))throw Error('empty_abyss_formation');
  return singleUnits(roster.single,heroes);
 }
 if(!roster.team.some(x=>x>0))throw Error('empty_abyss_formation');
 return teamUnits(roster.team,roster.teamType,heroes);
}
