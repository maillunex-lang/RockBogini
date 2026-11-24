import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {grantExperience} from '../src/progression.js';
import {getProfile} from '../src/profile.js';
test('original cumulative XP thresholds and atomic level rewards',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);
 try{
 assert.deepEqual(await grantExperience(s,a.id,119n),{level:1,xp:'119',diamonds:0});
 assert.deepEqual(await grantExperience(s,a.id,1n),{level:2,xp:'120',diamonds:10});
 assert.deepEqual(await grantExperience(s,a.id,360n),{level:3,xp:'480',diamonds:20});
 await Promise.all([grantExperience(s,a.id,1n),grantExperience(s,a.id,1n)]);
 const p=await getProfile(s,a.id);assert.equal(p.experience,'482');assert.equal(p.currencies.diamond,'30');assert.equal(p.level,3);
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await s.close()}
});
