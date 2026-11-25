export type DamageKind=101|102|'real'|'element';
export type DamageUnit={element:number;attrs:Record<string,number>};
const restrain:Record<number,number>={1:2,2:3,3:1,4:5,5:4};
export function calculateHit(a:DamageUnit,d:DamageUnit,coef:number,kind:DamageKind,random:()=>number,options:{pvp?:boolean;banCrit?:boolean;attr?:(u:DamageUnit,k:number)=>number}={}){
 const attr=options.attr??((u,k)=>u.attrs[k]??0);
 const A=(k:number)=>attr(a,k),D=(k:number)=>attr(d,k);
 const draw=()=>{const x=random();if(!Number.isFinite(x)||x<0||x>1)throw Error('invalid_random');return x};
 const roll=(p:number)=>p>0&&draw()<p;
 const advantage=restrain[a.element]===d.element;
 const hit=A(9)+(advantage?A(36):0)-D(11)-(advantage?D(38):0);
 if(kind!== 'real'&&kind!=='element'&&roll(1-hit/1000))return {damage:0,event:'dodge',crit:false,advantage} as const;
 const atk=A(0),ignore=Math.min(.9,Math.max(0,(A(32)+D(31))/1000));
 const defense=kind==='real'||kind==='element'?0:D(2)*(1-ignore);
 const base=atk*coef/1000*(kind==='element'?1:atk/Math.max(atk+defense,1));
 const keys=kind===101?[15,17]:kind===102?[16,18]:kind==='real'?[26,27]:[72,73];
 const pvp=options.pvp?1+(A(19)-D(20))/1000:1;
 let mult=[1+(A(14)-D(10))/1000,1+(A(keys[0])-D(keys[1]))/1000,pvp,1+A(34)/1000,1-D(35)/1000].reduce((n,v)=>n*Math.max(v,.1),1)*(advantage?Math.max(1+(A(37)-D(39))/1000,1):1);
 const crit=kind!=='element'&&!options.banCrit&&roll((A(4)-D(8))/1000);
 const variance=draw();if(crit)mult*=Math.max((A(5)-D(40))/1000,1);
 return {damage:Math.max(Math.round(base*mult*(.95+variance*.1)),1),event:crit?'crit':advantage?'advance':'damage',crit,advantage} as const;
}
