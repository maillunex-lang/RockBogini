import React,{useState} from 'react';
import {SERVERS} from './servers';
import './login.css';
export type LoginMode='login'|'register'|'guest';
export type LoginRequest={mode:LoginMode;email:string;password:string};
export function LoginScreen({onSubmit,onRecovery}:{onSubmit:(request:LoginRequest)=>Promise<void>;onRecovery?:()=>void}){
 const [mode,setMode]=useState<LoginMode>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [server,setServer]=useState<string>(SERVERS[0].id);
 async function submit(m:LoginMode){setBusy(true);setError('');try{await onSubmit({mode:m,email:m==='guest'?'':email,password:m==='guest'?'':password})}catch(e){setError(e instanceof Error?e.message:'Не удалось войти')}finally{setBusy(false)}}
 return <main className="login-shell"><section className="login-panel"><div className="login-brand">ROCKBOGINI</div><p className="login-subtitle">Твоё приключение начинается здесь</p>
 <label>Игровой сервер<select disabled={busy} value={server} onChange={e=>setServer(e.target.value)}>{SERVERS.map(s=><option key={s.id} value={s.id} disabled={!s.selectable}>{s.name}</option>)}</select></label>
 <p className="login-note">{SERVERS.find(s=>s.id===server)?.description}</p>
 <div className="login-tabs"><button type="button" aria-pressed={mode==='login'} disabled={busy} onClick={()=>{setMode('login');setError('')}}>Вход</button><button type="button" aria-pressed={mode==='register'} disabled={busy} onClick={()=>{setMode('register');setError('')}}>Регистрация</button></div>
 <form onSubmit={e=>{e.preventDefault();void submit(mode)}}><label>Электронная почта<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" maxLength={254} disabled={busy}/></label>
 <label>Пароль<input type="password" required minLength={mode==='register'?10:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'} disabled={busy}/></label>
 <button className="login-primary" disabled={busy}>{busy?'Подключение…':mode==='register'?'Создать аккаунт':'Войти в игру'}</button></form>
 {mode==='login'&&onRecovery&&<button className="login-guest" type="button" disabled={busy} onClick={onRecovery}>Восстановить доступ по резервному коду</button>}
 <button className="login-guest" disabled={busy} onClick={()=>void submit('guest')}>Играть гостем</button><p className="login-note">Тестовый сервер • RockBogini Next</p>{error&&<p role="alert" className="login-error">{error}</p>}</section></main>
}
