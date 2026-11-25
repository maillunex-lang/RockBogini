// BattleHelper.js: HERO_POSITION_MAP, Cocos y-up converted to Pixi y-down.
const positions=[[[124,165],[272,165],[420,165]],[[124,0],[284,0],[444,0]],[[124,-195],[298,-195],[472,-195]]];
export const fieldWidth=1080,fieldHeight=1920,avatarScale=.875;
export function fieldPosition(station:number,camp:number){
 if(station<0)return {x:540-280*camp,y:960-565,z:1000};
 const row=Math.min(2,Math.max(0,Math.floor(station/3))),col=station%3;
 const [x,y]=positions[col][row];
 return {x:540-camp*x,y:960-y,z:100*col+10-row-(camp===1?0:5)};
}
