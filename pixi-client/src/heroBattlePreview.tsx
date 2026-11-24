import {useEffect,useRef,useState} from 'react';
import {Application,Container,Text} from 'pixi.js';
import {Spine} from '@pixi-spine/all-3.8';
import {acquireSkeleton,Asset} from './assets/spineLibrary';
import {bodyBounds} from './assets/bodyBounds';
import type {Skill} from './heroTimeline';
type Model={assetId:string;name:string;texture:string;animations:string[]};
type Effects={assets:Record<string,Asset>;models:Record<string,{effects:Record<string,{assetId?:string;animation?:string}>}>};
export function HeroBattlePreview({model,skill,clock}:{model:string;skill:Skill;clock:number}){
 const [models,setModels]=useState<Record<string,Model>>({});const [effects,setEffects]=useState<Effects>();const [enemy,setEnemy]=useState('');const [status,setStatus]=useState('Загрузка');const host=useRef<HTMLDivElement>(null);const render=useRef<(t:number)=>void>();const latest=useRef(clock);latest.current=clock;
 useEffect(()=>{let active=true;Promise.all(['hero-asset-map.json','skill-effect-map.json'].map(async f=>{const r=await fetch('./'+f);if(!r.ok)throw Error(f);return r.json()})).then(([m,e])=>{if(active){setModels(m.models);setEffects(e);setEnemy(Object.keys(m.models)[0])}}).catch(e=>setStatus(String(e)));return()=>{active=false}},[]);
 useEffect(()=>{if(!models[model]||!models[enemy]||!effects)return;let cancelled=false;let app:Application|undefined;const releases:(()=>void)[]=[];render.current=undefined;setStatus('Загрузка сцены');
 async function load(a:Asset){const l=await acquireSkeleton(a);if(cancelled){l.release();throw Error('cancelled')}releases.push(l.release);return new Spine(l.data)}
 async function run(){const make=async(m:string)=>{const a=models[m];return load({id:a.assetId,name:a.name,texture:a.texture,animations:a.animations,directory:'hero-models',requiredAnimations:[]})};const [hero,target]=await Promise.all([make(model),make(enemy)]);if(cancelled)return;
 app=new Application({width:640,height:360,backgroundColor:0x241e38});app.stop();const canvas=app.view as HTMLCanvasElement;canvas.style.width='100%';host.current!.appendChild(canvas);const bottom=new Container(),actors=new Container(),top=new Container();app.stage.addChild(bottom,actors,top);
 function pose(s:Spine,x:number,flip:boolean){s.autoUpdate=false;const skin=s.spineData.skins.find(a=>a.name==='skin1')??s.spineData.skins[0];if(skin){s.skeleton.setSkin(skin);s.skeleton.setSlotsToSetupPose()}const idle=s.spineData.findAnimation('standby')?'standby':s.spineData.animations[0]?.name;if(idle)s.state.setAnimation(0,idle,true);s.update(.1);const b=bodyBounds(s).bounds;const k=Math.min(1.4,190/Math.max(1,b.width),230/Math.max(1,b.height));s.pivot.set(b.x+b.width/2,b.y+b.height/2);s.scale.set(flip?-k:k,k);s.position.set(x,190);actors.addChild(s)}
 pose(hero,170,false);pose(target,470,true);
 const label=new Text('',{fill:0xffdb8c,fontSize:20});label.position.set(16,12);top.addChild(label);
 const items:{event:Skill['Events'][number];spine:Spine;name:string}[]=[];let missing=0;
 for(const e of skill.Events){if(![2,6,7,8].includes(e.EventType)||!e.ActionName)continue;const mapping=effects!.models[model]?.effects[e.ActionName];const a=mapping?.assetId?effects!.assets[mapping.assetId]:undefined;if(!a){missing++;continue}try{const name=mapping?.animation??e.ActionName;const s=await load({...a,directory:'skill-effects',requiredAnimations:[name]});s.autoUpdate=false;s.visible=false;s.scale.set(.65);(e.ShowAtBottom?bottom:top).addChild(s);items.push({event:e,spine:s,name})}catch{if(cancelled)return;missing++}}
 if(cancelled)return;
 function seek(s:Spine,name:string,t:number){if(!s.spineData.findAnimation(name))return;s.state.clearTracks();s.skeleton.setToSetupPose();s.state.setAnimation(0,name,false);s.update(Math.max(0,t)/1000)}
 render.current=(t)=>{const a=skill.Events.filter(e=>e.EventType===1&&e.StartTime<=t).at(-1);seek(hero,a?.ActionName??'standby',t-(a?.StartTime??0));const hits=skill.Events.filter(e=>e.EventType===6&&e.HitPointId>0&&e.StartTime<=t);const last=hits.at(-1);seek(target,last&&t-last.StartTime<350?'hurt':'standby',last&&t-last.StartTime<350?t-last.StartTime:t);label.text='Удары: '+hits.length+' · '+Math.round(t)+' мс';for(const {event:e,spine:s,name} of items){s.visible=t>=e.StartTime&&t<e.StartTime+Math.max(100,e.Duration);if(s.visible){const x=e.FollowAttacker||e.ReferenceType===1?170:470;s.position.set(x+e.OffsetX*.65,190-e.OffsetY*.65);seek(s,name,t-e.StartTime)}}app?.render()};render.current(latest.current);setStatus('Сцена готова · эффектов '+items.length+' · пропущено '+missing)}
 run().catch(e=>{if(!cancelled)setStatus(String(e))});return()=>{cancelled=true;render.current=undefined;app?.destroy(true,{children:true});releases.forEach(r=>r())}},[models,effects,model,enemy,skill]);
 useEffect(()=>{render.current?.(clock)},[clock]);
 return <div><h4>Тестовая сцена боя</h4><label>Противник<select style={{width:'100%',padding:8}} value={enemy} onChange={e=>setEnemy(e.target.value)}>{Object.keys(models).map(m=><option key={m}>{m}</option>)}</select></label><p>{status}</p><div ref={host}/><small>Синхронизация с таймлайном. Удары демонстрационные, позиции приблизительные; движение, звук и расчёт урона пока не подключены.</small></div>
}
