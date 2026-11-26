/* Reproducible browser checks for HeroDetailPanel in the isolated Next preview */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.PREVIEW_URL||'https://rikagro.ru/sexyidle/';
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const results=[];
 try{
  for(const [width,height] of [[320,640],[360,740],[390,844],[768,1024]]){
   const page=await b.newPage({viewport:{width,height}});
   const errors=[];
   page.on('pageerror',e=>errors.push('JS '+e.message));
   page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
   await page.goto(base+'?qa=02623',{waitUntil:'networkidle'});
   await page.getByText('Играть гостем',{exact:true}).click();
   await page.waitForSelector('.city');
   await page.locator('.city-nav button').filter({hasText:'Герои'}).click();
   await page.waitForSelector('.hero-original-card');
   await page.locator('.hero-original-card').first().click();
   await page.waitForSelector('.hero-detail');
   await page.waitForFunction(()=>[...document.querySelectorAll('.hero-detail-head img')].every(i=>i.complete));
   const m=await page.evaluate(()=>{
    const detail=document.querySelector('.hero-detail');
    const css=getComputedStyle(detail);
    return {
     originalBg:css.backgroundImage.includes('heroes/original/detail/PanelBg1.webp')||css.borderImageSource.includes('heroes/original/detail/PanelBg1.webp'),
     nineSlice:css.borderImageSource.includes('heroes/original/detail/PanelBg1.webp'),
     fourAttrs:detail.querySelectorAll('.hero-detail-attribute').length===4,
     fourNav:detail.querySelectorAll('.hero-detail-panes a').length===4,
     detailImagesOk:[...detail.querySelectorAll('.hero-detail-head img')].every(i=>i.complete&&i.naturalWidth>0),
     cards:document.querySelectorAll('.hero-original-card').length,
     overflow:document.documentElement.scrollWidth>innerWidth+2
    };
   });
   assert.equal(m.originalBg,true);assert.equal(m.nineSlice,true);assert.equal(m.fourAttrs,true);assert.equal(m.fourNav,true);
   assert.equal(m.detailImagesOk,true);assert.ok(m.cards>0);assert.equal(m.overflow,false);
   await page.locator('.hero-detail-panes a[href="#hero-abilities"]').click();
   assert.equal(await page.evaluate(()=>location.hash),'#hero-abilities');
   assert.deepEqual(errors,[]);
   results.push({viewport:width+'x'+height,result:'PASS',...m});
   await page.close();
  }
  console.log(JSON.stringify({status:'PASS',results},null,2));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
