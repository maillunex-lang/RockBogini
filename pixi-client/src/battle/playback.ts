export type Action={actor:number;target:number;animation:string};
export async function playSequential(actions:readonly Action[], play:(action:Action)=>Promise<void>,signal?:AbortSignal){for(const action of actions){if(signal?.aborted)return;await play(action)}}
