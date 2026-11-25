const deathSegments=[[500,0,false],[150,230/255,true],[150,0,false],[100,200/255,true],[100,0,false]] as const;
export function lifecycleDuration(type:number){return type===27?1000:type===7?500:0}
export function lifecycleAlpha(type:number,ms:number,initial=1){
 if(type===7)return Math.max(0,Math.min(1,(ms-350)/150));
 let from=initial,t=Math.max(0,ms);
 for(const [duration,to,out] of deathSegments){if(t<=duration){const q=t/duration,e=out?1-(1-q)**2:q*q;return from+(to-from)*e}t-=duration;from=to}
 return 0;
}
