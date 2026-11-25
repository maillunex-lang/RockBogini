import {ReportScene} from './ReportScene';
import {ResultScreen} from './ResultScreen';
import type {BattleSpeed} from './gameClock';
import {Component,useEffect,useMemo,useRef,useState,type ErrorInfo,type ReactNode} from 'react';
import {battleClient,orderedEvents,type BattleReport,type Settlement} from './reportClient';
import {canAutoSettle,canRetrySettle,nextPhaseOnResult,nextPhaseOnStart,resetSettlement,type SettlementPhase} from './settlementState';

export function ReportScreen({api,token,mapId,onBack}:{api:string;token:string;mapId:number;onBack:()=>void}){
 const client=useMemo(()=>battleClient(api,token),[api,token]);
 const [report,setReport]=useState<BattleReport|null>(null);
 const [cursor,setCursor]=useState(-1);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [result,setResult]=useState<Settlement|null>(null);
 const [settledReport,setSettledReport]=useState<BattleReport|null>(null);
 const [settlePhase,setSettlePhase]=useState<SettlementPhase>('idle');
 const [sceneReady,setSceneReady]=useState(false);
 const [volume,setVolume]=useState(0.5);
 const [auto,setAuto]=useState(true);
 const [paused,setPaused]=useState(false);
 const [speed,setSpeed]=useState<BattleSpeed>(1);
 const settleInFlight=useRef(false);
 const reportRef=useRef<BattleReport|null>(null);
 reportRef.current=report;

 useEffect(()=>{
  let active=true;setBusy(true);
  client.pending().then(r=>{if(active){setReport(r);if(r){setCursor(-1);setSettlePhase(resetSettlement())}}}).catch(e=>{if(active)setError(String(e))}).finally(()=>{if(active)setBusy(false)});
  return()=>{active=false};
 },[client]);

 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e){setError(String(e))}finally{setBusy(false)}}

 async function settleOnce(source:BattleReport){
  const next=nextPhaseOnStart(settlePhase);
  if(!next||settleInFlight.current)return;
  settleInFlight.current=true;
  setSettlePhase(next);
  setError('');
  try{
   const r=await client.settle(source.battleId);
   setSettledReport(source);
   setResult(r);
   setSettlePhase(nextPhaseOnResult(true));
   // Drop battle scene after result is staged so Pixi teardown cannot blank the tree.
   setCursor(-1);
   setReport(null);
  }catch(e){
   setSettlePhase(nextPhaseOnResult(false));
   setError(e instanceof Error?e.message:String(e));
  }finally{
   settleInFlight.current=false;
  }
 }

 const page=report?.pages[cursor],finished=!!report&&cursor===report.pages.length-1;

 useEffect(()=>{
  if(!report||busy||!sceneReady||finished||paused||(!auto&&page?.dataType===2))return;
  const t=setTimeout(()=>{setSceneReady(false);setCursor(c=>c+1)},150);
  return()=>clearTimeout(t);
 },[report,busy,sceneReady,finished,auto,paused,cursor,page]);

 useEffect(()=>{
  if(!canAutoSettle(settlePhase,!!finished,sceneReady,!!report)||!report)return;
  void settleOnce(report);
  // settleOnce intentionally omitted from deps — guarded by settlePhase + settleInFlight
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[report,finished,sceneReady,settlePhase]);

 return <section style={{padding:16,background:'#20243a',color:'white'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',alignItems:'center'}}>
  <h2 style={{margin:0}}>Кампания: серверный бой</h2>
  <button type="button" onClick={onBack}>К этапам</button>
 </div>
 <p>Автоматическое воспроизведение серверного боя.</p>
 {error&&<p role="alert">{error}</p>}
 {settlePhase==='pending'&&<p role="status">Получение награды…</p>}
 {settlePhase==='error'&&report&&canRetrySettle(settlePhase)&&<button type="button" disabled={settleInFlight.current} onClick={()=>void settleOnce(report)}>Повторить получение награды</button>}
 {!report&&!result&&settlePhase!=='pending'&&<>
  <p>Этап {mapId}</p>
  <button disabled={busy} onClick={()=>void run(async()=>{
   setSettlePhase(resetSettlement());
   setResult(null);
   setSettledReport(null);
   setPaused(false);
   setReport(await client.challenge(mapId));
   setCursor(-1);
  })}>Начать бой</button>
 </>}
 {report&&<>
  <ReportScene key={report.battleId} report={report} cursor={cursor} volume={volume} speed={speed} paused={paused} onReady={setSceneReady}/>
  <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',marginTop:8}}>
   <label>Звук <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label>
   <button type="button" onClick={()=>setPaused(p=>!p)}>{paused?'Продолжить':'Пауза'}</button>
   <button type="button" onClick={()=>setAuto(a=>!a)}>{auto?'Авто: вкл':'Авто: выкл'}</button>
   {([1,2,3] as BattleSpeed[]).map(s=><button key={s} type="button" aria-pressed={speed===s} onClick={()=>setSpeed(s)} style={{fontWeight:speed===s?700:400}}>x{s}</button>)}
  </div>
  <p>Этап {report.mapId} · {cursor+1}/{report.pages.length} · скорость x{speed}{paused?' · пауза':''}{settlePhase==='pending'?' · награда…':''}</p>
  <button disabled={auto||busy||finished||!sceneReady||paused||settlePhase==='pending'} onClick={()=>{setSceneReady(false);setCursor(c=>c+1)}}>Следующее действие</button>
  <button disabled={busy||settlePhase==='pending'} onClick={()=>void run(async()=>{await client.cancel(report.battleId);setReport(null);setCursor(-1);setSettlePhase(resetSettlement())})}>Отменить</button>
  {page&&<><p>Раунд {page.round} · {page.actor>0?"Герой "+page.actor+" · Навык "+page.skillId:page.dataType===1?"Начало раунда":page.dataType===3?"Конец раунда":"Служебное событие"}</p><ul>{orderedEvents(page).map((e,i)=><li key={i}>Удар {e.index}: цель {e.target}, событие {e.type}, значение {e.value}</li>)}</ul></>}
 </>}
 {result&&settledReport&&settlePhase==='success'&&(
  <ResultErrorBoundary onContinue={()=>{setResult(null);setSettledReport(null);setSettlePhase(resetSettlement());onBack()}}>
   <ResultScreen report={settledReport} settlement={result} onContinue={()=>{setResult(null);setSettledReport(null);setSettlePhase(resetSettlement());onBack()}}/>
  </ResultErrorBoundary>
 )}
</section>;
}

class ResultErrorBoundary extends Component<{children:ReactNode;onContinue:()=>void},{error:string|null}>{
 state={error:null as string|null};
 static getDerivedStateFromError(e:Error){return{error:e.message||'Ошибка экрана результата'}}
 componentDidCatch(e:Error,info:ErrorInfo){console.warn('ResultScreen crash',e,info)}
 render(){
  if(this.state.error){
   return <section style={{marginTop:16,padding:16,background:'#3b1d22',color:'#fff'}} role="alert">
    <h2>Победа зафиксирована</h2>
    <p>Экран результата не отрисовался: {this.state.error}</p>
    <button type="button" onClick={this.props.onContinue}>К этапам</button>
   </section>;
  }
  return this.props.children;
 }
}
