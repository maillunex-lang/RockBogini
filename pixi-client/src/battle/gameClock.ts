/** Unified battle clock: wall time → game time with pause and x1/x2/x3. */
export type BattleSpeed=1|2|3;

export function createGameClock(initial:BattleSpeed=1){
 let speed:BattleSpeed=initial;
 let paused=false;
 let gameOrigin=0;
 let wallOrigin=performance.now();
 let gameAtPause=0;
 const timers=new Set<{at:number;fn:()=>void}>();
 const frames=new Set<number>();

 function syncOrigin(now=performance.now()){
  gameOrigin=nowGame(now);
  wallOrigin=now;
 }

 function nowGame(wall=performance.now()){
  if(paused)return gameAtPause;
  return gameOrigin+(wall-wallOrigin)*speed;
 }

 function setSpeed(next:BattleSpeed){
  if(next===speed)return;syncOrigin();speed=next;
 }

 function setPaused(next:boolean){
  if(next===paused)return;
  const wall=performance.now();
  if(next){gameAtPause=nowGame(wall);paused=true}
  else{paused=false;gameOrigin=gameAtPause;wallOrigin=wall}
 }

 function later(ms:number,fn:()=>void){
  const item={at:nowGame()+ms,fn};
  timers.add(item);
  return ()=>timers.delete(item);
 }

 function pump(wall=performance.now()){
  if(paused)return;
  const g=nowGame(wall);
  for(const t of [...timers]){
   if(t.at<=g){timers.delete(t);t.fn()}
  }
 }

 const raf=typeof requestAnimationFrame==='function'
  ?(cb:FrameRequestCallback)=>requestAnimationFrame(cb)
  :(cb:(t:number)=>void)=>setTimeout(()=>cb(performance.now()),16) as unknown as number;
 const caf=typeof cancelAnimationFrame==='function'
  ?(id:number)=>cancelAnimationFrame(id)
  :(id:number)=>clearTimeout(id);

 function animate(fn:(gameNow:number,gameDt:number)=>boolean|void){
  let prev=nowGame();
  let id=0;
  const tick=(wall:number)=>{
   frames.delete(id);
   pump(wall);
   const g=nowGame(wall);
   const dt=paused?0:Math.max(0,g-prev);
   prev=g;
   if(fn(g,dt)===false)return;
   id=raf(tick);frames.add(id);
  };
  id=raf(tick);frames.add(id);
  return ()=>{caf(id);frames.delete(id)};
 }

 function clear(){
  timers.clear();
  for(const id of frames)caf(id);
  frames.clear();
 }

 return {
  get speed(){return speed},
  get paused(){return paused},
  now:nowGame,
  setSpeed,
  setPaused,
  later,
  pump,
  animate,
  clear,
  /** Spine/audio rate: 0 when paused. */
  rate(){return paused?0:speed},
 };
}

export type GameClock=ReturnType<typeof createGameClock>;
