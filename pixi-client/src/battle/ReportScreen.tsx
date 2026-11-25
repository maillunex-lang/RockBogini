import {ReportScene} from './ReportScene';
import {ResultScreen} from './ResultScreen';
import type {BattleSpeed} from './gameClock';
import {useEffect,useMemo,useState} from 'react';
import {battleClient,orderedEvents,type BattleReport,type Settlement} from './reportClient';
export function ReportScreen({api,token}:{api:string;token:string}){
 const client=useMemo(()=>battleClient(api,token),[api,token]);
 const [report,setReport]=useState<BattleReport|null>(null),[cursor,setCursor]=useState(-1),[busy,setBusy]=useState(true),[error,setError]=useState(''),[result,setResult]=useState<Settlement|null>(null),[stage,setStage]=useState(100101),[settledReport,setSettledReport]=useState<BattleReport|null>(null);
 useEffect(()=>{let active=true;client.pending().then(r=>{if(active)setReport(r)}).catch(e=>{if(active)setError(String(e))}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[client]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e){setError(String(e))}finally{setBusy(false)}}
 const [sceneReady,setSceneReady]=useState(false);
 const [volume,setVolume]=useState(0.5);
 const [auto,setAuto]=useState(true);
 const [paused,setPaused]=useState(false);
 const [speed,setSpeed]=useState<BattleSpeed>(1);
 const page=report?.pages[cursor],finished=!!report&&cursor===report.pages.length-1;
 useEffect(()=>{if(!report||busy||!sceneReady||finished||paused||(!auto&&page?.dataType===2))return;const t=setTimeout(()=>{setSceneReady(false);setCursor(c=>c+1)},150);return()=>clearTimeout(t)},[report,busy,sceneReady,finished,auto,paused,cursor,page]);
 useEffect(()=>{if(!report||!finished||!sceneReady||busy||result)return;void run(async()=>{const r=await client.settle(report.battleId);setSettledReport(report);setResult(r);setStage(r.stage);setReport(null);setCursor(-1)})},[report,finished,sceneReady,busy,result,client]);
 return <section style={{padding:16,background:'#20243a',color:'white'}}><h2>Кампания: серверный бой</h2><p>Автоматическое воспроизведение серверного боя.</p>{error&&<p role="alert">{error}</p>}
 {!report&&!result&&<><label>Этап <input type="number" value={stage} onChange={e=>setStage(Number(e.target.value))}/></label><button disabled={busy} onClick={()=>void run(async()=>{setReport(await client.challenge(stage));setCursor(-1);setResult(null);setSettledReport(null);setPaused(false)})}>Начать бой</button></>}
 {report&&<><ReportScene key={report.battleId} report={report} cursor={cursor} volume={volume} speed={speed} paused={paused} onReady={setSceneReady}/>
 <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',marginTop:8}}>
 <label>Звук <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label>
 <button type="button" onClick={()=>setPaused(p=>!p)}>{paused?'Продолжить':'Пауза'}</button>
 <button type="button" onClick={()=>setAuto(a=>!a)}>{auto?'Авто: вкл':'Авто: выкл'}</button>
 {([1,2,3] as BattleSpeed[]).map(s=><button key={s} type="button" aria-pressed={speed===s} onClick={()=>setSpeed(s)} style={{fontWeight:speed===s?700:400}}>x{s}</button>)}
 </div>
 <p>Этап {report.mapId} · {cursor+1}/{report.pages.length} · скорость x{speed}{paused?' · пауза':''}</p>
 <button disabled={auto||busy||finished||!sceneReady||paused} onClick={()=>{setSceneReady(false);setCursor(c=>c+1)}}>Следующее действие</button>
 <button disabled={busy} onClick={()=>void run(async()=>{await client.cancel(report.battleId);setReport(null);setCursor(-1)})}>Отменить</button>
 {page&&<><p>Раунд {page.round} · {page.actor>0?"Герой "+page.actor+" · Навык "+page.skillId:page.dataType===1?"Начало раунда":page.dataType===3?"Конец раунда":"Служебное событие"}</p><ul>{orderedEvents(page).map((e,i)=><li key={i}>Удар {e.index}: цель {e.target}, событие {e.type}, значение {e.value}</li>)}</ul></>}
 </>}
 {result&&settledReport&&<ResultScreen report={settledReport} settlement={result} onContinue={()=>{setResult(null);setSettledReport(null)}}/>}
</section>
}
