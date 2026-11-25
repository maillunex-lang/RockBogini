import {useEffect,useMemo,useState} from 'react';
import {battleClient,orderedEvents,type BattleReport,type Settlement} from './reportClient';
export function ReportScreen({api,token}:{api:string;token:string}){
 const client=useMemo(()=>battleClient(api,token),[api,token]);
 const [report,setReport]=useState<BattleReport|null>(null),[cursor,setCursor]=useState(-1),[busy,setBusy]=useState(true),[error,setError]=useState(''),[result,setResult]=useState<Settlement|null>(null),[stage,setStage]=useState(100101);
 useEffect(()=>{let active=true;client.pending().then(r=>{if(active)setReport(r)}).catch(e=>{if(active)setError(String(e))}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[client]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e){setError(String(e))}finally{setBusy(false)}}
 const page=report?.pages[cursor],finished=!!report&&cursor===report.pages.length-1;
 return <section style={{padding:16,background:'#20243a',color:'white'}}><h2>Кампания: серверный бой</h2><p>Технический просмотр отчёта. Графическая сцена подключается следующим этапом.</p>{error&&<p role="alert">{error}</p>}
 {!report&&<><label>Этап <input type="number" value={stage} onChange={e=>setStage(Number(e.target.value))}/></label><button disabled={busy} onClick={()=>void run(async()=>{setReport(await client.challenge(stage));setCursor(-1);setResult(null)})}>Начать бой</button></>}
 {report&&<><p>Этап {report.mapId} · {cursor+1}/{report.pages.length}</p><button disabled={busy||finished} onClick={()=>setCursor(c=>c+1)}>Следующее событие</button><button disabled={busy} onClick={()=>void run(async()=>{await client.cancel(report.battleId);setReport(null);setCursor(-1)})}>Отменить</button>
 {page&&<><p>Раунд {page.round} · Герой {page.actor} · Навык {page.skillId}</p><ul>{orderedEvents(page).map((e,i)=><li key={i}>Удар {e.index}: цель {e.target}, событие {e.type}, значение {e.value}</li>)}</ul><ul>{page.heroStatus.map(h=><li key={h.id}>Герой {h.id}: {h.hp}/{h.hpMax} HP</li>)}</ul></>}
 <button disabled={busy||!finished} onClick={()=>void run(async()=>{const r=await client.settle(report.battleId);setResult(r);setStage(r.stage);setReport(null);setCursor(-1)})}>Получить результат</button></>}
 {result&&<p>{result.result===1?'Победа':'Поражение'} · Награды: {result.rewards.map(([id,n])=>id+': '+n).join(', ')||'нет'}</p>}</section>
}
