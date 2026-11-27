import type {BattleReport,Settlement} from './reportClient';
import {heroDisplayName} from '../shared/heroNames';
import {itemDisplayName} from '../shared/itemNames';
import {moduleDisplayName} from '../shared/moduleNames';
import './resultScreen.css';

export type HeroBattleStat={
 id:number;
 heroId:number;
 camp:number;
 model:string;
 statDamage?:number;
 statHurt?:number;
 statCure?:number;
};

function winboardUrl(){
 const base=typeof import.meta.env.BASE_URL==='string'?import.meta.env.BASE_URL:'/';
 return `${base.endsWith('/')?base:base+'/'}battle-hud/settlement-winboard.webp`;
}

export function ResultScreen({report,settlement,onContinue}:{report:BattleReport;settlement:Settlement;onContinue:()=>void}){
 const win=settlement.result===1;
 const rewards=Array.isArray(settlement.rewards)?settlement.rewards:[];
 const modules=Array.isArray(settlement.unlockedModules)?settlement.unlockedModules:[];
 const heroes=Array.isArray(report.heroes)?[...(report.heroes as HeroBattleStat[])]:[];
 heroes.sort((a,b)=>(b.statDamage??0)-(a.statDamage??0));
 const rounds=report.summary?.rounds??0;
 const complete=!!settlement.campaignComplete;
 return <section className={'result-screen'+(win?' is-win':' is-lose')+(complete?' is-complete':'')} aria-label={win?'Победа':'Поражение'}>
  {win&&<div className="result-winboard" role="img" aria-label="WinBoard" style={{backgroundImage:`linear-gradient(180deg,rgba(8,6,4,.15),rgba(8,6,4,.55)),url(${winboardUrl()})`}}/>}
  <h2>{complete?'Кампания пройдена':win?'Победа':'Поражение'}</h2>
  <p className="result-meta">Этап {settlement.mapId??report.mapId} · Раундов {rounds}{settlement.level?` · Уровень ${settlement.level}`:''}</p>
  {complete&&<p className="result-complete">Финальный этап зачищен. Дальнейший прогресс MainLine завершён.</p>}
  <h3>Награды</h3>
  {rewards.length===0
   ? <p className="result-empty">{win?'Награды уже получены или отсутствуют':'Наград нет'}</p>
   : <ul className="result-rewards">{rewards.map((row,i)=>{
    const id=Array.isArray(row)?Number(row[0]):0;
    const n=Array.isArray(row)?Number(row[1]):0;
    return <li key={id+':'+n+':'+i}>
     {id>0&&<img className="result-original-item" src={import.meta.env.BASE_URL+'item-icons/'+id+'.webp'} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>}
     <span>{itemDisplayName(id)}</span><strong>×{n}</strong>
    </li>;
   })}</ul>}
  {!!modules.length&&(
   <div className="result-modules">
    <h3>Открыто</h3>
    <ul>{modules.map(id=><li key={id}>{moduleDisplayName(Number(id))}</li>)}</ul>
   </div>
  )}
  <h3>Статистика отряда</h3>
  <div className="result-stats-wrap">
   <table>
    <thead><tr><th align="left">Герой</th><th align="right">Урон</th><th align="right">Получено</th><th align="right">Лечение</th></tr></thead>
    <tbody>{heroes.filter(h=>h.camp===1).map(h=><tr key={h.id}><td><span className="result-original-hero">
     <img src={import.meta.env.BASE_URL+'profile/icon-'+h.heroId+'.webp'} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>
     {heroDisplayName(h.heroId)}
    </span></td><td align="right">{h.statDamage??0}</td><td align="right">{h.statHurt??0}</td><td align="right">{h.statCure??0}</td></tr>)}</tbody>
   </table>
  </div>
  <button type="button" className="result-continue" onClick={onContinue}>Продолжить</button>
 </section>;
}
