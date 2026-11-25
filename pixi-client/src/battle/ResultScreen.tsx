import type {BattleReport,Settlement} from './reportClient';
import {heroDisplayName} from '../shared/heroNames';

const ITEM_RU:Record<number,string>={
 1:'Золото',
 2:'Очки VIP',
 3:'Алмазы',
 4:'Цветные алмазы',
 5:'Опыт',
 7:'Энергия',
 22:'Вода опыта',
};

export type HeroBattleStat={
 id:number;
 heroId:number;
 camp:number;
 model:string;
 statDamage?:number;
 statHurt?:number;
 statCure?:number;
};

function itemLabel(id:number){
 return ITEM_RU[id]??('Предмет '+id);
}

export function ResultScreen({report,settlement,onContinue}:{report:BattleReport;settlement:Settlement;onContinue:()=>void}){
 const win=settlement.result===1;
 const heroes=(report.heroes as HeroBattleStat[]).slice().sort((a,b)=>(b.statDamage??0)-(a.statDamage??0));
 return <section style={{marginTop:16,padding:16,borderRadius:12,background:win?'linear-gradient(160deg,#1d3b2a,#20243a)':'linear-gradient(160deg,#3b1d22,#20243a)',color:'#fff'}} aria-label={win?'Победа':'Поражение'}>
  <h2 style={{margin:'0 0 8px',fontSize:28}}>{win?'Победа':'Поражение'}</h2>
  <p style={{margin:'0 0 12px',opacity:.9}}>Этап {settlement.mapId??report.mapId} · Раундов {report.summary.rounds}{settlement.level?` · Уровень ${settlement.level}`:''}</p>
  <p style={{margin:'0 0 12px',opacity:.7,fontSize:13}}>Оригинальный WinBoard UI — отдельная задача (AUDIT-014 residual): требуется восстановление prefab/атласа SettlementWinPanel.</p>
  <h3 style={{margin:'12px 0 8px',fontSize:18}}>Награды</h3>
  {settlement.rewards.length===0
   ? <p style={{opacity:.8}}>{win?'Награды уже получены или отсутствуют':'Наград нет'}</p>
   : <ul style={{listStyle:'none',padding:0,margin:0,display:'grid',gap:6}}>{settlement.rewards.map(([id,n])=><li key={id+':'+n} style={{display:'flex',justifyContent:'space-between',background:'rgba(0,0,0,.25)',padding:'8px 12px',borderRadius:8}}><span>{itemLabel(id)}</span><strong>×{n}</strong></li>)}</ul>}
  {!!settlement.unlockedModules?.length&&<p style={{marginTop:12}}>Открыто функций: {settlement.unlockedModules.map(id=>'модуль '+id).join(', ')}</p>}
  <h3 style={{margin:'16px 0 8px',fontSize:18}}>Статистика отряда</h3>
  <div style={{overflowX:'auto'}}>
   <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
    <thead><tr><th align="left">Герой</th><th align="right">Урон</th><th align="right">Получено</th><th align="right">Лечение</th></tr></thead>
    <tbody>{heroes.filter(h=>h.camp===1).map(h=><tr key={h.id}><td>{heroDisplayName(h.heroId)}</td><td align="right">{h.statDamage??0}</td><td align="right">{h.statHurt??0}</td><td align="right">{h.statCure??0}</td></tr>)}</tbody>
   </table>
  </div>
  <button type="button" style={{marginTop:16,padding:'10px 16px'}} onClick={onContinue}>Продолжить</button>
 </section>
}
