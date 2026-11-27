import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {buildApp} from '../src/app.js';
test('isolated storage and migration', {skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();const app=await buildApp(s);
 try{await migrate(s);await migrate(s);const r=await s.pg.query('SELECT version FROM schema_migrations ORDER BY version');assert.deepEqual(r.rows,[{version:1},{version:2},{version:3},{version:4},{version:5},{version:6},{version:7},{version:8},{version:9},{version:10},{version:11},{version:12},{version:13},{version:14},{version:15},{version:16},{version:17},{version:18},{version:19},{version:20},{version:21},{version:22},{version:23},{version:24},{version:25},{version:26},{version:27},{version:28},{version:29},{version:30}]);await s.redis.set('integration:probe','ok',{EX:30});assert.equal(await s.redis.get('integration:probe'),'ok');await s.redis.del('integration:probe');assert.equal((await app.inject('/ready')).statusCode,200)}finally{await app.close()}
});
