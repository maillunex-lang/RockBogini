/** Secret Area MapType 6 uses dedicated UserFormation_Model Sid 6, falling back to Sid 1. */
import {getHeroes} from './heroes.js';
import {prepareSquad,buildUnit} from './battleUnits.js';
import {formations} from './formationConfig.js';
import type {Storage} from './storage.js';
import type {Fighter} from './battle/simulation.js';
type Hero={Sid:number;HeroId:number;Level:number;StarLevel:number;Attrs:Record<string,number>;Skills:number[];SkinId:number};
export const SECRET_FORMATION_SID=6;
export function checkSecretRoster(ids:number[],type:number){
 return ids.length===6&&ids.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=2147483647)&&
  new Set(ids.filter(x=>x>0)).size===ids.filter(x=>x>0).length&&
  formations.some(f=>f.Id===type&&f.Data.length===6);
}
export function secretUnits(ids:number[],type:number,heroes:Hero[]):Fighter[]{
 if(!checkSecretRoster(ids,type))throw Error('invalid_secret_formation');
 const f=formations.find(f=>f.Id===type)!;
 const owned=new Map(heroes.map(h=>[h.Sid,h]));
 return ids.flatMap((sid,index)=>{
  if(sid===0)return [];
  const hero=owned.get(sid);
  if(!hero)throw Error('hero_not_owned');
  return [buildUnit(hero,f.Data[index]-1) as unknown as Fighter];
 });
}
export async function savedSecretRoster(s:Storage,id:string){
 await getHeroes(s,id);
 await s.pg.query('INSERT INTO player_formations(account_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
 const r=(await s.pg.query('SELECT secret_hero_ids,secret_formation_type FROM player_formations WHERE account_id=$1',[id])).rows[0];
 return {heroIds:r.secret_hero_ids as number[],formationType:Number(r.secret_formation_type),sid:SECRET_FORMATION_SID};
}
export async function secretAttackers(s:Storage,id:string):Promise<Fighter[]>{
 const roster=await savedSecretRoster(s,id);
 if(!roster.heroIds.some(x=>x>0))return prepareSquad(s,id) as Promise<Fighter[]>;
 const heroes=await getHeroes(s,id) as Hero[];
 return secretUnits(roster.heroIds,roster.formationType,heroes);
}
