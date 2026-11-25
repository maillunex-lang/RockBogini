import {Container,Graphics,Text} from 'pixi.js';
import type {HeroStatus,BattleEvent} from './reportClient';
export function applyHealth(h:HeroStatus,e:BattleEvent):HeroStatus{
 let hp=h.hp;
 if([1,2,3,21].includes(e.type))hp-=Math.abs(e.value);
 if([5,22,7].includes(e.type))hp+=Math.abs(e.value);
 if(e.type===27)hp=0;
 return {...h,hp:Math.max(0,Math.min(h.hpMax,hp)),isDead:e.type===27?true:e.type===7?false:h.isDead};
}
export function createHud(camp:number,initial:HeroStatus){
 const root=new Container(),bar=new Graphics(),buff=new Text('',{fontSize:24,fill:0xffdc92,stroke:0x15121b,strokeThickness:3});
 buff.anchor.set(.5,1);buff.position.set(0,-10);root.addChild(bar,buff);
 let state=initial;
 function render(){const ratio=Math.max(0,Math.min(1,state.hp/Math.max(1,state.hpMax)));bar.clear().beginFill(0x17121e,.95).drawRoundedRect(-61,-7,122,14,4).endFill().beginFill(camp===1?0x65d99a:0xf06b78).drawRoundedRect(-58,-4,116*ratio,8,3).endFill();buff.text=state.buffs.length?'◆ '+state.buffs.reduce((n,b)=>n+b.count,0):'';root.visible=!state.isDead}
 render();
 return {root,set(h:HeroStatus){state=h;render()},event(e:BattleEvent){state=applyHealth(state,e);render()}};
}
