export const PROTOCOL=1 as const;
export type Health={status:'ok';service:'rockbogini-next';mode:'migration';gameplayReady:boolean};
export type Ready={ready:boolean};
export type Capabilities={protocol:typeof PROTOCOL;gameplayReady:boolean;reference:'elixir';features:string[]};
export function isCapabilities(v:unknown):v is Capabilities{
 if(!v||typeof v!=='object')return false;
 const x=v as Record<string,unknown>;
 return x.protocol===PROTOCOL&&typeof x.gameplayReady==='boolean'&&x.reference==='elixir'&&Array.isArray(x.features)&&x.features.every(f=>typeof f==='string');
}
