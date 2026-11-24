import {HeroesScreen} from './heroes/HeroesScreen';
import {City} from './city/City';
import {ProfileScreen} from './profile/ProfileScreen';
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Squad} from './battle/Squad';
import {LoginScreen} from './auth/LoginScreen';
import {LinkGuest} from './auth/LinkGuest';
import {RecoveryScreen,RecoveryCodes} from './auth/RecoveryScreen';
import {currentServer} from './auth/servers';
import {restore,signIn,signOut,linkGuest,recoverAccount,requestRecoveryCodes,type Session} from './auth/session';
import {cacheSettled,cacheSize} from './assets/spineLibrary';

const API=currentServer().api;
function App(){
 const [session,setSession]=useState<Session|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [open,setOpen]=useState(false);
 const [idle,setIdle]=useState(-1);
 const [isGuest,setIsGuest]=useState(false);
 const [showHeroes,setShowHeroes]=useState(false);
 const [showProfile,setShowProfile]=useState(false);
 const [showLink,setShowLink]=useState(false);
 const [showRecovery,setShowRecovery]=useState(false);
 const [codes,setCodes]=useState<string[]|null>(null);
 const [recoverError,setRecoverError]=useState('');
 useEffect(()=>{let active=true;restore(API).then(s=>{if(active){setSession(s);if(s)setIsGuest(s.isGuest===true)}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Ошибка подключения')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 if(loading)return <main className="login-shell"><p>Проверка сохранённой сессии…</p></main>;
 if(error)return <main className="login-shell"><section className="login-panel"><p role="alert">{error}</p><button onClick={()=>{setError('');setLoading(true);restore(API).then(setSession).catch(e=>setError(String(e))).finally(()=>setLoading(false))}}>Повторить подключение</button></section></main>;
 if(!session){
  if(showRecovery)return <RecoveryScreen onCancel={()=>setShowRecovery(false)} onRecover={async(email,code,password)=>{const s=await recoverAccount(API,email,code,password);setSession(s);setIsGuest(false);setShowRecovery(false)}}/>;
  return <LoginScreen onRecovery={()=>setShowRecovery(true)} onSubmit={async form=>{const s=await signIn(API,form);setSession(s);setIsGuest(form.mode==='guest');setOpen(false)}}/>;
 }
 if(showHeroes)return <HeroesScreen api={API} token={session.token} onClose={()=>setShowHeroes(false)}/>;
 if(showProfile)return <ProfileScreen api={API} token={session.token} onClose={()=>setShowProfile(false)}/>;
 if(codes)return <RecoveryCodes codes={codes} onDone={()=>setCodes(null)}/>;
 if(showLink)return <LinkGuest onCancel={()=>setShowLink(false)} onLink={async(email,password)=>{const linked=await linkGuest(API,session,email,password);setSession(linked);setIsGuest(false);setShowLink(false)}}/>;
 return <main><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:10,background:'#222137',color:'white',flexWrap:'wrap'}}>
 <strong>RockBogini Next</strong><button onClick={()=>setShowProfile(true)}>Профиль</button><span>Аккаунт: {session.id.slice(0,8)}</span>
 {isGuest?<button onClick={()=>setShowLink(true)}>Привязать почту</button>:<button onClick={async()=>{try{setRecoverError('');setCodes(await requestRecoveryCodes(API,session))}catch(e){setRecoverError(e instanceof Error?e.message:String(e))}}}>Резервные коды</button>}
 <button onClick={async()=>{try{await signOut(API,session);setSession(null);setShowRecovery(false)}catch(e){setError(e instanceof Error?e.message:String(e))}}}>Выйти из аккаунта</button></div>
 {recoverError&&<p role="alert">{recoverError}</p>}
 <button onClick={()=>{setOpen(!open);setIdle(-1)}}>{open?'Вернуться в город':'Войти в сцену'}</button>
 {open?<Squad/>:<><City api={API} token={session.token} onProfile={()=>setShowProfile(true)} onBattle={()=>setOpen(true)} onHeroes={()=>setShowHeroes(true)}/><button onClick={async()=>{await cacheSettled();setIdle(cacheSize())}}>Проверить кеш</button><output data-idle-cache={idle}>{idle}</output></>}</main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
