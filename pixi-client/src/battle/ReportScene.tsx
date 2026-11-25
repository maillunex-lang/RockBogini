import {lifecycleAlpha,lifecycleDuration} from './lifecycle';
import {moveDestination,motionSample,timelineIndex} from './motion';
import {fieldPosition,fieldWidth,fieldHeight,avatarScale} from './fieldLayout';
import {useEffect,useRef,useState} from 'react';
import {Application,Text,Assets,Sprite,Container} from 'pixi.js';
import {Spine} from '@pixi-spine/all-3.8';
import {acquireSkeleton} from '../assets/spineLibrary';
import {orderedEvents,type BattleReport} from './reportClient';
type Timeline={Duration:number;Events:{EventType:number;ActionName:string;StartTime:number;Duration:number;ReferenceType:number;TargetDistance:number;IsBlink:boolean;HitPointId:number;NoHurtAction:boolean}[]};
type CommonSkills={skills:Record<string,{type:number;model:string;index:number}>;models:Record<string,{Skills:Timeline[]}>};
type Model={assetId:string;name:string;texture:string;animations:string[]};
const json=async<T,>(path:string):Promise<T>=>{const r=await fetch(path);if(!r.ok)throw Error(path+' '+r.status);return r.json()};
export function ReportScene({report,cursor,onReady}:{report:BattleReport;cursor:number;onReady:(ready:boolean)=>void}){
 const host=useRef<HTMLDivElement>(null),runtime=useRef<{app:Application;units:Map<number,Spine>;models:Map<number,string>;timelines:Record<string,{Skills:Timeline[]}>;skills:Record<string,number>;common:CommonSkills}>();
 const [loaded,setLoaded]=useState(false),[status,setStatus]=useState('Загрузка боевой сцены');
 useEffect(()=>{let cancelled=false;let app:Application|undefined;const releases:(()=>void)[]=[];setLoaded(false);onReady(false);
 async function init(){
 const [catalog,timelines,skills,common]=await Promise.all([json<{models:Record<string,Model>;heroes?:Record<string,string>}>('./hero-asset-map.json'),json<Record<string,{Skills:Timeline[]}>>('./hero-animation-timelines.json'),json<Record<string,number>>('./battle-action-index.json'),json<CommonSkills>('./common-skills.json')]);
 if(cancelled)return;
 app=new Application({width:fieldWidth,height:fieldHeight,backgroundColor:0x20243a});app.ticker.maxFPS=30;const canvas=app.view as HTMLCanvasElement;canvas.style.width='100%';host.current!.appendChild(canvas);
 const bgManifest=await json<Record<string,{file:string;width:number;height:number}>>('./battle-backgrounds/manifest.json');
 const bg=bgManifest[report.background];if(!bg)throw Error('Нет оригинального фона '+report.background);
 const texture=await Assets.load('./battle-backgrounds/'+bg.file);if(cancelled)return;
 const background=new Sprite(texture);background.anchor.set(.5);background.position.set(fieldWidth/2,fieldHeight/2);background.height=2520*1.01;background.width=fieldWidth*1.01;app.stage.addChild(background);
 const actors=new Container();actors.sortableChildren=true;app.stage.addChild(actors);
 const units=new Map<number,Spine>(),models=new Map<number,string>();
 for(const h of report.heroes){
 const model=String(h.model),a=catalog.models[model];if(!a)throw Error('Нет модели '+model);
 const lease=await acquireSkeleton({id:a.assetId,name:a.name,texture:a.texture,animations:a.animations,directory:'hero-models',requiredAnimations:[]});if(cancelled){lease.release();return}releases.push(lease.release);
 const s=new Spine(lease.data),skin=lease.data.skins.find(x=>x.name==='skin1')??lease.data.skins[0];if(skin){s.skeleton.setSkin(skin);s.skeleton.setSlotsToSetupPose()}
 const idle=lease.data.animations.find(x=>x.name==='standby')??lease.data.animations[0];if(idle)s.state.setAnimation(0,idle.name,true);s.update(.1);
 const pos=fieldPosition(h.stationId,h.camp);s.scale.set(h.camp===1?avatarScale:-avatarScale,avatarScale);s.position.set(pos.x,pos.y);s.zIndex=pos.z;s.visible=h.hp>0;actors.addChild(s);units.set(h.id,s);models.set(h.id,model);
 }
 runtime.current={app,units,models,timelines,skills,common};setLoaded(true);setStatus('Сцена готова');onReady(true);
 }init().catch(e=>{if(!cancelled)setStatus(String(e))});return()=>{cancelled=true;runtime.current=undefined;app?.destroy(true,{children:true});releases.forEach(r=>r())}
 },[report]);
 useEffect(()=>{const rt=runtime.current,p=report.pages[cursor];if(!loaded||!rt||!p)return;onReady(false);let cancelled=false;const timers:ReturnType<typeof setTimeout>[]=[];const labels:Text[]=[];const frames=new Set<number>();
 const later=(ms:number,fn:()=>void)=>timers.push(setTimeout(()=>{if(!cancelled)fn()},ms));
 const anim=(s:Spine|undefined,name:string,loop=false)=>{if(s?.spineData.findAnimation(name))s.state.setAnimation(0,name,loop)};
 const actor=rt.units.get(p.actor),model=rt.models.get(p.actor),index=rt.skills[p.skillId],common=rt.common.skills[p.skillId],timeline=common?rt.common.models[common.model]?.Skills[timelineIndex(common.index)]:model===undefined?undefined:rt.timelines[model]?.Skills[timelineIndex(index)];
 const home=report.heroes.find(h=>h.id===p.actor),target=report.heroes.find(h=>h.id===p.targets[0]);
 const lifeFrames=new Map<number,number>();
 function lifecycle(id:number,type:number){
 const unit=rt!.units.get(id);if(!unit)return;
 const old=lifeFrames.get(id);if(old!==undefined){cancelAnimationFrame(old);frames.delete(old)}
 const initial=unit.alpha,start=performance.now(),length=lifecycleDuration(type);
 unit.visible=true;if(type===7)unit.alpha=0;
 const tick=(now:number)=>{const prev=lifeFrames.get(id);if(prev!==undefined)frames.delete(prev);if(cancelled)return;const elapsed=Math.min(length,now-start);unit.alpha=lifecycleAlpha(type,elapsed,initial);if(elapsed<length){const next=requestAnimationFrame(tick);lifeFrames.set(id,next);frames.add(next)}else{lifeFrames.delete(id);unit.visible=type===7;unit.alpha=1;if(type===7)anim(unit,'standby',true)}};
 const next=requestAnimationFrame(tick);lifeFrames.set(id,next);frames.add(next);
 }
 let motionFrame=0;
 function move(to:{x:number;y:number},ms:number,back:boolean,blink:boolean){
 if(!actor)return;cancelAnimationFrame(motionFrame);frames.delete(motionFrame);
 const from={x:actor.x,y:actor.y},start=performance.now();
 const tick=(now:number)=>{frames.delete(motionFrame);if(cancelled)return;const t=ms<=0?1:Math.min(1,(now-start)/ms),v=motionSample(from,to,t,back,blink);actor.position.set(v.x,v.y);actor.alpha=v.alpha;if(t<1){motionFrame=requestAnimationFrame(tick);frames.add(motionFrame)}else if(back)anim(actor,'standby',true)};
 motionFrame=requestAnimationFrame(tick);frames.add(motionFrame);
 }
 if(p.dataType===2&&timeline)for(const e of timeline.Events){
 if(e.EventType===1){later(e.StartTime,()=>anim(actor,e.ActionName));later(e.StartTime+e.Duration,()=>anim(actor,'standby',true))}
 if(e.EventType===3&&home)later(e.StartTime,()=>move(moveDestination(e.ReferenceType,target,home.camp,e.TargetDistance),e.Duration,false,e.IsBlink));
 if(e.EventType===4&&home)later(e.StartTime,()=>move(fieldPosition(home.stationId,home.camp),e.Duration,true,e.IsBlink));
 }
 const events=orderedEvents(p);let duration=timeline?.Duration??300;const fallbackTime=duration;
 for(const e of events){const hit=timeline?.Events.find(x=>x.EventType===6&&x.HitPointId===e.index),ms=hit?.StartTime??(p.dataType===2?fallbackTime:0);duration=Math.max(duration,ms+300,ms+lifecycleDuration(e.type)+50);later(ms,()=>{const t=rt.units.get(e.target);if(!t)return;if(e.type===7||e.type===27)lifecycle(e.target,e.type);if([1,2,3,21].includes(e.type)&&!hit?.NoHurtAction){anim(t,'hurt');later(200,()=>{if(!lifeFrames.has(e.target)&&t.visible)anim(t,'standby',true)})}if([1,2,3,4,5,21,22].includes(e.type)){const label=new Text(String(e.value),{fontSize:48,fill:[5,22].includes(e.type)?0x7dff91:0xffffff,stroke:0x000000,strokeThickness:3});label.anchor.set(.5);label.position.set(t.x,t.y-135);rt.app.stage.addChild(label);labels.push(label);later(300,()=>{label.visible=false})}})}
 later(duration,()=>{for(const h of p.heroStatus){const s=rt.units.get(h.id);if(s){s.visible=!h.isDead;s.alpha=1;const home=report.heroes.find(x=>x.id===h.id);if(home){const pos=fieldPosition(home.stationId,home.camp);s.position.set(pos.x,pos.y)}anim(s,'standby',true)}}setStatus('Раунд '+p.round);onReady(true)});
 return()=>{cancelled=true;timers.forEach(clearTimeout);frames.forEach(cancelAnimationFrame);labels.forEach(l=>l.destroy())};
 },[cursor,loaded,report]);
 return <><p>{status}</p><div ref={host} style={{maxWidth:360,margin:'auto'}}/></>
}
