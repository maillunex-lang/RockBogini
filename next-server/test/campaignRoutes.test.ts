import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {chapterStatus,mapStatus} from '../src/campaignChapters.js';

test('campaign chapter and map status helpers',()=>{
 assert.equal(mapStatus(100101,100101),'available');
 assert.equal(mapStatus(100100,100101),'cleared');
 assert.equal(mapStatus(100102,100101),'locked');
 const chapter={id:1,name:'Глава 1',bg:'Street',mapIds:[100101,100102,100140],maps:[]};
 assert.equal(chapterStatus(chapter,100101),'current');
 assert.equal(chapterStatus(chapter,100141),'cleared');
 assert.equal(chapterStatus(chapter,100100),'locked');
});

test('authenticated campaign progress lists chapters and current maps',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const guest=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+guest.token};
 try{
  assert.equal((await app.inject({url:'/v1/campaign'})).statusCode,401);
  const res=await app.inject({url:'/v1/campaign',headers});
  assert.equal(res.statusCode,200,res.body);
  const body=res.json();
  assert.equal(body.stage,100101);
  assert.equal(body.level,1);
  assert.equal(body.chapterCount,56);
  assert.equal(body.currentChapterId,1);
  assert.equal(body.focusChapterId,1);
  assert.equal(body.chapters.length,56);
  assert.equal(body.chapters[0].status,'current');
  assert.equal(body.chapters[1].status,'locked');
  assert.ok(body.maps.length>=1);
  assert.equal(body.maps[0].id,100101);
  assert.equal(body.maps[0].status,'available');
  assert.equal(body.maps[0].canChallenge,true);
  assert.equal(body.maps[1].status,'locked');
  assert.equal(body.maps[1].canChallenge,false);
  const other=await app.inject({url:'/v1/campaign?chapterId=2',headers});
  assert.equal(other.statusCode,200,other.body);
  const ch2=other.json();
  assert.equal(ch2.focusChapterId,2);
  assert.ok(ch2.maps.every((m:{status:string})=>m.status==='locked'));
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[guest.id]);await app.close()}
});
