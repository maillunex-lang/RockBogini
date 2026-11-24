import {isCapabilities,type Capabilities} from './contracts';
export async function capabilities(base:string):Promise<Capabilities>{
 const r=await fetch(base+'/v1/capabilities');if(!r.ok)throw Error('API '+r.status);
 const data:unknown=await r.json();if(!isCapabilities(data))throw Error('Несовместимый протокол');return data;
}
