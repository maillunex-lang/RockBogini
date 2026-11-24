import {useEffect,useRef,useState} from 'react';
import {Application,Assets,Texture} from 'pixi.js';
import {AtlasAttachmentLoader,SkeletonBinary,Spine,TextureAtlas} from '@pixi-spine/all-3.8';

const ANIMATION='Ani_UI_effect_TXK_wujingzhidian';
const ROOT='./profile/effects/3177/';

/** Original HeadFrame 3177 overlay, using the original Spine 3.8 animation. */
export function AnimatedFrame({frame}:{frame:number}){
 const host=useRef<HTMLDivElement>(null);
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 useEffect(()=>{
  if(frame!==3177)return;
  let cancelled=false;
  let app:Application|undefined;
  let key='';
  let textureLoaded=false;
  (async()=>{
   const [atlasFile,binaryFile]=await Promise.all([
    fetch(ROOT+'skeleton.atlas'),fetch(ROOT+'skeleton.skel')
   ]);
   if(!atlasFile.ok||!binaryFile.ok)throw Error('Unable to load frame 3177');
   const [text,data]=await Promise.all([atlasFile.text(),binaryFile.arrayBuffer()]);
   key=ROOT+'texture0.png';
   const texture=await Assets.load<Texture>(key);textureLoaded=true;
   if(cancelled)return;
   const atlas=await new Promise<TextureAtlas>(resolve=>new TextureAtlas(text,(_name,cb)=>cb(texture.baseTexture),resolve));
   const skeleton=new SkeletonBinary(new AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(data));
   if(!skeleton.findAnimation(ANIMATION))throw Error('Original frame animation is missing');
   if(cancelled)return;
   const spine=new Spine(skeleton);
   spine.state.setAnimation(0,ANIMATION,true);
   spine.update(.016);
   const bounds=spine.getLocalBounds();
   app=new Application({width:180,height:180,backgroundAlpha:0,antialias:true});
   spine.pivot.set(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   // Align the original 680x340 effect with the 180px frame art,
   // rather than forcing the effect into a square and over-scaling it.
   const size=Math.max(bounds.width,bounds.height,1);
   spine.scale.set(158/size);
   spine.position.set(90,90);
   app.stage.addChild(spine);
   const canvas=app.view as HTMLCanvasElement;
   canvas.setAttribute('aria-label','Анимированная рамка 3177');
   canvas.style.cssText='width:100%;height:100%;display:block;pointer-events:none';
   if(!cancelled&&host.current){host.current.appendChild(canvas);setState('ready')}
  })().catch(e=>{console.error('Spine frame 3177',e);if(!cancelled)setState('error')});
  return()=>{cancelled=true;app?.destroy(true,{children:true});if(textureLoaded&&key)void Assets.unload(key).catch(()=>{});};
 },[frame]);
 if(frame!==3177)return null;
 return <div className="profile-frame-effect" ref={host} data-animation-state={state} aria-label="Эффект рамки 3177"/>;
}
