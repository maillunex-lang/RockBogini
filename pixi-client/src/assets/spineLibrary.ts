import {Assets,Texture} from 'pixi.js';
import {TextureAtlas,AtlasAttachmentLoader,SkeletonBinary,Spine} from '@pixi-spine/all-3.8';
export type Asset={id:string;name:string;texture:string;animations:string[];directory?:string;requiredAnimations?:string[]};
type Data=ReturnType<SkeletonBinary['readSkeletonData']>;
const cache=new Map<string,{pending:Promise<Data>;refs:number}>();
const MAX_IDLE=4;
let maintenance=Promise.resolve();
function trim(){maintenance=maintenance.then(async()=>{const idle=[...cache].filter(([,e])=>e.refs===0);for(const [key,e] of idle.slice(0,Math.max(0,idle.length-MAX_IDLE))){if(e.refs||cache.get(key)!==e)continue;try{await e.pending}catch{continue}if(e.refs||cache.get(key)!==e)continue;cache.delete(key);await Assets.unload(key)}}).catch(console.error);return maintenance}
export function cacheSettled(){return maintenance}
async function checked(url:string){const r=await fetch(url);if(!r.ok)throw Error('Resource '+r.status+': '+url);return r}
export async function acquireSkeleton(a:Asset):Promise<{data:Data;release:()=>void}>{
 await maintenance;
 const base='./'+(a.directory??'squad')+'/'+a.id+'/';const key=base+a.texture;
 let entry=cache.get(key);if(!entry){
 const pending=(async()=>{const [text,bytes,texture]=await Promise.all([checked(base+'skeleton.atlas').then(r=>r.text()),checked(base+'skeleton.skel').then(r=>r.arrayBuffer()),Assets.load<Texture>(key)]);
 const atlas=await new Promise<TextureAtlas>(resolve=>new TextureAtlas(text,(_n,cb)=>cb(texture.baseTexture),resolve));
 const data=new SkeletonBinary(new AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(bytes));
 for(const name of a.requiredAnimations??['standby','attack','hurt'])if(!data.findAnimation(name))throw Error(a.name+': missing '+name);
 return data})();
 entry={pending,refs:0};cache.set(key,entry);const created=entry;pending.catch(()=>{if(cache.get(key)===created)cache.delete(key)});}
 const held=entry;held.refs++;let released=false;const release=()=>{if(released)return;released=true;held.refs--;void trim()};try{return {data:await held.pending,release}}catch(e){release();throw e}
}

export function cacheSize(){return cache.size}
