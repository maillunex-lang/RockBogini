import {useEffect,useRef,useState} from 'react';
import {Application} from 'pixi.js';
import {Spine} from '@pixi-spine/all-3.8';
import {acquireSkeleton} from '../assets/spineLibrary';
import {bodyBounds} from '../assets/bodyBounds';

type Model={assetId:string;name:string;texture:string;textures?:string[];animations:string[]};
type Catalog={models:Record<string,Model>;heroes:{id:number;model:string;type:number}[]};
let catalogRequest:Promise<Catalog>|undefined;
function loadCatalog(){
 if(!catalogRequest)catalogRequest=fetch(import.meta.env.BASE_URL+'hero-asset-map.json').then(r=>{
  if(!r.ok)throw Error('Каталог моделей: HTTP '+r.status);
  return r.json() as Promise<Catalog>;
 }).catch(e=>{catalogRequest=undefined;throw e});
 return catalogRequest;
}

export function HeroSpinePreview({heroId}:{heroId:number}){
 const host=useRef<HTMLDivElement>(null);
 const active=useRef<Spine|null>(null);
 const [animations,setAnimations]=useState<string[]>([]);
 const [selected,setSelected]=useState('');
 const [status,setStatus]=useState('Загрузка оригинальной модели…');

 useEffect(()=>{
  let cancelled=false;
  let app:Application|undefined;
  let release:(()=>void)|undefined;
  let observer:IntersectionObserver|undefined;
  setStatus('Загрузка оригинальной модели…');
  setAnimations([]);
  setSelected('');
  (async()=>{
   const manifest=await loadCatalog();
   const entry=manifest.heroes.find(h=>h.id===heroId);
   const model=entry&&manifest.models[entry.model];
   if(!model)throw Error('Оригинальная Spine-модель героя #'+heroId+' не найдена');
   const lease=await acquireSkeleton({...model,id:model.assetId,directory:'hero-models',requiredAnimations:[]});
   if(cancelled){lease.release();return}
   release=lease.release;
   const element=host.current;
   if(!element)return;
   app=new Application({width:360,height:460,backgroundAlpha:0,antialias:false,resolution:1});
   app.ticker.maxFPS=30;
   const canvas=app.view as HTMLCanvasElement;
   canvas.style.width='100%';
   canvas.style.height='auto';
   canvas.style.display='block';
   canvas.setAttribute('aria-label','Оригинальная Spine-анимация героя');
   element.appendChild(canvas);
   const spine=new Spine(lease.data);
   active.current=spine;
   const skin=lease.data.skins.find(s=>s.name==='skin1')??lease.data.skins[0];
   if(skin){spine.skeleton.setSkin(skin);spine.skeleton.setSlotsToSetupPose()}
   const available=lease.data.animations.map(a=>a.name);
   const idle=available.includes('standby')?'standby':available.includes('B_standby')?'B_standby':available[0]??'';
   if(idle)spine.state.setAnimation(0,idle,true);
   spine.update(.1);
   const bounds=bodyBounds(spine).bounds;
   const k=Math.min(2.2,300/Math.max(1,bounds.width),410/Math.max(1,bounds.height));
   spine.pivot.set(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   spine.scale.set(k);
   spine.position.set(180,230);
   app.stage.addChild(spine);
   setAnimations(available);
   setSelected(idle);
   setStatus('Модель готова: '+entry!.model);
   observer=new IntersectionObserver(entries=>{
    if(!app)return;
    if(entries.some(e=>e.isIntersecting)&&!document.hidden)app.start();
    else app.stop();
   },{threshold:0.01});
   observer.observe(element);
  })().catch(e=>{if(!cancelled)setStatus('Spine недоступен: '+String(e instanceof Error?e.message:e))});
  return()=>{
   cancelled=true;
   observer?.disconnect();
   active.current=null;
   app?.destroy(true,{children:true,texture:false,baseTexture:false});
   release?.();
  };
 },[heroId]);
 return <div className="hero-spine-preview" aria-label="Анимация героя">
  <div ref={host} className="hero-spine-stage"/>
  <p role="status">{status}</p>
  {animations.length>0&&<label>Оригинальная анимация
   <select value={selected} aria-label="Выбрать анимацию героя" onChange={e=>{
    setSelected(e.target.value);
    active.current?.state.setAnimation(0,e.target.value,true);
   }}>{animations.map(n=><option key={n} value={n}>{n}</option>)}</select>
  </label>}
 </div>;
}
