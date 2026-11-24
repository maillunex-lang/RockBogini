import React from 'react';
import {createRoot} from 'react-dom/client';
import {LoginScreen} from './LoginScreen';
createRoot(document.getElementById('root')!).render(<LoginScreen onSubmit={async()=>{throw Error('Предпросмотр: игровой сервер не подключён')}}/>);
