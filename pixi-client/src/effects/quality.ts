import {Spine} from '@pixi-spine/all-3.8';
export type Quality='low'|'medium'|'high';
export const presets={low:{particles:0,fps:30},medium:{particles:4,fps:45},high:{particles:8,fps:60}};
export function applyQuality(s:Spine,q:Quality){
 let hidden=0;
 for(const [i,slot] of s.skeleton.slots.entries()){
 const a=slot.getAttachment();const name=(a?.name.split('/').pop()||'').toLowerCase();
 const decorative=/^(ef\d*|effect\w*|eff_\w*|gy|ly)$/.test(name)&&!name.includes('shadow');
 const hide=decorative&&(q==='low'||(q==='medium'&&i%2===0));
 s.slotContainers[i].renderable=!hide;if(hide)hidden++;
 }return hidden;
}
export type QualityMode=Quality|'auto';
export function readQuality():QualityMode{try{const q=localStorage.getItem('rockbogini.quality');if(q==='low'||q==='medium'||q==='high'||q==='auto')return q}catch{}return 'auto'}
export function saveQuality(q:QualityMode){try{localStorage.setItem('rockbogini.quality',q)}catch{}}
export function lowerQuality(q:Quality,fps:number):Quality{return q==='high'&&fps<48?'medium':q==='medium'&&fps<36?'low':q}
