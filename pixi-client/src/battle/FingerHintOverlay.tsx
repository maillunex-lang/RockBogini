import {useEffect,useState} from 'react';
import './fingerHint.css';

export type FingerHint={
 stepId:number;
 hintId:number;
 autoNext:boolean;
 size:number[];
 offsetY:number;
 maskType:number;
 targetKey:string|null;
};

type Hole={left:number;top:number;width:number;height:number};

function measure(targetKey:string|null):Hole|null{
 if(!targetKey)return null;
 const el=document.querySelector(`[data-guide="${targetKey}"]`) as HTMLElement|null;
 if(!el)return null;
 const r=el.getBoundingClientRect();
 if(r.width<8||r.height<8)return null;
 const pad=8;
 return {
  left:Math.max(0,r.left-pad),
  top:Math.max(0,r.top-pad),
  width:r.width+pad*2,
  height:r.height+pad*2,
 };
}

export function FingerHintOverlay({
 hint,
 index,
 total,
 onContinue,
 onSkip,
}:{hint:FingerHint;index:number;total:number;onContinue:()=>void;onSkip:()=>void}){
 const [hole,setHole]=useState<Hole|null>(()=>measure(hint.targetKey));

 useEffect(()=>{
  const update=()=>setHole(measure(hint.targetKey));
  update();
  const t=window.setTimeout(update,50);
  window.addEventListener('resize',update);
  window.addEventListener('scroll',update,true);
  return()=>{window.clearTimeout(t);window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true)};
 },[hint.stepId,hint.targetKey]);

 useEffect(()=>{
  if(!hint.targetKey||!hole)return;
  const el=document.querySelector(`[data-guide="${hint.targetKey}"]`);
  if(!el)return;
  const advance=()=>onContinue();
  el.addEventListener('click',advance,{once:true,capture:true});
  return()=>el.removeEventListener('click',advance,true);
 },[hint.stepId,hint.targetKey,hole,onContinue]);

 const w=hint.size[0]&&hint.size[0]>0?hint.size[0]:hole?.width??120;
 const h=hint.size[1]&&hint.size[1]>0?hint.size[1]:hole?.height??120;
 const fingerLeft=hole?hole.left+hole.width*0.55:window.innerWidth/2-20;
 const fingerTop=hole?hole.top+hole.height*0.65+(hint.offsetY||0):window.innerHeight/2;

 return <div className="finger-hint" role="dialog" aria-modal="true" aria-label={`Подсказка ${index+1} из ${total}`}>
  <div className="finger-hint-dim"/>
  {hole&&<div className="finger-hint-hole" style={{left:hole.left,top:hole.top,width:Math.max(hole.width,w*0.4),height:Math.max(hole.height,h*0.4)}}/>}
  <div className="finger-hint-pointer" style={{left:fingerLeft,top:fingerTop}} aria-hidden="true"/>
  <div className="finger-hint-bar">
   <p>Подсказка {index+1}/{total}{hint.targetKey?` · ${hint.targetKey}`:''}{!hole?' · нажмите Далее':''}</p>
   <div>
    <button type="button" onClick={onSkip}>Пропустить</button>
    <button type="button" className="finger-hint-next" onClick={onContinue}>Далее</button>
   </div>
  </div>
 </div>;
}
