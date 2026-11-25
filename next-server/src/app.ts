import {battleRoutes} from './battleRoutes.js';
import {studioRoutes} from './studioRoutes.js';
import {formationRoutes} from './formation.js';
import {heroRoutes} from './heroes.js';
import {heroCatalog} from './heroCatalog.js';
import {profileRoutes} from './profile.js';
import {authRoutes} from './authRoutes.js';
import {PROTOCOL,type Health,type Ready,type Capabilities} from './shared/contracts.js';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type {Storage} from './storage.js';
export async function buildApp(storage?:Storage){
 const app=Fastify({logger:false});
 await app.register(websocket);
 app.get('/health',async():Promise<Health>=>({status:'ok',service:'rockbogini-next',mode:'migration',gameplayReady:false}));
 if(storage){await authRoutes(app,storage);await profileRoutes(app,storage);await heroRoutes(app,storage);await formationRoutes(app,storage);await studioRoutes(app,storage);await battleRoutes(app,storage);app.addHook('onClose',async()=>storage.close());app.get('/ready',async(_req,reply)=>{try{await storage.pg.query('SELECT 1');await storage.redis.ping();return {ready:true} satisfies Ready}catch{return reply.code(503).send({ready:false})}})}
 app.get('/v1/heroes/catalog',async()=>({heroes:heroCatalog}));
 app.get<{Params:{id:string}}>('/v1/heroes/catalog/:id',async(req,reply)=>{
 const hero=heroCatalog.find(h=>String(h.Id)===req.params.id);
 return hero??reply.code(404).send({error:'hero_not_found'});
 });
 app.get('/v1/capabilities',async():Promise<Capabilities>=>({protocol:PROTOCOL,gameplayReady:false,reference:'elixir',features:[]}));
 app.get('/v1/socket',{websocket:true},socket=>{socket.close(1008,'Authentication not implemented')});
 return app;
}
