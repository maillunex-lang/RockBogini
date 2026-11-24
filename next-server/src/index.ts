import {buildApp} from './app.js';
import {openStorage,migrate} from './storage.js';
const storage=await openStorage();
try{await migrate(storage);const app=await buildApp(storage);await app.listen({host:'0.0.0.0',port:Number(process.env.PORT??18991)});for(const sig of ['SIGTERM','SIGINT'] as const)process.once(sig,()=>void app.close())}catch(e){await storage.close();throw e}
