import {useEffect,useRef,useState} from 'react';
import {Application,Text} from 'pixi.js';
import {Spine} from '@pixi-spine/all-3.8';
import {acquireSkeleton} from '../assets/spineLibrary';
import {bodyBounds} from '../assets/bodyBounds';
import {orderedEvents,type BattleReport} from './reportClient';
type Timeline={Duration:number;Events:{EventType:number;ActionName:string;StartTime:number;HitPointId:number;NoHurtAction:boolean}[]};
type Model={assetId:string;name:string;texture:string;animations:string[]};
const json=async<T,>(path:string):Promise<T>=>{const r=await fetch(path);if(!r.ok)throw Error(path+' '+r.status);return r.json()};
export function ReportScene({report,cursor,onReady}:{report:BattleReport;cursor:number;onReady:(ready:boolean)=>void}){
 const host=useRef<HTMLDivElement>(null),runtime=useRef<{app:Application;units:Map<number,Spine>;models:Map<number,string>;timelines:Record<string,{Skills:Timeline[]}>;skills:Record<string,number>}>();
 const [loaded,setLoaded]=useState(false),[status,setStatus]=useState('Загрузка боевой сцены');
 useEffect(()=>{let cancelled=false;let app:Application|undefined;const releases:(()=>void)[]=[];setLoaded(false);onReady(false);
 async function init(){
 const [catalog,timelines,skills]=await Promise.all([json<{models:Record<string,Model>;heroes?:Record<string,string>}>('./hero-asset-map.json'),json<Record<string,{Skills:Timeline[]}>>('./hero-animation-timelines.json'),json<Record<string,number>>('./battle-action-index.json')]);
 if(cancelled)return;
 app=new Application({width:360,height:520,backgroundColor:0x20243a});app.ticker.maxFPS=30;const canvas=app.view as HTMLCanvasElement;canvas.style.width='100%';host.current!.appendChild(canvas);
 const units=new Map<number,Spine>(),models=new Map<number,string>();
 for(const h of report.heroes){
 const model=String(h.model),a=catalog.models[model];if(!a)throw Error('Нет модели '+model);
 const lease=await acquireSkeleton({id:a.assetId,name:a.name,texture:a.texture,animations:a.animations,directory:'hero-models',requiredAnimations:[]});if(cancelled){lease.release();return}releases.push(lease.release);
 const s=new Spine(lease.data),skin=lease.data.skins.find(x=>x.name==='skin1')??lease.data.skins[0];if(skin){s.skeleton.setSkin(skin);s.skeleton.setSlotsToSetupPose()}
 const idle=lease.data.animations.find(x=>x.name==='standby')??lease.data.animations[0];if(idle)s.state.setAnimation(0,idle.name,true);s.update(.1);
 const b=bodyBounds(s).bounds,scale=Math.min(1,76/Math.max(1,b.height),82/Math.max(1,b.width));s.pivot.set(b.x+b.width/2,b.y+b.height/2);s.scale.set(h.camp===1?scale:-scale,scale);
 const slot=Math.max(0,h.stationId%100);s.position.set((h.camp===1?65:295)+(slot%3)*(h.camp===1?24:-24),95+Math.floor(slot/3)*140);s.visible=h.hp>0;app.stage.addChild(s);units.set(h.id,s);models.set(h.id,model);
 }
 runtime.current={app,units,models,timelines,skills};setLoaded(true);setStatus('Сцена готова');onReady(true);
 }init().catch(e=>{if(!cancelled)setStatus(String(e))});return()=>{cancelled=true;runtime.current=undefined;app?.destroy(true,{children:true});releases.forEach(r=>r())}
 },[report]);
 useEffect(()=>{const rt=runtime.current,p=report.pages[cursor];if(!loaded||!rt||!p)return;onReady(false);let cancelled=false;const timers:ReturnType<typeof setTimeout>[]=[];const labels:Text[]=[];
 const later=(ms:number,fn:()=>void)=>timers.push(setTimeout(()=>{if(!cancelled)fn()},ms));
 const anim=(s:Spine|undefined,name:string,loop=false)=>{if(s?.spineData.findAnimation(name))s.state.setAnimation(0,name,loop)};
 const actor=rt.units.get(p.actor),model=rt.models.get(p.actor),index=rt.skills[p.skillId],timeline=model===undefined?undefined:rt.timelines[model]?.Skills[index];
 const action=timeline?.Events.find(e=>e.EventType===1);if(p.dataType===2&&action)later(action.StartTime,()=>anim(actor,action.ActionName));
 const events=orderedEvents(p);let duration=timeline?.Duration??300;
 for(const e of events){const hit=timeline?.Events.find(x=>x.EventType===6&&x.HitPointId===e.index),ms=hit?.StartTime??(p.dataType===2?duration:0);duration=Math.max(duration,ms+300);later(ms,()=>{const t=rt.units.get(e.target);if(!t)return;if(e.type===7)t.visible=true;if(e.type===27)t.visible=false;if([1,2,3,21].includes(e.type)&&!hit?.NoHurtAction)anim(t,'hurt');if([1,2,3,4,5,21,22].includes(e.type)){const label=new Text(String(e.value),{fontSize:16,fill:[5,22].includes(e.type)?0x7dff91:0xffffff,stroke:0x000000,strokeThickness:3});label.anchor.set(.5);label.position.set(t.x,t.y-45);rt.app.stage.addChild(label);labels.push(label);later(300,()=>{label.visible=false})}})}
 later(duration,()=>{for(const h of p.heroStatus){const s=rt.units.get(h.id);if(s){s.visible=!h.isDead;anim(s,'standby',true)}}setStatus('Раунд '+p.round);onReady(true)});
 return()=>{cancelled=true;timers.forEach(clearTimeout);labels.forEach(l=>l.destroy())};
 },[cursor,loaded,report]);
 return <><p>{status}</p><div ref={host} style={{maxWidth:360,margin:'auto'}}/></>
}
