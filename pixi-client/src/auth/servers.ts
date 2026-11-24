export type GameServer={id:'next-local';name:string;description:string;api:string;selectable:boolean};
export const SERVERS:readonly GameServer[]=[
 {id:'next-local',name:'Lunex · Тестовый',description:'Новая архитектура RockBogini Next. Прогресс тестовый.',api:(import.meta.env.VITE_NEXT_API_URL as string|undefined)??'/next-api',selectable:true},
];
export function currentServer(){return SERVERS[0]}
