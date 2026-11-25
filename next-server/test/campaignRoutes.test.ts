import test from 'node:test';
import assert from 'node:assert/strict';
import {openStorage,migrate} from '../src/storage.js';
import {createGuest} from '../src/auth.js';
import {buildApp} from '../src/app.js';
import {
 campaignComplete,
 canChallengeMap,
 chapterForMap,
 chapterStatus,
 currentWorldId,
 mainLineChain,
 mapStatus,
 mapsForChapter,
 uiClampMapId,
 campaignChapters,
 worldStatus,
} from '../src/campaignChapters.js';
import {mapWorldName} from '../src/campaignLocales.js';
import {guideLinesForMap,storyChapters,campaignStoryStats} from '../src/campaignStory.js';

test('main-line chain reaches terminal 105701 with next 0',()=>{
 const chain=mainLineChain();
 assert.equal(chain[0],100101);
 assert.equal(chain[chain.length-1],105701);
 assert.ok(chain.includes(105640));
 assert.equal(uiClampMapId(),105640);
});

test('chapterForMap clamps terminal 105701 to last chapter like original DataUtlity',()=>{
 const ch=chapterForMap(105701);
 assert.equal(ch?.id,56);
 assert.equal(chapterForMap(105640)?.id,56);
 assert.equal(chapterForMap(100101)?.id,1);
 // Must not fall back to chapter 1 for terminal stage.
 assert.notEqual(chapterForMap(105701)?.id,1);
});

test('mapsForChapter appends terminal 105701 after last chapter only',()=>{
 const last=campaignChapters.chapters[campaignChapters.chapters.length-1];
 const maps=mapsForChapter(last);
 assert.ok(maps.some(m=>m.id===105701));
 assert.equal(maps[maps.length-1].id,105701);
 assert.equal(maps[maps.length-1].next,0);
 const first=mapsForChapter(campaignChapters.chapters[0]);
 assert.ok(!first.some(m=>m.id===105701));
});

test('map/chapter status uses NextId chain and clears, not raw id comparison',()=>{
 const clears=new Set<number>();
 assert.equal(mapStatus(100101,100101,clears),'available');
 assert.equal(mapStatus(100102,100101,clears),'locked');
 assert.equal(mapStatus(100101,100102,clears),'cleared');
 // Non-monotonic jump: 105640 -> 105701 still ordered by chain.
 assert.equal(mapStatus(105640,105701,clears),'cleared');
 assert.equal(mapStatus(105701,105701,clears),'available');
 clears.add(105701);
 assert.equal(mapStatus(105701,105701,clears),'cleared');
 assert.equal(campaignComplete(105701,clears),true);
 assert.equal(campaignComplete(105701,new Set()),false);
 assert.equal(canChallengeMap(100101,100101,1,clears),true);
 assert.equal(canChallengeMap(100102,100101,1,clears),false);
 assert.equal(canChallengeMap(100101,100102,1,clears),true); // replay
 const ch1=campaignChapters.chapters[0];
 assert.equal(chapterStatus(ch1,100101,clears),'current');
 assert.equal(chapterStatus(ch1,105701,clears),'cleared');
});

test('world status and MapWorld locale names from original locale export',()=>{
 const clears=new Set<number>();
 const w1=campaignChapters.worlds[0];
 assert.equal(w1.id,1);
 assert.equal(worldStatus(w1,100101,clears),'current');
 assert.equal(worldStatus(w1,105701,clears),'cleared');
 assert.equal(currentWorldId(100101,clears),1);
 assert.equal(mapWorldName(1),'Town of Porte');
 assert.equal(mapWorldName(30),"Warrior's Ravine");
 assert.equal(campaignChapters.worldCount,30);
});

test('campaign story guides come from original locale_ui_guide keys (RU preferred)',()=>{
 const lines=guideLinesForMap(100101);
 assert.equal(lines.length,1);
 assert.equal(lines[0].key,'locale_ui_guide_100101');
 assert.match(lines[0].text,/А-а-а/);
 assert.equal(guideLinesForMap(999999).length,0);
 assert.ok(campaignStoryStats().mapGuides>=60);
 assert.ok(storyChapters().length>=80);
 assert.ok(storyChapters()[0].title.length>0);
});

test('authenticated campaign progress lists chapters and terminal stage',{skip:!process.env.PGHOST},async()=>{
 const s=await openStorage();await migrate(s);const guest=await createGuest(s);const app=await buildApp(s);
 const headers={authorization:'Bearer '+guest.token};
 try{
  assert.equal((await app.inject({url:'/v1/campaign'})).statusCode,401);
  const res=await app.inject({url:'/v1/campaign',headers});
  assert.equal(res.statusCode,200,res.body);
  const body=res.json();
  assert.equal(body.stage,100101);
  assert.equal(body.chapterCount,56);
  assert.equal(body.worldCount,30);
  assert.equal(body.uiClampMapId,105640);
  assert.equal(body.currentChapterId,1);
  assert.equal(body.currentWorldId,1);
  assert.equal(body.worlds[0].name,'Town of Porte');
  assert.equal(body.worlds[0].status,'current');
  assert.equal(body.campaignComplete,false);
  assert.equal(body.maps[0].canChallenge,true);
  assert.equal(body.maps[1].canChallenge,false);
  // Simulate terminal progress
  await s.pg.query('UPDATE player_profiles SET stage=$2,level=$3 WHERE account_id=$1',[guest.id,105701,600]);
  await s.pg.query('INSERT INTO campaign_clears(account_id,map_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[guest.id,105640]);
  const mid=await app.inject({url:'/v1/campaign',headers});
  assert.equal(mid.statusCode,200,mid.body);
  const atTerminal=mid.json();
  assert.equal(atTerminal.currentChapterId,56);
  assert.equal(atTerminal.focusChapterId,56);
  assert.ok(atTerminal.maps.some((m:{id:number})=>m.id===105701));
  const term=atTerminal.maps.find((m:{id:number})=>m.id===105701);
  assert.equal(term.status,'available');
  assert.equal(term.terminal,true);
  assert.equal(term.canChallenge,true);
  assert.equal(atTerminal.campaignComplete,false);
  await s.pg.query('INSERT INTO campaign_clears(account_id,map_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[guest.id,105701]);
  const done=await app.inject({url:'/v1/campaign',headers});
  assert.equal(done.json().campaignComplete,true);
  assert.equal(done.json().maps.find((m:{id:number})=>m.id===105701).status,'cleared');
 }finally{await s.pg.query('DELETE FROM accounts WHERE id=$1',[guest.id]);await app.close()}
});
