import {Container,Sprite} from 'pixi.js';
import type {BattleHudAssets} from './hudAssets';

/** Mirrors AJBattleFloatText.FloatNumberType and flyingNumberStyleInfo. */
export type FloatKind='normal'|'restrain'|'critical'|'additional'|'healing'|'absorb'|'dodge'|'block';

const STYLE:{kind:FloatKind;prefix:string;sign:string;decoration?:string;labelAtlas:'numbers'|'labels'}[]=[
 {kind:'normal',prefix:'num_normal_',sign:'num_normal_-',decoration:undefined,labelAtlas:'numbers'},
 {kind:'restrain',prefix:'num_restrain_',sign:'num_restrain_-',decoration:'label_Restrain',labelAtlas:'labels'},
 {kind:'critical',prefix:'num_critical_',sign:'num_critical_-',decoration:'label_Critical',labelAtlas:'labels'},
 {kind:'additional',prefix:'num_persist_',sign:'num_persist_-',decoration:undefined,labelAtlas:'numbers'},
 {kind:'healing',prefix:'num_cure_',sign:'num_cure_+',decoration:undefined,labelAtlas:'numbers'},
 {kind:'absorb',prefix:'num_absorb_',sign:'num_absorb_+',decoration:'label_Absorb',labelAtlas:'labels'},
 {kind:'dodge',prefix:'',sign:'',decoration:'status_Miss',labelAtlas:'labels'},
 {kind:'block',prefix:'num_absorb_',sign:'num_absorb_-',decoration:'label_Block',labelAtlas:'labels'},
];

export function floatKindForEvent(type:number):FloatKind|undefined{
 if(type===1||type===8)return 'normal';
 if(type===2)return 'restrain';
 if(type===3)return 'critical';
 if(type===4||type===28)return 'absorb';
 if(type===5||type===22)return 'healing';
 if(type===6)return 'dodge';
 if(type===21)return 'additional';
 return undefined;
}

export function createFloatText(assets:BattleHudAssets,kind:FloatKind,value:number){
 const style=STYLE.find(s=>s.kind===kind)!;
 const root=new Container();
 const parts:Sprite[]=[];
 const gap=-5;
 let x=0;
 function add(name:string,atlas:'numbers'|'labels',w=28,h=34){
  const meta=atlas==='numbers'?assets.numbers:assets.labels;
  const base=atlas==='numbers'?assets.numberTex:assets.labelTex;
  const tex=assets.frame(base,meta,name);if(!tex)return;
  const s=new Sprite(tex);s.anchor.set(1,1);
  const ow=tex.width||w,oh=tex.height||h;
  s.width=ow;s.height=oh;s.position.set(-x,0);parts.push(s);root.addChild(s);x+=ow+gap;
 }
 if(kind!=='dodge'){
  const digits=String(Math.abs(Math.trunc(value))).split('').reverse();
  if(digits.length===0)digits.push('0');
  for(const d of digits)add(style.prefix+d,'numbers');
  if(style.sign)add(style.sign,'numbers');
 }
 if(style.decoration){
  const fr=(style.labelAtlas==='numbers'?assets.numbers:assets.labels).frames[style.decoration];
  add(style.decoration,style.labelAtlas,fr?.rect[2]??72,fr?.rect[3]??38);
 }
 // Pivot so the cluster sits centered above the actor.
 root.pivot.set(-x/2,0);
 return root;
}
