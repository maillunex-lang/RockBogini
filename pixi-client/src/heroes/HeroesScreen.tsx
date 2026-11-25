import {FormationScreen} from './FormationScreen';
import {skillNames} from './skillNames';
import React,{useEffect,useState} from 'react';
import './heroes.css';
type Hero={Sid:number;HeroId:number;Level:number;StarLevel:number;Power:number;Attrs:Record<string,number>;Skills:number[];base:{attrs:Record<string,number>;power:number};skillSlots:{id:number;unlockLevel:number;unlocked:boolean}[]};
import {heroDisplayName} from '../shared/heroNames';
const attrs:Record<string,string>={'0':'Атака','1':'ОЗ','2':'Защита','3':'Скорость'};
export function HeroesScreen({api,token,onClose}:{api:string;token:string;onClose:()=>void}){
 const [formation,setFormation]=useState(false);
 const [heroes,setHeroes]=useState<Hero[]>([]),[selected,setSelected]=useState<number|null>(null),[status,setStatus]=useState('Загрузка…');
 useEffect(()=>{const c=new AbortController();fetch(api+'/v1/heroes',{headers:{Authorization:'Bearer '+token},signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{setHeroes(d.heroes);setStatus('')}).catch(()=>{if(!c.signal.aborted)setStatus('Не удалось загрузить героев')});return()=>c.abort()},[api,token]);
 const h=heroes.find(x=>x.Sid===selected);
 if(formation)return <FormationScreen api={api} token={token} onClose={()=>setFormation(false)}/>;
 return <main className="heroes-screen"><header><h1>Герои</h1><button onClick={onClose}>Вернуться в город</button></header>{status&&<p role="status">{status}</p>}<button onClick={()=>setFormation(true)}>Боевой отряд</button><p>В коллекции: {heroes.length}</p><div className="heroes-grid">{heroes.map(x=><button key={x.Sid} aria-pressed={selected===x.Sid} onClick={()=>setSelected(x.Sid)}><img src={'./profile/icon-'+x.HeroId+'.webp'} alt="" onError={e=>{e.currentTarget.style.visibility='hidden'}}/><strong>{heroDisplayName(x.HeroId)}</strong><span>Ур. {x.Level} · ★ {x.StarLevel}</span><span>Мощь: {x.Power}</span></button>)}</div>{h&&<section className="hero-detail" aria-label="Характеристики героя"><h2>{heroDisplayName(h.HeroId)}</h2>{Object.keys(h.Attrs).length===0?<p>Характеристики ещё не рассчитаны</p>:<dl>{Object.entries(attrs).map(([k,n])=><React.Fragment key={k}><dt>{n}</dt><dd>{h.Attrs[k]??'—'}</dd></React.Fragment>)}</dl>}<h3>Базовые расчётные характеристики</h3><p>Мощь без дополнительных бонусов: {h.base.power}</p><dl>{Object.entries(attrs).map(([k,n])=><React.Fragment key={k}><dt>{n}</dt><dd>{h.base.attrs[k]??'—'}</dd></React.Fragment>)}</dl><h3>Способности</h3>{h.skillSlots.map((slot,i)=><article key={i} className="hero-skill"><strong>{skillNames[slot.id]?.name??'Способность №'+slot.id}</strong><p>{skillNames[slot.id]?.description??'Описание ещё не переведено'}</p><small>{slot.unlocked?'Открыта':'Откроется на уровне '+slot.unlockLevel}</small></article>)}</section>}</main>
}
