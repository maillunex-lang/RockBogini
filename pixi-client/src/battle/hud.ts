import {Container,Graphics,Sprite,Text} from 'pixi.js';
import type {BattleEvent,HeroStatus} from './reportClient';
import {applyHealth} from './healthEvents';
import {HP_RED,HP_YELLOW,type BattleHudAssets} from './hudAssets';
export {applyHealth} from './healthEvents';

function hpColor(ratio:number,camp:number){
 if(ratio>HP_YELLOW)return camp===1?0x65d99a:0x7ad67a;
 if(ratio>HP_RED)return 0xe6c35c;
 return 0xf06b78;
}

export function createHud(camp:number,initial:HeroStatus,assets:BattleHudAssets,offsetY:number){
 const root=new Container();
 const bar=new Graphics();
 const icons=new Container();
 icons.position.set(0,-18);
 root.addChild(bar,icons);
 let state=initial;
 const iconSprites=new Map<number,Container>();

 function syncIcons(){
  const keep=new Set<number>();
  for(const b of state.buffs){
   const info=assets.buffMap[String(b.id)];
   if(!info||info.noIcon)continue;
   const frameName=String(info.descriptionId);
   const tex=assets.frame(assets.buffTex,assets.buff,frameName);
   if(!tex)continue;
   keep.add(b.id);
   let slot=iconSprites.get(b.id);
   if(!slot){
    slot=new Container();
    const spr=new Sprite(tex);spr.width=30;spr.height=30;spr.anchor.set(.5);
    const count=new Text('',{fontSize:16,fill:0xffffff,stroke:0x000000,strokeThickness:3});
    count.anchor.set(1,0);count.position.set(14,-14);count.name='count';
    slot.addChild(spr,count);icons.addChild(slot);iconSprites.set(b.id,slot);
   }
   const label=slot.getChildByName('count') as Text;label.text=String(b.count);label.visible=b.count>1;
  }
  for(const [id,slot] of [...iconSprites]){
   if(keep.has(id))continue;
   icons.removeChild(slot);slot.destroy({children:true});iconSprites.delete(id);
  }
  const list=[...iconSprites.values()];
  const gap=34;const start=-((list.length-1)*gap)/2;
  list.forEach((s,i)=>s.position.set(start+i*gap,0));
 }

 function render(){
  const ratio=Math.max(0,Math.min(1,state.hp/Math.max(1,state.hpMax)));
  bar.clear()
   .beginFill(0x17121e,.95).drawRoundedRect(-61,-7,122,14,4).endFill()
   .beginFill(hpColor(ratio,camp)).drawRoundedRect(-58,-4,116*ratio,8,3).endFill();
  syncIcons();
  root.visible=!state.isDead;
 }

 render();
 return {
  root,
  offsetY,
  set(h:HeroStatus){state=h;render()},
  event(e:BattleEvent){state=applyHealth(state,e);render()},
 };
}
