import type {LoginRequest} from './LoginScreen';

const KEY='rockbogini.next.session.v1';
export type Session={id:string;token:string;isGuest?:boolean};
function isSession(value:unknown):value is Session{
 if(!value||typeof value!=='object')return false;
 const s=value as Record<string,unknown>;
 return typeof s.id==='string'&&/^[a-f0-9-]{36}$/i.test(s.id)&&typeof s.token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(s.token);
}
export function savedSession():Session|null{
 try{const value=localStorage.getItem(KEY);if(!value)return null;const parsed:unknown=JSON.parse(value);return isSession(parsed)?parsed:null}catch{return null}
}
export function saveSession(s:Session){localStorage.setItem(KEY,JSON.stringify(s))}
export function forgetSession(){localStorage.removeItem(KEY)}
export type AuthTransport={
 fetch(input:string,init?:RequestInit):Promise<Response>;
};
async function requestSession(base:string,path:string,body:object,transport:AuthTransport):Promise<Session>{
 let response:Response;
 try{response=await transport.fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
 catch{throw Error('Не удалось связаться с сервером. Проверь подключение.')}
 if(!response.ok){
  if(response.status===401)throw Error('Неверная почта или пароль');
  if(response.status===409)throw Error('Такая почта уже зарегистрирована');
  if(response.status===429)throw Error('Слишком много попыток. Попробуй позже');
  if(response.status===400)throw Error('Проверь электронную почту и пароль');
  throw Error('Сервер вернул ошибку '+response.status);
 }
 const data:unknown=await response.json();
 if(!isSession(data))throw Error('Некорректный ответ сервера');
 return data;
}
export async function signIn(base:string,form:LoginRequest,transport:AuthTransport={fetch:(...args)=>fetch(...args)}):Promise<Session>{
 const path=form.mode==='guest'?'/v1/auth/guest':form.mode==='login'?'/v1/auth/login':'/v1/auth/register';
 const s=await requestSession(base,path,form.mode==='guest'?{}:{email:form.email.trim(),password:form.password},transport);
 const withMode={...s,isGuest:form.mode==='guest'};
 saveSession(withMode);
 return withMode;
}
export async function linkGuest(base:string,s:Session,email:string,password:string,transport:AuthTransport={fetch:(...args)=>fetch(...args)}):Promise<Session>{
 let response:Response;
 try{response=await transport.fetch(base+'/v1/auth/link',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.token},body:JSON.stringify({email:email.trim(),password})})}
 catch{throw Error('Нет подключения к серверу. Гостевой аккаунт сохранён.')}
 if(response.status===409)throw Error('Почта занята либо аккаунт уже привязан');
 if(response.status===401)throw Error('Сессия закончилась. Перезайди в игру');
 if(response.status===429)throw Error('Слишком много запросов. Повтори позже');
 if(!response.ok)throw Error('Ошибка привязки аккаунта: '+response.status);
 const data:unknown=await response.json();
 if(!isSession(data)||data.id!==s.id)throw Error('Сервер вернул неверный ID. Сессия не изменена');
 const linked={...data,isGuest:false};
 saveSession(linked);
 return linked;
}
export async function restore(base:string,transport:AuthTransport={fetch:(...args)=>fetch(...args)}):Promise<Session|null>{
 const s=savedSession();if(!s)return null;
 let response:Response;
 try{response=await transport.fetch(base+'/v1/auth/session',{headers:{Authorization:'Bearer '+s.token}})}
 catch{throw Error('Нет соединения с сервером. Сессия сохранена.')}
 if(response.status===401){forgetSession();return null}
 if(!response.ok)throw Error('Ошибка проверки сессии: '+response.status);
 const data:unknown=await response.json();
 if(!data||typeof data!=='object'||(data as {id?:string}).id!==s.id){forgetSession();return null}
 return s;
}
export async function signOut(base:string,s:Session,transport:AuthTransport={fetch:(...args)=>fetch(...args)}):Promise<void>{
 let response:Response;
 try{response=await transport.fetch(base+'/v1/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+s.token}})}
 catch{throw Error('Нет соединения с сервером. Повтори выход позже.')}
 if(!response.ok&&response.status!==401)throw Error('Не удалось завершить сессию');
 forgetSession();
}

export async function requestRecoveryCodes(base:string,s:Session):Promise<string[]>{
 const r=await fetch(base+'/v1/auth/recovery-codes',{method:'POST',headers:{Authorization:'Bearer '+s.token}});
 if(!r.ok)throw Error('Не удалось создать резервные коды: '+r.status);
 const data:unknown=await r.json();
 if(!data||typeof data!=='object'||!Array.isArray((data as {codes?:unknown}).codes)||!(data as {codes:string[]}).codes.every(x=>typeof x==='string'))throw Error('Некорректный ответ сервера');
 return (data as {codes:string[]}).codes;
}
export async function recoverAccount(base:string,email:string,code:string,password:string):Promise<Session>{
 const r=await fetch(base+'/v1/auth/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),code:code.trim(),password})});
 if(r.status===401)throw Error('Не удалось подтвердить резервный код или почту');
 if(r.status===429)throw Error('Слишком много попыток. Повтори позже');
 if(!r.ok)throw Error('Ошибка восстановления: '+r.status);
 const data:unknown=await r.json();
 if(!isSession(data))throw Error('Некорректный ответ сервера');
 const session={...data,isGuest:false};saveSession(session);return session;
}
