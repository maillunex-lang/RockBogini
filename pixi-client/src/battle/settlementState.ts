/** Explicit settlement lifecycle for ReportScreen — no automatic retries. */
export type SettlementPhase='idle'|'pending'|'success'|'error';

export function canAutoSettle(phase:SettlementPhase,finished:boolean,sceneReady:boolean,hasReport:boolean){
 return hasReport&&finished&&sceneReady&&phase==='idle';
}

export function canRetrySettle(phase:SettlementPhase){
 return phase==='error';
}

export function nextPhaseOnStart(phase:SettlementPhase):SettlementPhase|null{
 if(phase==='idle'||phase==='error')return 'pending';
 return null;
}

export function nextPhaseOnResult(ok:boolean):SettlementPhase{
 return ok?'success':'error';
}

export function resetSettlement():SettlementPhase{
 return 'idle';
}
