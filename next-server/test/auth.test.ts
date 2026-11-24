import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,createGuest,sessionAccount,tokenHash} from '../src/auth.js';
import {openStorage,migrate} from '../src/storage.js';
test('salted password hash',async()=>{const a=await hashPassword('test-password-123');assert.notEqual(a,await hashPassword('test-password-123'));assert.ok(await verifyPassword('test-password-123',a));assert.equal(await verifyPassword('wrong',a),false)});
test('guest session persisted and revocable',{skip:!process.env.PGHOST},async()=>{const s=await openStorage();try{await migrate(s);const g=await createGuest(s);try{assert.equal(await sessionAccount(s,g.token),g.id);assert.equal(await sessionAccount(s,'invalid'),null);const r=await s.pg.query('SELECT token_hash FROM sessions WHERE account_id=$1',[g.id]);assert.equal(r.rows[0].token_hash,tokenHash(g.token));await s.pg.query('UPDATE sessions SET expires_at=now() WHERE account_id=$1',[g.id]);assert.equal(await sessionAccount(s,g.token),null)}finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[g.id])}}finally{await s.close()}});
