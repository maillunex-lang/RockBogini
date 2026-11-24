import {Spine,RegionAttachment,MeshAttachment} from '@pixi-spine/all-3.8';
export function bodyBounds(s:Spine){
 let x=Infinity,y=Infinity,r=-Infinity,b=-Infinity,count=0;
 for(const slot of s.skeleton.slots){const a=slot.getAttachment();if(!a||slot.color.a<=0)continue;
 const name=(a.name.split('/').pop()||'').toLowerCase();
 if(!/^(body|breast|head|hair|arm|leg|[lr]_(arm|leg|hand)|hand|foot|exp_face)/.test(name))continue;
 let v:Float32Array;
 if(a instanceof RegionAttachment){v=new Float32Array(8);a.computeWorldVertices(slot.bone,v,0,2)}
 else if(a instanceof MeshAttachment){v=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(slot,0,v.length,v,0,2)}
 else continue;
 for(let i=0;i<v.length;i+=2){x=Math.min(x,v[i]);r=Math.max(r,v[i]);y=Math.min(y,v[i+1]);b=Math.max(b,v[i+1])}count++;
 }
 if(count<3||!Number.isFinite(x)||r<=x||b<=y)return {bounds:s.getLocalBounds(),count:0};
 return {bounds:{x,y,width:r-x,height:b-y},count};
}
