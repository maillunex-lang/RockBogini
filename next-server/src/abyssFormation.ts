/** Original Abyss MapType 10 uses three formation SIDs 101..103 and layout 902. */
import {readFileSync} from 'node:fs';
import {buildUnit} from './battleUnits.js';
import {getHeroes} from './heroes.js';
import type {Storage} from './storage.js';
import type {Fighter} from './battle/simulation.js';
type Hero={Sid:number;HeroId:number;Level:number;StarLevel:number;Attrs:Record<string,number>;Skills:number[];SkinId:number};
const FORMATIONS=JSON.parse(readFileSync(new URL('../../data/abyss-single-formations.json',import.meta.url),'utf8')) as Record<string,{id:number;data:number[]}>;
export const ABYSS_SINGLE_STATIONS=FORMATIONS['902'].data.map(x=>x-1);
export const ABYSS_SINGLE_SIDS=[101,102,103] as const;
export type AbyssRoster={single:number[];team:number[]};
export function checkSingleRoster(ids:number[]):boolean{
 return ids.length===3&&ids.every(id=>Number.isSafeInteger(id)&&id>=0)&&
  new Set(ids.filter(id=>id>0)).size===ids.filter(id=>id>0).length;
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
 const rows=await s.pg.query('SELECT single_hero_ids,hero_ids FROM player_formations WHERE account_id=$1',[id]);
 const f=rows.rows[0];
 return {single:f.single_hero_ids??[0,0,0],team:f.hero_ids};
}
export async function abyssAttackers(s:Storage,id:string):Promise<Fighter[]>{
 const heroes=await getHeroes(s,id) as Hero[];
 const roster=await savedAbyssRoster(s,id);
 if(!roster.single.some(x=>x>0))throw Error('empty_abyss_formation');
 return singleUnits(roster.single,heroes);
}
