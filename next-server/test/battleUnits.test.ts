import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUnit,prepareSquad} from '../src/battleUnits.js';
import {starterHeroes} from '../src/starterHeroes.js';
import {unitFixtures} from './unitFixtures.js';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
test('stored hero battle units match original exactly',()=>{
 for(let i=0;i<2;i++)assert.deepEqual(buildUnit(starterHeroes[i] as Parameters<typeof buildUnit>[0],unitFixtures[i].station),unitFixtures[i]);
 assert.deepEqual(buildUnit(starterHeroes[2] as Parameters<typeof buildUnit>[0],4),unitFixtures[2]);
});
test('prepare persisted squad snapshot and reject incomplete heroes',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const a=await createGuest(s);
 try{assert.deepEqual(await prepareSquad(s,a.id),unitFixtures.slice(0,2));await s.pg.query('UPDATE player_formations SET hero_ids=ARRAY[1001,1002,1003,0,0,0] WHERE account_id=$1',[a.id]);assert.deepEqual(await prepareSquad(s,a.id),unitFixtures);await s.pg.query('UPDATE player_formations SET hero_ids=ARRAY[0,0,0,0,0,0] WHERE account_id=$1',[a.id]);await assert.rejects(prepareSquad(s,a.id),/empty_formation/)}finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[a.id]);await s.close()}
});
