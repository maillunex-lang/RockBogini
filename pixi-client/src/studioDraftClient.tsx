import {useEffect,useState} from 'react';
import {savedSession} from './auth/session';
const api=(import.meta.env.VITE_NEXT_API_URL as string|undefined)??'/testtest/api';
type Version={revision:number;payload:unknown;actor:string;created_at:string;restored_from:number|null};
type Stored={revision:number;payload:unknown;history:Version[]};
type Props={model:string;kind:'hero'|'skill';slot:number;payload:object;onLoad:(value:unknown)=>void};
export function StudioDraftClient({model,kind,slot,payload,onLoad}:Props){
 const [authorized,setAuthorized]=useState(false);const [revision,setRevision]=useState(0);const [versions,setVersions]=useState<Version[]>([]);
 const [status,setStatus]=useState('Проверка административного доступа');const [busy,setBusy]=useState(false);
 const token=savedSession()?.token;const path=api+'/v1/studio/drafts/'+encodeURIComponent(model)+'/'+kind+'/'+slot;
 const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+(savedSession()?.token??'')});
 const refresh=async(load=false)=>{const r=await fetch(path,{headers:headers(),cache:'no-store'});if(!r.ok)throw Error(r.status===401||r.status===403?'Нет прав администратора':'Ошибка истории: '+r.status);const j=await r.json() as Stored;setRevision(j.revision);setVersions(j.history);if(load&&j.payload!==null)onLoad(j.payload);return j};
 useEffect(()=>{let active=true;setAuthorized(false);setRevision(0);setVersions([]);setStatus('Проверка административного доступа');
 if(!token){setStatus('Войди в обычный аккаунт, которому выдана роль администратора');return}
 fetch(api+'/v1/studio/me',{headers:headers(),cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status===401||r.status===403?'Нет административных прав':'Ошибка сервера '+r.status);return r.json()}).then(async()=>{if(!active)return;setAuthorized(true);const r=await fetch(path,{headers:headers(),cache:'no-store'});if(!r.ok)throw Error('Ошибка истории '+r.status);const j=await r.json() as Stored;if(!active)return;setRevision(j.revision);setVersions(j.history);setStatus(j.revision?'Черновик есть на сервере. Загрузить его можно из истории.':'Нет сохранённых черновиков')}).catch(e=>{if(active){setAuthorized(false);setStatus(String(e))}});
 return()=>{active=false}
 },[model,kind,slot,token]);
 async function perform(url:string,body:object,action:'save'|'restore'){
  setBusy(true);
  try{const r=await fetch(url,{method:action==='save'?'PUT':'POST',headers:headers(),body:JSON.stringify(body)});
   if(!r.ok){if(r.status===409){await refresh();throw Error('Конфликт версий. История обновлена, проверь изменения перед сохранением.')}if(r.status===401||r.status===403){setAuthorized(false);throw Error('Доступ администратора отозван')}throw Error('Сервер ответил '+r.status)}
   const v=await r.json() as Version;const j=await refresh();if(action==='restore')onLoad(v.payload);setStatus(action==='restore'?'Версия '+v.restored_from+' восстановлена как '+j.revision:'Сохранено: версия '+j.revision);
  }catch(e){setStatus(String(e))}finally{setBusy(false)}
 }
 return <section style={{border:'1px solid #6b5d88',borderRadius:10,padding:12,marginTop:16}}><strong>Черновики Hero Studio · {kind} / {slot}</strong><p>{status}</p>{authorized&&<><p>Текущая серверная версия: {revision}</p><button disabled={busy} onClick={()=>perform(path,{expectedRevision:revision,payload},'save')}>Сохранить черновик</button> <button disabled={busy} onClick={()=>void refresh().then(()=>setStatus('История обновлена')).catch(e=>setStatus(String(e)))}>Обновить историю</button><div>{versions.map(v=><div key={v.revision} style={{padding:'6px 0',borderTop:'1px solid #473956'}}>Версия {v.revision} · {new Date(v.created_at).toLocaleString('ru-RU')} · {v.restored_from?'откат с '+v.restored_from:'редактирование'}<button disabled={busy} onClick={()=>{onLoad(v.payload);setStatus('Версия '+v.revision+' загружена локально. Для сохранения нажми кнопку выше.')}}>Открыть</button> <button disabled={busy} onClick={()=>{if(window.confirm('Создать новую серверную версию на основе '+v.revision+'?'))void perform(path+'/restore',{expectedRevision:revision,restoreRevision:v.revision},'restore')}}>Восстановить</button></div>)}</div></>}</section>
}
