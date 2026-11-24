import React,{useState} from 'react';
import './login.css';
export function RecoveryScreen({onRecover,onCancel}:{onRecover:(email:string,code:string,password:string)=>Promise<void>;onCancel:()=>void}){
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await onRecover(email,code,password)}catch(x){setError(x instanceof Error?x.message:String(x))}finally{setBusy(false)}}
 return <main className="login-shell"><section className="login-panel"><div className="login-brand">ROCKBOGINI</div><h2>Восстановление аккаунта</h2><p className="login-subtitle">Введи один из сохранённых резервных кодов. Каждый можно использовать только один раз.</p>
 <form onSubmit={submit}><label>Электронная почта<input type="email" required maxLength={254} autoComplete="email" value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/></label>
 <label>Резервный код<input required minLength={24} maxLength={27} autoComplete="off" value={code} disabled={busy} onChange={e=>setCode(e.target.value)} placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"/></label>
 <label>Новый пароль<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/></label><button className="login-primary" disabled={busy}>{busy?'Восстановление…':'Сменить пароль и войти'}</button></form>
 <button className="login-guest" disabled={busy} onClick={onCancel}>Назад ко входу</button><p className="login-note">Без резервного кода восстановление пока недоступно. Письма не отправляются.</p>{error&&<p role="alert" className="login-error">{error}</p>}</section></main>
}
export function RecoveryCodes({codes,onDone}:{codes:string[];onDone:()=>void}){
 return <main className="login-shell"><section className="login-panel"><div className="login-brand">РЕЗЕРВНЫЕ КОДЫ</div><p>Сохрани эти коды в надёжном месте. Они показываются только сейчас. Новая генерация отменяет предыдущие коды.</p>
 <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',textAlign:'center',lineHeight:'1.8',fontWeight:700}}>{codes.join('\n')}</pre>
 <button className="login-primary" onClick={()=>void navigator.clipboard?.writeText(codes.join('\n'))}>Скопировать</button>
 <button className="login-guest" onClick={onDone}>Я сохранил коды</button></section></main>
}
