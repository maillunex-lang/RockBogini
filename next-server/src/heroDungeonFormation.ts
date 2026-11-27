/** Original HeroDungeon dedicated formation Sid1006. Empty roster falls back to main squad until configured. */
import {getHeroes} from './heroes.js';
import {prepareSquad,buildUnit} from './battleUnits.js';
import {formations} from './formationConfig.js';
import type {Storage} from './storage.js';
import type {Fighter} from './battle/simulation.js';
type Hero={Sid:number;HeroId:number;Level:number;StarLevel:number;Attrs:Record<string,number>;Skills:number[];SkinId:number};
export function checkDungeonRoster(ids:number[],type:number){
 return ids.length===6&&ids.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=2147483647)&&
  new Set(ids.filter(x=>x>0)).size===ids.filter(x=>x>0).length&&
  formations.some(f=>f.Id===type&&f.Data.length===6);
}
export async function dungeonRoster(s:Storage,id:string){
 await getHeroes(s,id);
 await s.pg.query('INSERT INTO player_formations(account_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
 const r=(await s.pg.query('SELECT dungeon_hero_ids,dungeon_formation_type FROM player_formations WHERE account_id=$1',[id])).rows[0];
 return {heroIds:r.dungeon_hero_ids as number[],formationType:Number(r.dungeon_formation_type)};
}
export async function dungeonAttackers(s:Storage,id:string):Promise<Fighter[]>{
 const roster=await dungeonRoster(s,id);
 if(!roster.heroIds.some(x=>x>0))return prepareSquad(s,id) as Promise<Fighter[]>;
 if(!checkDungeonRoster(roster.heroIds,roster.formationType))throw Error('invalid_dungeon_formation');
 const f=formations.find(f=>f.Id===roster.formationType)!;
 const heroes=await getHeroes(s,id) as Hero[];
 const owned=new Map(heroes.map(h=>[h.Sid,h]));
 return roster.heroIds.flatMap((sid,index)=>{
  if(sid===0)return [];
  const hero=owned.get(sid);
  if(!hero)throw Error('hero_not_owned');
  return [buildUnit(hero,f.Data[index]-1) as unknown as Fighter];
 });
}
