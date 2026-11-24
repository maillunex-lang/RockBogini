import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openStorage,migrate} from '../src/storage.js';
import {saveDraft,restoreDraft,history} from '../src/studioDrafts.js';
test('studio append-only versions, conflict, restore and isolation',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();const k={model:'test_'+randomUUID().replaceAll('-',''),kind:'skill' as const,slot:0};
 try{await migrate(s);assert.equal((await history(s,k)).length,0);assert.equal((await saveDraft(s,k,{offset:1},'test',0)).revision,1);
 const results=await Promise.allSettled([saveDraft(s,k,{offset:2},'test',1),saveDraft(s,k,{offset:3},'test',1)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 await assert.rejects(saveDraft(s,k,{offset:4},'test',1),/REVISION_CONFLICT/);
 const r=await restoreDraft(s,k,1,'test',2);assert.equal(r.revision,3);assert.deepEqual(r.payload,{offset:1});assert.equal(r.restored_from,1);
 assert.equal((await history(s,k)).length,3);assert.equal((await history(s,{...k,slot:1})).length,0);
 await assert.rejects(saveDraft(s,k,{big:'x'.repeat(262145)},'test',3),/INVALID_DRAFT/);
 await assert.rejects(restoreDraft(s,k,99,'test',3),/VERSION_NOT_FOUND/);
 }finally{await s.pg.query('DELETE FROM studio_draft_versions WHERE model=$1',[k.model]);await s.close()}
});
