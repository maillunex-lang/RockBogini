import {Container,Graphics,Text,Ticker} from 'pixi.js';
type Effect={node:Container;age:number;x:number;y:number};
export class HitEffects{
 readonly layer=new Container();
 private active:Effect[]=[];
 private tick=(delta:number)=>{for(const e of [...this.active]){e.age+=delta/60;e.node.alpha=Math.max(0,1-e.age/0.65);e.node.y=e.y-e.age*45;if(e.age>=0.65)this.remove(e)}};
 constructor(private ticker:Ticker,private onCount:(n:number)=>void=()=>{}){ticker.add(this.tick)}
 private remove(e:Effect){this.active=this.active.filter(x=>x!==e);e.node.destroy({children:true});this.onCount(this.active.length)}
 hit(x:number,y:number,amount:number,particles=8){if(this.active.length>=12)this.remove(this.active[0]);const node=new Container();node.position.set(x,y);const flash=new Graphics();flash.lineStyle(3,0xffdba0,1).drawCircle(0,0,14);for(let i=0;i<particles;i++){const a=i*Math.PI*2/particles;flash.beginFill(0xffcc66).drawCircle(Math.cos(a)*22,Math.sin(a)*22,2).endFill()}node.addChild(flash);const label=new Text(String(amount),{fontSize:22,fontWeight:'bold',fill:0xffdf95,stroke:0x201020,strokeThickness:3});label.anchor.set(.5,1);label.y=-12;node.addChild(label);this.layer.addChild(node);this.active.push({node,age:0,x,y});this.onCount(this.active.length)}
 destroy(){this.ticker.remove(this.tick);for(const e of [...this.active])this.remove(e);this.layer.destroy()}
}
