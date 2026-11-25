import {createHud} from './hud';
import {lifecycleAlpha,lifecycleDuration} from './lifecycle';
import {moveDestination,motionSample,timelineIndex} from './motion';
import {fieldPosition,fieldWidth,fieldHeight,avatarScale} from './fieldLayout';
import {useEffect,useRef,useState} from 'react';
import {Application,Text,Assets,Sprite,Container,Graphics} from 'pixi.js';
import {Spine} from '@pixi-spine/all-3.8';
import {acquireSkeleton,type Asset} from '../assets/spineLibrary';
import {orderedEvents,type BattleReport} from './reportClient';
type Timeline={Duration:number;Events:{EventType:number;ActionName:string;StartTime:number;Duration:number;ReferenceType:number;TargetDistance:number;IsBlink:boolean;HitPointId:number;NoHurtAction:boolean;OffsetX:number;OffsetY:number;ShowAtBottom:boolean}[]};
type CommonSkills={skills:Record<string,{type:number;model:string;index:number}>;models:Record<string,{Skills:Timeline[]}>};
type Effects={assets:Record<string,Asset>;models:Record<string,{effects:Record<string,{assetId?:string;animation?:string}>}>};
type Model={assetId:string;name:string;texture:string;animations:string[]};
const json=async<T,>(path:string):Promise<T>=>{const r=await fetch(path);if(!r.ok)throw Error(path+' '+r.status);return r.json()};
export function ReportScene({report,cursor,onReady,volume=0.5}:{report:BattleReport;cursor:number;volume?:number;onReady:(ready:boolean)=>void}){
 const volumeRef=useRef(volume);volumeRef.current=volume;
 const host=useRef<HTMLDivElement>(null),runtime=useRef<{app:Application;units:Map<number,Spine>;models:Map<number,string>;timelines:Record<string,{Skills:Timeline[]}>;skills:Record<string,number>;common:CommonSkills;effects:Effects;bottom:Container;top:Container;mask:Graphics;huds:Map<number,ReturnType<typeof createHud>>;sounds:Record<string,Record<string,string>>}>();
 const [loaded,setLoaded]=useState(false),[status,setStatus]=useState('Загрузка боевой сцены');
 useEffect(()=>{let cancelled=false;let app:Application|undefined;const releases:(()=>void)[]=[];setLoaded(false);onReady(false);
 async function init(){
 const [catalog,timelines,skills,common,effects,sounds]=await Promise.all([json<{models:Record<string,Model>;heroes?:Record<string,string>}>('./hero-asset-map.json'),json<Record<string,{Skills:Timeline[]}>>('./hero-animation-timelines.json'),json<Record<string,number>>('./battle-action-index.json'),json<CommonSkills>('./common-skills.json'),json<Effects>('./skill-effect-map.json'),json<Record<string,Record<string,string>>>('./battle-sounds/manifest.json')]);
 if(cancelled)return;
 app=new Application({width:fieldWidth,height:fieldHeight,backgroundColor:0x20243a});app.ticker.maxFPS=30;const canvas=app.view as HTMLCanvasElement;canvas.style.width='100%';host.current!.appendChild(canvas);
 const bgManifest=await json<Record<string,{file:string;width:number;height:number}>>('./battle-backgrounds/manifest.json');
 const bg=bgManifest[report.background];if(!bg)throw Error('Нет оригинального фона '+report.background);
 const texture=await Assets.load('./battle-backgrounds/'+bg.file);if(cancelled)return;
 const background=new Sprite(texture);background.anchor.set(.5);background.position.set(fieldWidth/2,fieldHeight/2);background.height=2520*1.01;background.width=fieldWidth*1.01;app.stage.addChild(background);const mask=new Graphics();mask.beginFill(0x000000).drawRect(-20,-20,fieldWidth+40,fieldHeight+40).endFill();mask.alpha=0;app.stage.addChild(mask);
 const actors=new Container(),bottom=new Container(),top=new Container();actors.sortableChildren=true;app.stage.addChild(bottom,actors,top);
 const units=new Map<number,Spine>(),models=new Map<number,string>(),huds=new Map<number,ReturnType<typeof createHud>>();const hudLayer=new Container();app.stage.addChild(hudLayer);
 for(const h of report.heroes){
 const model=String(h.model),a=catalog.models[model];if(!a)throw Error('Нет модели '+model);
 const lease=await acquireSkeleton({id:a.assetId,name:a.name,texture:a.texture,animations:a.animations,directory:'hero-models',requiredAnimations:[]});if(cancelled){lease.release();return}releases.push(lease.release);
 const s=new Spine(lease.data),skin=lease.data.skins.find(x=>x.name==='skin1')??lease.data.skins[0];if(skin){s.skeleton.setSkin(skin);s.skeleton.setSlotsToSetupPose()}
 const idle=lease.data.animations.find(x=>x.name==='standby')??lease.data.animations[0];if(idle)s.state.setAnimation(0,idle.name,true);s.update(.1);
 const pos=fieldPosition(h.stationId,h.camp);s.scale.set(h.camp===1?avatarScale:-avatarScale,avatarScale);s.position.set(pos.x,pos.y);s.zIndex=pos.z;s.visible=h.hp>0;actors.addChild(s);units.set(h.id,s);models.set(h.id,model);if(h.stationId>=0){const hud=createHud(h.camp,h);hudLayer.addChild(hud.root);huds.set(h.id,hud);hud.root.position.set(s.x,s.y-175)}
 }
 app.ticker.add(()=>{for(const [id,hud] of huds){const unit=units.get(id);if(unit){hud.root.position.set(unit.x,unit.y-175);hud.root.visible=unit.visible}}});
 runtime.current={app,units,models,huds,timelines,skills,common,effects,bottom,top,mask,sounds};setLoaded(true);setStatus('Сцена готова');onReady(true);
 }init().catch(e=>{if(!cancelled)setStatus(String(e))});return()=>{cancelled=true;runtime.current=undefined;app?.destroy(true,{children:true});releases.forEach(r=>r())}
 },[report]);
 useEffect(()=>{const rt=runtime.current!,p=report.pages[cursor];if(!loaded||!rt||!p)return;onReady(false);let cancelled=false;const timers:ReturnType<typeof setTimeout>[]=[];const labels:Text[]=[];const frames=new Set<number>();
 const later=(ms:number,fn:()=>void)=>timers.push(setTimeout(()=>{if(!cancelled)fn()},ms));
 const anim=(s:Spine|undefined,name:string,loop=false)=>{if(s?.spineData.findAnimation(name))s.state.setAnimation(0,name,loop)};
 const actor=rt.units.get(p.actor),model=rt.models.get(p.actor),index=rt.skills[p.skillId],common=rt.common.skills[p.skillId],timeline=common?rt.common.models[common.model]?.Skills[timelineIndex(common.index)]:model===undefined?undefined:rt.timelines[model]?.Skills[timelineIndex(index)];
 const home=report.heroes.find(h=>h.id===p.actor),target=report.heroes.find(h=>h.id===p.targets[0]);
 const playing=new Set<HTMLAudioElement>();
 const activeEffects=new Set<Spine>(),effectReleases:(()=>void)[]=[];
 const effectEvents=timeline?.Events.filter(e=>[2,6,7,8].includes(e.EventType)&&e.ActionName&&e.Duration>0)??[];
 const prepared=new Map<string,{data:Awaited<ReturnType<typeof acquireSkeleton>>['data'];name:string}>();
 async function prepareEffects(){
 await Promise.all([...new Set(effectEvents.map(e=>e.ActionName))].map(async name=>{
 const mapping=rt!.effects.models[common?.model??model??'']?.effects[name],asset=mapping?.assetId?rt!.effects.assets[mapping.assetId]:undefined;
 if(!asset)return;
 try{const lease=await acquireSkeleton({...asset,directory:'skill-effects',requiredAnimations:[]});if(cancelled){lease.release();return}effectReleases.push(lease.release);const animation=mapping?.animation??name;if(lease.data.findAnimation(animation))prepared.set(name,{data:lease.data,name:animation})}catch(e){console.warn('Battle effect unavailable',name,e)}
 }));
 }
 function showEffect(e:Timeline['Events'][number],unit:Spine|undefined,camp:number){
 const asset=prepared.get(e.ActionName);if(!asset)return;
 const fx=new Spine(asset.data);const skin=asset.data.skins[0];if(skin){fx.skeleton.setSkin(skin);fx.skeleton.setSlotsToSetupPose()}
 const base=unit??{x:fieldWidth/2,y:fieldHeight/2+260};
 fx.position.set(base.x+e.OffsetX*avatarScale*camp,base.y-e.OffsetY*avatarScale);fx.scale.set(avatarScale*camp,avatarScale);
 fx.state.setAnimation(0,asset.name,false);(e.ShowAtBottom?rt!.bottom:rt!.top).addChild(fx);activeEffects.add(fx);
 later(e.Duration,()=>{activeEffects.delete(fx);fx.destroy({children:true})});
 }
 function bullet(e:Timeline['Events'][number],target:Spine|undefined){
 const asset=prepared.get(e.ActionName);if(!asset||!actor||!target)return;
 const fx=new Spine(asset.data),skin=asset.data.skins[0];if(skin){fx.skeleton.setSkin(skin);fx.skeleton.setSlotsToSetupPose()}
 const from={x:actor.x+e.OffsetX*avatarScale*(home?.camp??1),y:actor.y-e.OffsetY*avatarScale};
 const to={x:target.x,y:target.y-90};fx.position.set(from.x,from.y);fx.scale.set(avatarScale);fx.rotation=Math.atan2(to.y-from.y,to.x-from.x);
 fx.state.setAnimation(0,asset.name,true);(e.ShowAtBottom?rt.bottom:rt.top).addChild(fx);activeEffects.add(fx);
 const start=performance.now();let frame=0;
 const tick=(now:number)=>{frames.delete(frame);if(cancelled||!activeEffects.has(fx))return;const t=Math.min(1,(now-start)/e.Duration);fx.position.set(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t);if(t<1){frame=requestAnimationFrame(tick);frames.add(frame)}else{activeEffects.delete(fx);fx.destroy({children:true})}};
 frame=requestAnimationFrame(tick);frames.add(frame);
 }
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
 const screenFrames=new Map<string,number>();
 function screen(e:Timeline['Events'][number]){
 const name=e.ActionName;if(!['dark_screen','shock_screen'].includes(name)||e.Duration<=0)return;
 const old=screenFrames.get(name);if(old!==undefined){cancelAnimationFrame(old);frames.delete(old)}
 const start=performance.now(),length=name==='dark_screen'?Math.max(400,e.Duration):e.Duration;
 let frame=0;
 const tick=(now:number)=>{frames.delete(frame);if(cancelled)return;const t=Math.min(length,now-start);
 if(name==='dark_screen')rt.mask.alpha=190/255*Math.min(1,t/200,(length-t)/200);
 else if(t<length){const step=Math.floor(t/30),f=(t%30)/30;rt.app.stage.position.set(Math.sin(step*2.4)*3,6*(step%2?1:-1)*(1-2*f))}
 if(t<length){frame=requestAnimationFrame(tick);screenFrames.set(name,frame);frames.add(frame)}else{screenFrames.delete(name);if(name==='dark_screen')rt.mask.alpha=0;else rt.app.stage.position.set(0,0)}
 };frame=requestAnimationFrame(tick);screenFrames.set(name,frame);frames.add(frame);
 }
 async function play(){await prepareEffects();if(cancelled)return;
 if(p.dataType===2&&timeline)for(const e of timeline.Events){
 if([2,6,7,8].includes(e.EventType)&&e.ActionName&&e.Duration>0)later(e.StartTime,()=>{
 if(e.EventType===7){for(const id of new Set(p.targets))bullet(e,rt.units.get(id))}
 else if(e.EventType===6){for(const id of new Set(p.events.filter(h=>h.index===e.HitPointId&&h.type<=20).map(h=>h.target))){const h=report.heroes.find(x=>x.id===id);showEffect(e,rt.units.get(id),-(h?.camp??-1))}}
 else if(e.EventType===8||e.ReferenceType===1)showEffect(e,actor,home?.camp??1);
 else showEffect(e,e.ReferenceType===3?rt.units.get(p.targets[0]):undefined,-(target?.camp??-1));
 });
 if(e.EventType===5)later(e.StartTime,()=>{const file=rt.sounds[common?.model??model??'']?.[e.ActionName];if(!file||volumeRef.current<=0)return;const a=new Audio('./battle-sounds/'+file);a.volume=volumeRef.current;playing.add(a);a.onended=()=>playing.delete(a);void a.play().catch(()=>playing.delete(a))});
 if(e.EventType===9)later(e.StartTime,()=>screen(e));
 if(e.EventType===1){later(e.StartTime,()=>anim(actor,e.ActionName));later(e.StartTime+e.Duration,()=>anim(actor,'standby',true))}
 if(e.EventType===3&&home)later(e.StartTime,()=>move(moveDestination(e.ReferenceType,target,home.camp,e.TargetDistance),e.Duration,false,e.IsBlink));
 if(e.EventType===4&&home)later(e.StartTime,()=>move(fieldPosition(home.stationId,home.camp),e.Duration,true,e.IsBlink));
 }
 const events=orderedEvents(p);let duration=Math.max(timeline?.Duration??300,...effectEvents.map(e=>e.StartTime+e.Duration),...(timeline?.Events.filter(e=>e.EventType===9).map(e=>e.StartTime+Math.max(e.ActionName==='dark_screen'?400:0,e.Duration))??[]));const fallbackTime=duration;
 for(const e of events){const hit=timeline?.Events.find(x=>x.EventType===6&&x.HitPointId===e.index),ms=hit?.StartTime??(p.dataType===2?fallbackTime:0);duration=Math.max(duration,ms+300,ms+lifecycleDuration(e.type)+50);later(ms,()=>{const t=rt.units.get(e.target);if(!t)return;rt.huds.get(e.target)?.event(e);if(e.type===7||e.type===27)lifecycle(e.target,e.type);if([1,2,3,21].includes(e.type)&&!hit?.NoHurtAction){anim(t,'hurt');later(200,()=>{if(!lifeFrames.has(e.target)&&t.visible)anim(t,'standby',true)})}if([1,2,3,4,5,21,22].includes(e.type)){const label=new Text(([5,22].includes(e.type)?"+":e.type===3?"КРИТ ":"")+String(e.value),{fontSize:e.type===3?62:48,fill:[5,22].includes(e.type)?0x7dff91:e.type===3?0xffd166:e.type===4?0x8ad9ff:0xffffff,stroke:0x000000,strokeThickness:3});label.anchor.set(.5);label.position.set(t.x,t.y-135);rt.app.stage.addChild(label);labels.push(label);later(300,()=>{label.visible=false})}})}
 later(duration,()=>{for(const h of p.heroStatus){rt.huds.get(h.id)?.set(h);const s=rt.units.get(h.id);if(s){s.visible=!h.isDead;s.alpha=1;const home=report.heroes.find(x=>x.id===h.id);if(home){const pos=fieldPosition(home.stationId,home.camp);s.position.set(pos.x,pos.y)}anim(s,'standby',true)}}setStatus('Раунд '+p.round);onReady(true)});
 }void play();
 return()=>{cancelled=true;playing.forEach(a=>{a.pause();a.src=''});if(!rt.mask.destroyed)rt.mask.alpha=0;if(!rt.app.stage.destroyed)rt.app.stage.position.set(0,0);activeEffects.forEach(f=>f.destroy({children:true}));effectReleases.forEach(r=>r());timers.forEach(clearTimeout);frames.forEach(cancelAnimationFrame);labels.forEach(l=>l.destroy())};
 },[cursor,loaded,report]);
 return <><p>{status}</p><div ref={host} style={{maxWidth:360,margin:'auto'}}/></>
}
