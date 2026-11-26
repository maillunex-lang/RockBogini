import {useEffect,useRef,useState} from 'react';
import {Application,Assets,Texture} from 'pixi.js';
import {AtlasAttachmentLoader,SkeletonBinary,Spine,TextureAtlas} from '@pixi-spine/all-3.8';

type Kind='biaoti'|'baitian';

const CFG:Record<Kind,{root:string;texture:string;animation:string;w:number;h:number}>=({
 biaoti:{
  root:'./city/effects/biaoti/',
  texture:'UI_effect_zhujiemian_biaoti.png.webp',
  animation:'Ani_UI_effect_zhujiemian_biaoti',
  w:120,h:64,
 },
 baitian:{
  root:'./city/effects/baitian/',
  texture:'UI_effect_zhujiemian_baitian.png.webp',
  animation:'Ani_effect_zhujiemian_baitianwt',
  w:360,h:120,
 },
});

/** Original MainPanel Spine overlays for city titles / daytime ambience. */
export function CitySpine({kind,className}:{kind:Kind;className?:string}){
 const host=useRef<HTMLDivElement>(null);
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 useEffect(()=>{
  const cfg=CFG[kind];
  let cancelled=false;
  let app:Application|undefined;
  let key='';
  let textureLoaded=false;
  (async()=>{
   const [atlasFile,binaryFile]=await Promise.all([
    fetch(cfg.root+'skeleton.atlas'),fetch(cfg.root+'skeleton.bin'),
   ]);
   if(!atlasFile.ok||!binaryFile.ok)throw Error('city_spine_'+kind);
   const [text,data]=await Promise.all([atlasFile.text(),binaryFile.arrayBuffer()]);
   key=cfg.root+cfg.texture;
   const texture=await Assets.load<Texture>(key);textureLoaded=true;
   if(cancelled)return;
   const atlas=await new Promise<TextureAtlas>(resolve=>new TextureAtlas(text,(_name,cb)=>cb(texture.baseTexture),resolve));
   const skeleton=new SkeletonBinary(new AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(data));
   const anim=skeleton.findAnimation(cfg.animation)??skeleton.animations[0];
   if(!anim)throw Error('city_spine_anim_'+kind);
   if(cancelled)return;
   const spine=new Spine(skeleton);
   spine.state.setAnimation(0,anim.name,true);
   spine.update(.016);
   const bounds=spine.getLocalBounds();
   app=new Application({width:cfg.w,height:cfg.h,backgroundAlpha:0,antialias:true});
   spine.pivot.set(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   const size=Math.max(bounds.width,bounds.height,1);
   spine.scale.set(Math.min(cfg.w,cfg.h)*.9/size);
   spine.position.set(cfg.w/2,cfg.h/2);
   app.stage.addChild(spine);
   const canvas=app.view as HTMLCanvasElement;
   canvas.style.cssText='width:100%;height:100%;display:block;pointer-events:none';
   if(!cancelled&&host.current){host.current.replaceChildren(canvas);setState('ready')}
  })().catch(e=>{console.error('CitySpine',kind,e);if(!cancelled)setState('error')});
  return()=>{cancelled=true;app?.destroy(true,{children:true});if(textureLoaded&&key)void Assets.unload(key).catch(()=>{});};
 },[kind]);
 return <div className={className} ref={host} data-spine={kind} data-animation-state={state} aria-hidden/>;
}
