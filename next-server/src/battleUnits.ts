import {calculateHero} from './heroAttrs.js';
import {starterHeroes} from './starterHeroes.js';
import {heroCatalog} from './heroCatalog.js';
import {formations} from './formationConfig.js';
import {skillConfig,initial} from './unitConfig.js';
import type {Storage} from './storage.js';
import {getHeroes} from './heroes.js';
type Hero={Sid:number;HeroId:number;Level:number;StarLevel:number;Attrs:Record<string,number>;Skills:number[];SkinId:number};
export function buildUnit(h:Hero,station:number){
 const base=heroCatalog.find(x=>x.Id===h.HeroId);
 if(!base||!Number.isInteger(station)||station<0||station>8)throw Error('invalid_unit');
 // Full player modifier calculation is not yet ported. Never silently substitute base stats.
 if(h.SkinId>0)throw Error('hero_attributes_pending');
 if(![0,1,2,3].some(k=>(h.Attrs[k]??0)>0)||!h.Skills.length){
 const starter=starterHeroes.find(x=>x.Sid===h.Sid&&x.HeroId===h.HeroId&&x.Level===h.Level&&x.StarLevel===h.StarLevel);
 if(!starter)throw Error('hero_attributes_pending');
 const computed=calculateHero(h.HeroId,h.Level,h.StarLevel,true);
 h={...h,Attrs:computed.attrs,Skills:computed.skills};
 }
 const attrs=Object.fromEntries(Object.entries(h.Attrs).map(([k,v])=>[k,Math.trunc(v)]));
 const hp=Math.max(attrs[1]??1,1);
 for(const [k,v] of Object.entries(initial))attrs[k]=(attrs[k]??0)+v;
 const skills=h.Skills.filter(x=>skillConfig[x]),actives=skills.filter(x=>skillConfig[x].active);
 return {id:station+1,hero_id:h.HeroId,sid:h.Sid,camp:1,station,level:h.Level,star:h.StarLevel,model:base.Model,element:base.ElementType,career:base.Career,attrs,hp,hp_max:hp,normal:base.NormalAttackId,actives,skills,passives:skills.filter(x=>skillConfig[x].passive),cd:Object.fromEntries(actives.map(x=>[x,skillConfig[x].start]))};
}
export async function prepareSquad(s:Storage,id:string){
 await getHeroes(s,id);
 await s.pg.query('INSERT INTO player_formations(account_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
 const c=await s.pg.connect();
 try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const f=(await c.query('SELECT formation_type,hero_ids FROM player_formations WHERE account_id=$1',[id])).rows[0];
 const layout=formations.find(x=>x.Id===f.formation_type);if(!layout)throw Error('invalid_formation');
 const used=f.hero_ids.filter((x:number)=>x>0);if(!used.length)throw Error('empty_formation');
 if(new Set(used).size!==used.length)throw Error('invalid_formation');
 const rows=(await c.query('SELECT sid,hero_id,level,star,state FROM player_heroes WHERE account_id=$1 AND sid=ANY($2::integer[])',[id,used])).rows;
 const units=f.hero_ids.flatMap((sid:number,i:number)=>{if(!sid)return [];const r=rows.find(x=>x.sid===sid);if(!r)throw Error('hero_not_owned');return [buildUnit({...r.state,Sid:r.sid,HeroId:r.hero_id,Level:r.level,StarLevel:r.star},layout.Data[i]-1)]});
 await c.query('COMMIT');return units;
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
