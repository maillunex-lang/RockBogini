/* Browser smoke: PLAYWRIGHT_MODULE=/path/to/playwright node tools/verify-city-mobile.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.CITY_URL||'https://rikagro.ru/sexyidle/';
const viewports=[[320,640],[360,640],[390,844],[768,1024]];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const results=[];
 try{
  for(const [width,height] of viewports){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push('js:'+e.message));
   page.on('response',r=>{if(r.status()>=400)errors.push('http:'+r.status()+':'+r.url())});
   await page.goto(origin+'?cityqa=0261',{waitUntil:'networkidle'});
   await page.getByText('Играть гостем',{exact:true}).click({timeout:15000});
   await page.waitForSelector('.city-stage-inner',{timeout:20000});
   await page.waitForFunction(()=>[...document.querySelectorAll('.city img')].every(i=>i.complete),null,{timeout:15000});
   const actual=await page.evaluate(()=>{
    const shorts=[...document.querySelectorAll('.city-shortcuts button')];
    const boxes=shorts.map(x=>x.getBoundingClientRect());
    const intersections=[];
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
     const a=boxes[i],b=boxes[j];if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)intersections.push([i,j]);
    }
    const badImages=[...document.querySelectorAll('.city img')].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src);
    return {entrances:document.querySelectorAll('.city-entrance .city-original-label').length,
      xp:!!document.querySelector('.city-xp[role="progressbar"]'),nav:document.querySelectorAll('.city-nav button').length,
      labels:shorts.map(b=>b.getAttribute('aria-label')),intersections,badImages,
      hasScroll:document.querySelector('.city-stage').scrollHeight>document.querySelector('.city-stage').clientHeight};
   });
   assert.equal(actual.entrances,9);assert.equal(actual.nav,5);assert.equal(actual.xp,true);
   assert.equal(actual.hasScroll,true);assert.deepEqual(actual.intersections,[]);assert.deepEqual(actual.badImages,[]);
   assert.deepEqual(actual.labels,['Почта','Друзья','Рейтинг','Чат','Инвентарь','Задания']);
   assert.deepEqual(errors,[]);
   results.push({viewport:width+'x'+height,pass:true,...actual});
   await page.close();
  }
  console.log(JSON.stringify({url:origin,result:'PASS',viewports:results},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
