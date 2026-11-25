import {Assets,Rectangle,Texture} from 'pixi.js';

export type AtlasFrame={rect:number[];offset?:number[];originalSize?:number[];rotated?:boolean};
export type AtlasMeta={name:string;sha256:string;width:number;height:number;frames:Record<string,AtlasFrame>};
export type BuffIconInfo={descriptionId:number;noIcon:boolean;buffIcon:number;floatTextColor:number};

export type BattleHudAssets={
 buff:AtlasMeta;
 numbers:AtlasMeta;
 labels:AtlasMeta;
 buffTex:Texture;
 numberTex:Texture;
 labelTex:Texture;
 offsets:Record<string,number>;
 buffMap:Record<string,BuffIconInfo>;
 gap:number;
 frame(atlas:Texture,meta:AtlasMeta,name:string):Texture|undefined;
};

const cache=new Map<string,Texture>();

export const GAP_BETWEEN_AVATAR_AND_HUD=15;
export const HP_YELLOW=0.6;
export const HP_RED=0.3;

export function hudPixelOffset(heroId:number,offsets:Record<string,number>){
 const y=offsets[String(heroId)]??256;
 return y+GAP_BETWEEN_AVATAR_AND_HUD;
}

export async function loadBattleHudAssets():Promise<BattleHudAssets>{
 const [buff,numbers,labels,offsets,buffMap]=await Promise.all([
  fetch('./battle-hud/buff-list.json').then(r=>r.json()) as Promise<AtlasMeta>,
  fetch('./battle-hud/player-numbers.json').then(r=>r.json()) as Promise<AtlasMeta>,
  fetch('./battle-hud/float-labels.json').then(r=>r.json()) as Promise<AtlasMeta>,
  fetch('./battle-hud/hero-hud-offsets.json').then(r=>r.json()) as Promise<Record<string,number>>,
  fetch('./battle-hud/buff-icon-map.json').then(r=>r.json()) as Promise<Record<string,BuffIconInfo>>,
 ]);
 const [buffTex,numberTex,labelTex]=await Promise.all([
  Assets.load('./battle-hud/buff-list.webp') as Promise<Texture>,
  Assets.load('./battle-hud/player-numbers.webp') as Promise<Texture>,
  Assets.load('./battle-hud/float-labels.webp') as Promise<Texture>,
 ]);
 function frame(atlas:Texture,meta:AtlasMeta,name:string){
  const key=meta.name+':'+name;
  const hit=cache.get(key);if(hit)return hit;
  const f=meta.frames[name];if(!f||f.rotated)return undefined;
  const [x,y,w,h]=f.rect;
  const tex=new Texture(atlas.baseTexture,new Rectangle(x,y,w,h));
  cache.set(key,tex);return tex;
 }
 return {buff,numbers,labels,buffTex,numberTex,labelTex,offsets,buffMap,gap:GAP_BETWEEN_AVATAR_AND_HUD,frame};
}
