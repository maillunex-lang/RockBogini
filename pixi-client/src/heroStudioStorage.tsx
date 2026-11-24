import {useEffect,useState} from 'react';
import type {Skill} from './heroTimeline';

type Version={revision:number;payload:{draft?:Skill;model?:string;skillIndex?:number};actor:string;created_at:string;restored_from:number|null};
type Snapshot={revision:number;payload:Version['payload']|null;history:Version[]};
const API=(import.meta.env.VITE_NEXT_API_URL as string|undefined)??'/testtest/api';
const buttonStyle={padding:10,marginRight:8,marginBottom:8};
export function HeroStudioStorage({model,index,draft,onLoad}:{model:string;index:number;draft:Skill;onLoad:(s:Skill)=>void}){
 const [token,setToken]=useState('');
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [authorized,setAuthorized]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('Не подключено');
 const [snapshot,setSnapshot]=useState<Snapshot>({revision:0,payload:null,history:[]});
 const url=API+'/v1/studio/drafts/'+encodeURIComponent(model)+'/skill/'+index;
 const headers={authorization:'Bearer '+token};
 const read=async(t=token)=>{
  const r=await fetch(url,{headers:{authorization:'Bearer '+t},cache:'no-store'});
  if(!r.ok)throw Error('История: HTTP '+r.status);
  const data=await r.json() as Snapshot;setSnapshot(data);return data;
 };
 useEffect(()=>{let active=true;setAuthorized(false);setSnapshot({revision:0,payload:null,history:[]});if(!token){setStatus('Войди под административной учётной записью');return}
 fetch(API+'/v1/studio/me',{headers,cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status===403?'Нет прав администратора':'Сессия недействительна');return r.json()}).then(()=>{if(active){setAuthorized(true);setStatus('Администратор подтверждён');return read(token)}}).catch(e=>{if(active){setAuthorized(false);setStatus(String(e))}});return()=>{active=false};
 },[token,model,index]);
 const action=async(run:()=>Promise<void>)=>{setBusy(true);try{await run()}catch(e){setStatus(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
 const login=()=>action(async()=>{
  const r=await fetch(API+'/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password})});
  if(!r.ok)throw Error(r.status===401?'Неверная почта или пароль':'Вход: HTTP '+r.status);
  const data=await r.json() as {token?:string};if(!data.token||!/^[A-Za-z0-9_-]{43}$/.test(data.token))throw Error('Некорректная сессия');
  const check=await fetch(API+'/v1/studio/me',{headers:{Authorization:'Bearer '+data.token},cache:'no-store'});
  if(!check.ok)throw Error(check.status===403?'Эта учётная запись не является администратором':'Не удалось подтвердить доступ');
  setPassword('');setToken(data.token);setStatus('Администратор подтверждён');
 });
 const save=()=>action(async()=>{
  const r=await fetch(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:snapshot.revision,payload:{version:1,model,skillIndex:index,draft}})});
  if(r.status===409){await read();throw Error('Конфликт версий. История обновлена, проверь изменения перед повторным сохранением')}
  if(!r.ok)throw Error('Сохранение: HTTP '+r.status);
  await read();setStatus('Черновик сохранён, версия '+(snapshot.revision+1));
 });
 const rollback=(revision:number)=>action(async()=>{
  if(!window.confirm('Восстановить версию '+revision+'? Будет создана новая запись истории.'))return;
  const r=await fetch(url+'/restore',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:snapshot.revision,restoreRevision:revision})});
  if(r.status===409){await read();throw Error('Версия изменилась, история обновлена')}
  if(!r.ok)throw Error('Восстановление: HTTP '+r.status);
  const record=await r.json() as Version;
  if(record.payload?.model===model&&record.payload?.skillIndex===index&&record.payload.draft)onLoad(record.payload.draft);
  await read();setStatus('Восстановлена версия '+revision+' как новая ревизия '+record.revision);
 });
 return <section style={{border:'1px solid #655777',padding:12,borderRadius:10,marginTop:16}}>
  <h4>Сохранение и история · администратор</h4>
  {!authorized&&<div><p>Вход существующего аккаунта. Пароль не сохраняется. Только назначенный администратор может изменять настройки.</p>
  <input autoComplete="username" aria-label="Почта" placeholder="Почта" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'95%',padding:8,marginBottom:8}}/>
  <input autoComplete="current-password" aria-label="Пароль" placeholder="Пароль" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'95%',padding:8,marginBottom:8}}/>
  <button style={buttonStyle} disabled={busy||!email||password.length<10} onClick={login}>Войти</button>
  {token&&<button style={buttonStyle} onClick={()=>{setToken('');setAuthorized(false)}}>Сменить аккаунт в студии</button>}
  </div>}
  {authorized&&<><p>Последняя ревизия: {snapshot.revision} · история хранится в PostgreSQL.</p>
  <button style={buttonStyle} disabled={busy} onClick={save}>Сохранить черновик</button>
  <button style={buttonStyle} disabled={busy} onClick={()=>action(async()=>{await read();setStatus('История обновлена')})}>Обновить историю</button>
  <button style={buttonStyle} disabled={busy||!snapshot.payload?.draft} onClick={()=>{const p=snapshot.payload;if(p?.model===model&&p.skillIndex===index&&p.draft){onLoad(p.draft);setStatus('Последняя сохранённая версия загружена в редактор')}else setStatus('Нет совместимого черновика')}}>Загрузить последнюю</button>
  <div>{snapshot.history.map(v=><div key={v.revision} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderBottom:'1px solid #655777'}}><span>v{v.revision} · {new Date(v.created_at).toLocaleString('ru-RU')}{v.restored_from?' · откат с v'+v.restored_from:''}</span><button disabled={busy||v.revision===snapshot.revision} onClick={()=>rollback(v.revision)}>Восстановить</button></div>)}</div>
  </>}
  <p role="status">{status}</p><small>Черновик не изменяет оригинальные файлы или боевой баланс.</small>
 </section>
}
