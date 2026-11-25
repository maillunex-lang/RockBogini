import {createHud} from './hud';
import {createFloatText,floatKindForEvent} from './floatText';
import {loadBattleHudAssets,hudPixelOffset,type BattleHudAssets} from './hudAssets';
import {createGameClock,type BattleSpeed,type GameClock} from './gameClock';
import {lifecycleAlpha,lifecycleDuration} from './lifecycle';
import {moveDestination,motionSample,timelineIndex} from './motion';
import {fieldPosition,fieldWidth,fieldHeight,avatarScale} from './fieldLayout';
import {useEffect,useRef,useState} from 'react';
import {Application,Assets,Sprite,Container,Graphics} from 'pixi.js';
import {Spine} from '@pixi-spine/all-3.8';
import {acquireSkeleton,type Asset} from '../assets/spineLibrary';
import {orderedEvents,type BattleReport} from './reportClient';
type Timeline={Duration:number;Events:{EventType:number;ActionName:string;StartTime:number;Duration:number;ReferenceType:number;TargetDistance:number;IsBlink:boolean;HitPointId:number;NoHurtAction:boolean;OffsetX:number;OffsetY:number;ShowAtBottom:boolean}[]};
type CommonSkills={skills:Record<string,{type:number;model:string;index:number}>;models:Record<string,{Skills:Timeline[]}>};
type Effects={assets:Record<string,Asset>;models:Record<string,{effects:Record<string,{assetId?:string;animation?:string}>}>};
type Model={assetId:string;name:string;texture:string;textures?:string[];textureCount?:number;animations:string[]};
const json=async<T,>(path:string):Promise<T>=>{const r=await fetch(path);if(!r.ok)throw Error(path+' '+r.status);return r.json()};
export function ReportScene({report,cursor,onReady,volume=0.5,speed=1,paused=false}:{report:BattleReport;cursor:number;volume?:number;speed?:BattleSpeed;paused?:boolean;onReady:(ready:boolean)=>void}){
 const volumeRef=useRef(volume);volumeRef.current=volume;
 const host=useRef<HTMLDivElement>(null),runtime=useRef<{app:Application;units:Map<number,Spine>;models:Map<number,string>;timelines:Record<string,{Skills:Timeline[]}>;skills:Record<string,number>;common:CommonSkills;effects:Effects;bottom:Container;top:Container;mask:Graphics;huds:Map<number,ReturnType<typeof createHud>>;hudAssets:BattleHudAssets;sounds:Record<string,Record<string,string>>;clock:GameClock;audio:Set<HTMLAudioElement>;effectsLive:Set<Spine>;floatsLive:Set<Container>}>();
 const [loaded,setLoaded]=useState(false),[status,setStatus]=useState('Загрузка боевой сцены');
 useEffect(()=>{let cancelled=false;let app:Application|undefined;const releases:(()=>void)[]=[];setLoaded(false);onReady(false);
 async function init(){
 const [catalog,timelines,skills,common,effects,sounds,hudAssets]=await Promise.all([json<{models:Record<string,Model>;heroes?:Record<string,string>}>('./hero-asset-map.json'),json<Record<string,{Skills:Timeline[]}>>('./hero-animation-timelines.json'),json<Record<string,number>>('./battle-action-index.json'),json<CommonSkills>('./common-skills.json'),json<Effects>('./skill-effect-map.json'),json<Record<string,Record<string,string>>>('./battle-sounds/manifest.json'),loadBattleHudAssets()]);
 if(cancelled)return;
 app=new Application({width:fieldWidth,height:fieldHeight,backgroundColor:0x20243a});app.ticker.maxFPS=30;const canvas=app.view as HTMLCanvasElement;canvas.style.width='100%';host.current!.appendChild(canvas);
 const bgManifest=await json<Record<string,{file:string;width:number;height:number}>>('./battle-backgrounds/manifest.json');
 const bg=bgManifest[report.background];if(!bg)throw Error('Нет оригинального фона '+report.background);
 const texture=await Assets.load('./battle-backgrounds/'+bg.file);if(cancelled){releases.forEach(r=>r());return}
 const background=new Sprite(texture);background.anchor.set(.5);background.position.set(fieldWidth/2,fieldHeight/2);background.height=2520*1.01;background.width=fieldWidth*1.01;app.stage.addChild(background);const mask=new Graphics();mask.beginFill(0x000000).drawRect(-20,-20,fieldWidth+40,fieldHeight+40).endFill();mask.alpha=0;app.stage.addChild(mask);
 const actors=new Container(),bottom=new Container(),top=new Container();actors.sortableChildren=true;app.stage.addChild(bottom,actors,top);
 const units=new Map<number,Spine>(),models=new Map<number,string>(),huds=new Map<number,ReturnType<typeof createHud>>();const hudLayer=new Container();app.stage.addChild(hudLayer);
 const clock=createGameClock(speed);clock.setPaused(paused);
 const audio=new Set<HTMLAudioElement>(),effectsLive=new Set<Spine>(),floatsLive=new Set<Container>();
 for(const h of report.heroes){
 const model=String(h.model),a=catalog.models[model];if(!a)throw Error('Нет модели '+model);
 const textures=a.textures??(a.textureCount&&a.textureCount>1?Array.from({length:a.textureCount},(_,i)=>'texture'+i+'.png'):undefined);
 const lease=await acquireSkeleton({id:a.assetId,name:a.name,texture:a.texture,textures,animations:a.animations,directory:'hero-models',requiredAnimations:[]});if(cancelled){lease.release();releases.forEach(r=>r());return}releases.push(lease.release);
 const s=new Spine(lease.data),skin=lease.data.skins.find(x=>x.name==='skin1')??lease.data.skins[0];if(skin){s.skeleton.setSkin(skin);s.skeleton.setSlotsToSetupPose()}
 const idle=lease.data.animations.find(x=>x.name==='standby')??lease.data.animations[0];if(idle)s.state.setAnimation(0,idle.name,true);s.update(.1);s.state.timeScale=clock.rate();
 const pos=fieldPosition(h.stationId,h.camp);s.scale.set(h.camp===1?avatarScale:-avatarScale,avatarScale);s.position.set(pos.x,pos.y);s.zIndex=pos.z;s.visible=h.hp>0;actors.addChild(s);units.set(h.id,s);models.set(h.id,model);
 if(h.stationId>=0){
  const offsetY=hudPixelOffset(h.heroId,hudAssets.offsets);
  const hud=createHud(h.camp,{id:h.id,hp:h.hp,hpMax:h.hpMax,isDead:h.isDead??h.hp<=0,buffs:h.buffs??[]},hudAssets,offsetY);hudLayer.addChild(hud.root);huds.set(h.id,hud);hud.root.position.set(s.x,s.y-offsetY);
 }
 }
 app.ticker.add(()=>{for(const [id,hud] of huds){const unit=units.get(id);if(unit&&!unit.destroyed){hud.root.position.set(unit.x,unit.y-hud.offsetY);hud.root.visible=unit.visible}}});
 runtime.current={app,units,models,huds,hudAssets,timelines,skills,common,effects,bottom,top,mask,sounds,clock,audio,effectsLive,floatsLive};setLoaded(true);setStatus('Сцена готова');onReady(true);
 }init().catch(e=>{releases.forEach(r=>r());releases.length=0;if(app){app.destroy(true,{children:true});app=undefined}if(!cancelled){setLoaded(false);setStatus(String(e));onReady(false)}});return()=>{cancelled=true;const rt=runtime.current;if(rt){rt.clock.clear();for(const a of rt.audio){a.pause();a.src=''}rt.audio.clear();for(const f of rt.floatsLive){if(!f.destroyed)f.destroy({children:true})}rt.floatsLive.clear()}runtime.current=undefined;app?.destroy(true,{children:true});releases.forEach(r=>r())};
 },[report]);
 useEffect(()=>{const rt=runtime.current;if(!rt)return;rt.clock.setSpeed(speed);rt.clock.setPaused(paused);const rate=rt.clock.rate();
 for(const s of rt.units.values())s.state.timeScale=rate;
 for(const fx of rt.effectsLive)fx.state.timeScale=rate;
 for(const a of rt.audio){a.playbackRate=Math.max(0.5,speed);if(paused)a.pause();else void a.play().catch(()=>{})}
 },[speed,paused,loaded]);
 useEffect(()=>{const rt=runtime.current;if(!rt)return;for(const a of rt.audio)a.volume=volume},[volume,loaded]);
 useEffect(()=>{const rt=runtime.current!,p=report.pages[cursor];if(!loaded||!rt||!p)return;onReady(false);let cancelled=false;const cleanups:(()=>void)[]=[];
 const clock=rt.clock;clock.clear();
 const later=(ms:number,fn:()=>void)=>cleanups.push(clock.later(ms,()=>{if(!cancelled)fn()}));
 const anim=(s:Spine|undefined,name:string,loop=false)=>{if(s?.spineData.findAnimation(name)){s.state.setAnimation(0,name,loop);s.state.timeScale=clock.rate()}};
 const actor=rt.units.get(p.actor),model=rt.models.get(p.actor),index=rt.skills[p.skillId],common=rt.common.skills[p.skillId];
 const commonModel=common?rt.common.models[common.model]:undefined;
 const commonIdx=common?timelineIndex(common.index,commonModel?.Skills.length): -1;
 const heroIdx=model===undefined? -1:timelineIndex(index,rt.timelines[model]?.Skills.length);
 const timeline=common&&commonIdx>=0?commonModel?.Skills[commonIdx]:heroIdx>=0?rt.timelines[model!]?.Skills[heroIdx]:undefined;
 const home=report.heroes.find(h=>h.id===p.actor),target=report.heroes.find(h=>h.id===p.targets[0]);
 const effectEvents=timeline?.Events.filter(e=>[2,6,7,8].includes(e.EventType)&&e.ActionName&&e.Duration>0)??[];
 const prepared=new Map<string,{data:Awaited<ReturnType<typeof acquireSkeleton>>['data'];name:string}>();
 const effectReleases:(()=>void)[]=[];
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
 fx.state.setAnimation(0,asset.name,false);fx.state.timeScale=clock.rate();(e.ShowAtBottom?rt!.bottom:rt!.top).addChild(fx);rt.effectsLive.add(fx);
 later(e.Duration,()=>{rt.effectsLive.delete(fx);fx.destroy({children:true})});
 }
 function bullet(e:Timeline['Events'][number],target:Spine|undefined,targetId?:number){
 const asset=prepared.get(e.ActionName);if(!asset||!actor||!target)return;
 const fx=new Spine(asset.data),skin=asset.data.skins[0];if(skin){fx.skeleton.setSkin(skin);fx.skeleton.setSlotsToSetupPose()}
 const from={x:actor.x+e.OffsetX*avatarScale*(home?.camp??1),y:actor.y-e.OffsetY*avatarScale};
 const aimY=target.y-(rt.huds.get(targetId??-1)?.offsetY??90)*0.35;
 const to={x:target.x+e.OffsetX*avatarScale,y:aimY-e.OffsetY*avatarScale};fx.position.set(from.x,from.y);fx.scale.set(avatarScale);fx.rotation=Math.atan2(to.y-from.y,to.x-from.x);
 fx.state.setAnimation(0,asset.name,true);fx.state.timeScale=clock.rate();(e.ShowAtBottom?rt.bottom:rt.top).addChild(fx);rt.effectsLive.add(fx);
 const start=clock.now();
 cleanups.push(clock.animate(g=>{if(cancelled||!rt.effectsLive.has(fx))return false;const t=Math.min(1,(g-start)/e.Duration);fx.position.set(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t);if(t>=1){rt.effectsLive.delete(fx);fx.destroy({children:true});return false}}));
 }
 const lifeActive=new Set<number>();
 function lifecycle(id:number,type:number){
 const unit=rt!.units.get(id);if(!unit)return;
 lifeActive.add(id);
 const initial=unit.alpha,start=clock.now(),length=lifecycleDuration(type);
 unit.visible=true;if(type===7)unit.alpha=0;
 cleanups.push(clock.animate(g=>{if(cancelled)return false;const elapsed=Math.min(length,g-start);unit.alpha=lifecycleAlpha(type,elapsed,initial);if(elapsed>=length){lifeActive.delete(id);unit.visible=type===7;unit.alpha=1;if(type===7)anim(unit,'standby',true);return false}}));
 }
 function move(to:{x:number;y:number},ms:number,back:boolean,blink:boolean){
 if(!actor)return;
 const from={x:actor.x,y:actor.y},start=clock.now();
 cleanups.push(clock.animate(g=>{if(cancelled)return false;const t=ms<=0?1:Math.min(1,(g-start)/ms),v=motionSample(from,to,t,back,blink);actor.position.set(v.x,v.y);actor.alpha=v.alpha;if(t>=1){if(back)anim(actor,'standby',true);return false}}));
 }
 function screen(e:Timeline['Events'][number]){
 const name=e.ActionName;if(!['dark_screen','shock_screen'].includes(name)||e.Duration<=0)return;
 const start=clock.now(),length=name==='dark_screen'?Math.max(400,e.Duration):e.Duration;
 cleanups.push(clock.animate(g=>{if(cancelled)return false;const t=Math.min(length,g-start);
 if(name==='dark_screen')rt.mask.alpha=190/255*Math.min(1,t/200,(length-t)/200);
 else if(t<length){const step=Math.floor(t/30),f=(t%30)/30;rt.app.stage.position.set(Math.sin(step*2.4)*3,6*(step%2?1:-1)*(1-2*f))}
 if(t>=length){if(name==='dark_screen')rt.mask.alpha=0;else rt.app.stage.position.set(0,0);return false}}));
 }
 function showFloat(targetId:number,type:number,value:number){
  const unit=rt.units.get(targetId);if(!unit)return;
  const kind=floatKindForEvent(type);if(!kind)return;
  const label=createFloatText(rt.hudAssets,kind,value);
  const hud=rt.huds.get(targetId);
  const baseY=unit.y-(hud?.offsetY??271)+40;
  // Wall-clock float lifecycle: survives page clock.clear(); cleaned on battle unmount.
  label.position.set(unit.x,baseY);label.alpha=1;rt.app.stage.addChild(label);rt.floatsLive.add(label);
  const start=performance.now();
  let raf=0;
  const tick=(wall:number)=>{
   if(label.destroyed||!rt.floatsLive.has(label))return;
   const t=Math.min(1,(wall-start)/900);
   label.y=baseY-140*t;label.alpha=t>0.7?Math.max(0,(1-t)/0.3):1;
   if(t>=1){rt.floatsLive.delete(label);if(!label.destroyed)label.destroy({children:true});return}
   raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
  // Cancel only if battle tears down mid-flight (release via floatsLive clear in report cleanup).
  void raf;
 }
 async function play(){await prepareEffects();if(cancelled)return;
 // Keep game clock pumping so later() timers fire under pause/speed.
 cleanups.push(clock.animate(()=>!cancelled));
 if(p.dataType===2&&timeline)for(const e of timeline.Events){
 if([2,6,7,8].includes(e.EventType)&&e.ActionName&&e.Duration>0)later(e.StartTime,()=>{
 if(e.EventType===7){for(const id of new Set(p.targets))bullet(e,rt.units.get(id),id)}
 else if(e.EventType===6){for(const id of new Set(p.events.filter(h=>h.index===e.HitPointId&&h.type<=20).map(h=>h.target))){const h=report.heroes.find(x=>x.id===id);showEffect(e,rt.units.get(id),-(h?.camp??-1))}}
 else if(e.EventType===8||e.ReferenceType===1)showEffect(e,actor,home?.camp??1);
 else showEffect(e,e.ReferenceType===3?rt.units.get(p.targets[0]):undefined,-(target?.camp??-1));
 });
 if(e.EventType===5)later(e.StartTime,()=>{const file=rt.sounds[common?.model??model??'']?.[e.ActionName];if(!file||volumeRef.current<=0)return;const a=new Audio('./battle-sounds/'+file);a.volume=volumeRef.current;a.playbackRate=Math.max(0.5,clock.speed);rt.audio.add(a);a.onended=()=>rt.audio.delete(a);if(!clock.paused)void a.play().catch(()=>rt.audio.delete(a))});
 if(e.EventType===9)later(e.StartTime,()=>screen(e));
 if(e.EventType===1){later(e.StartTime,()=>anim(actor,e.ActionName));later(e.StartTime+e.Duration,()=>anim(actor,'standby',true))}
 if(e.EventType===3&&home)later(e.StartTime,()=>move(moveDestination(e.ReferenceType,target,home.camp,e.TargetDistance),e.Duration,false,e.IsBlink));
 if(e.EventType===4&&home)later(e.StartTime,()=>move(fieldPosition(home.stationId,home.camp),e.Duration,true,e.IsBlink));
 }
 const events=orderedEvents(p);let duration=Math.max(timeline?.Duration??300,...effectEvents.map(e=>e.StartTime+e.Duration),...(timeline?.Events.filter(e=>e.EventType===9).map(e=>e.StartTime+Math.max(e.ActionName==='dark_screen'?400:0,e.Duration))??[]));const fallbackTime=duration;
 for(const e of events){const hit=timeline?.Events.find(x=>x.EventType===6&&x.HitPointId===e.index),ms=hit?.StartTime??(p.dataType===2?fallbackTime:0);duration=Math.max(duration,ms+300,ms+lifecycleDuration(e.type)+50);later(ms,()=>{const t=rt.units.get(e.target);if(!t)return;rt.huds.get(e.target)?.event(e);if(e.type===7||e.type===27)lifecycle(e.target,e.type);if([1,2,3,21].includes(e.type)&&!hit?.NoHurtAction){anim(t,'hurt');later(200,()=>{if(!lifeActive.has(e.target)&&t.visible)anim(t,'standby',true)})}if([1,2,3,4,5,6,8,21,22,28].includes(e.type))showFloat(e.target,e.type,e.value)})}
 later(duration,()=>{for(const h of p.heroStatus){rt.huds.get(h.id)?.set({...h,buffs:h.buffs??[]});const s=rt.units.get(h.id);if(s){s.visible=!h.isDead;s.alpha=1;const home=report.heroes.find(x=>x.id===h.id);if(home){const pos=fieldPosition(home.stationId,home.camp);s.position.set(pos.x,pos.y)}anim(s,'standby',true)}}setStatus('Раунд '+p.round);onReady(true)});
 }void play();
 return()=>{cancelled=true;for(const a of rt.audio){a.pause();a.src=''}rt.audio.clear();if(!rt.mask.destroyed)rt.mask.alpha=0;if(!rt.app.stage.destroyed)rt.app.stage.position.set(0,0);for(const fx of [...rt.effectsLive])fx.destroy({children:true});rt.effectsLive.clear();effectReleases.forEach(r=>r());cleanups.forEach(c=>c());clock.clear()};
 },[cursor,loaded,report]);
 return <><p role="status">{status}</p><div ref={host} style={{maxWidth:360,margin:'auto'}}/></>
}
