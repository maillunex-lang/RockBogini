import {ReportScene} from './ReportScene';
import {useEffect,useMemo,useState} from 'react';
import {battleClient,orderedEvents,type BattleReport,type Settlement} from './reportClient';
export function ReportScreen({api,token}:{api:string;token:string}){
 const client=useMemo(()=>battleClient(api,token),[api,token]);
 const [report,setReport]=useState<BattleReport|null>(null),[cursor,setCursor]=useState(-1),[busy,setBusy]=useState(true),[error,setError]=useState(''),[result,setResult]=useState<Settlement|null>(null),[stage,setStage]=useState(100101);
 useEffect(()=>{let active=true;client.pending().then(r=>{if(active)setReport(r)}).catch(e=>{if(active)setError(String(e))}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[client]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e){setError(String(e))}finally{setBusy(false)}}
 const [sceneReady,setSceneReady]=useState(false);
 const [auto,setAuto]=useState(true);
 const page=report?.pages[cursor],finished=!!report&&cursor===report.pages.length-1;
 useEffect(()=>{if(!report||busy||!sceneReady||finished||(!auto&&page?.dataType===2))return;const t=setTimeout(()=>{setSceneReady(false);setCursor(c=>c+1)},150);return()=>clearTimeout(t)},[report,busy,sceneReady,finished,auto,cursor,page]);
 return <section style={{padding:16,background:'#20243a',color:'white'}}><h2>Кампания: серверный бой</h2><p>Автоматическое воспроизведение серверного боя.</p>{error&&<p role="alert">{error}</p>}
 {!report&&<><label>Этап <input type="number" value={stage} onChange={e=>setStage(Number(e.target.value))}/></label><button disabled={busy} onClick={()=>void run(async()=>{setReport(await client.challenge(stage));setCursor(-1);setResult(null)})}>Начать бой</button></>}
 {report&&<><ReportScene key={report.battleId} report={report} cursor={cursor} onReady={setSceneReady}/><p>Этап {report.mapId} · {cursor+1}/{report.pages.length}</p><button onClick={()=>setAuto(a=>!a)}>{auto?"Пауза":"Продолжить"}</button><button disabled={auto||busy||finished||!sceneReady} onClick={()=>{setSceneReady(false);setCursor(c=>c+1)}}>Следующее действие</button><button disabled={busy} onClick={()=>void run(async()=>{await client.cancel(report.battleId);setReport(null);setCursor(-1)})}>Отменить</button>
 {page&&<><p>Раунд {page.round} · {page.actor>0?"Герой "+page.actor+" · Навык "+page.skillId:page.dataType===1?"Начало раунда":page.dataType===3?"Конец раунда":"Служебное событие"}</p><ul>{orderedEvents(page).map((e,i)=><li key={i}>Удар {e.index}: цель {e.target}, событие {e.type}, значение {e.value}</li>)}</ul><ul>{page.heroStatus.map(h=><li key={h.id}>Герой {h.id}: {h.hp}/{h.hpMax} HP</li>)}</ul></>}
 <button disabled={busy||!finished||!sceneReady} onClick={()=>void run(async()=>{const r=await client.settle(report.battleId);setResult(r);setStage(r.stage);setReport(null);setCursor(-1)})}>Получить результат</button></>}
 {result&&<p>{result.result===1?'Победа':'Поражение'} · Награды: {result.rewards.map(([id,n])=>id+': '+n).join(', ')||'нет'}</p>}</section>
}
