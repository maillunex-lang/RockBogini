/* NEXT-026.3 original five-screen smoke, no game economy mutations. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.CITY_URL||'https://rikagro.ru/sexyidle/';
const screens=[
 {name:'campaign',selector:'.campaign-screen',navigate:async p=>p.locator('.city-nav button').filter({hasText:'Кампания'}).click(),check:async p=>{
  // Guest tutorial may overlay the initial world view. Inspect the rendered map without changing story progress.
  await p.waitForSelector('.campaign-world-plane',{timeout:15000});
  return p.evaluate(()=>({screen:!!document.querySelector('.campaign-screen'),
   source:!!document.querySelector('.campaign-world-plane[data-original-sheet]'),
   background:document.querySelector('.campaign-world-plane')&&getComputedStyle(document.querySelector('.campaign-world-plane')).backgroundImage,
   sheets:document.querySelectorAll('.campaign-sheet-nav button').length}))}},
 {name:'inventory',selector:'.inventory-screen',navigate:async p=>p.locator('.city-shortcuts button[aria-label="Инвентарь"]').click(),check:async p=>{
  await p.waitForSelector('.inventory-bag',{timeout:15000});
  return p.evaluate(()=>({screen:!!document.querySelector('.inventory-bag'),
   background:getComputedStyle(document.querySelector('.inventory-screen')).backgroundImage,
   filterCount:document.querySelectorAll('.inventory-filters button').length}))}},
 {name:'summon',selector:'.summon-screen',navigate:async p=>p.locator('.city-entrance img[alt="Призыв"]').click(),check:async p=>{
  await p.getByRole('tab',{name:'Оракул'}).click();
  await p.getByRole('tab',{name:'Обычный'}).click();
  return p.evaluate(()=>({screen:!!document.querySelector('.summon-screen'),
   tabs:document.querySelectorAll('.summon-tabs[role=tablist] button').length,
   icon:getComputedStyle(document.querySelector('.summon-tabs[role=tablist] button'),'::before').backgroundImage}))}},
 {name:'shop',selector:'.shop-screen',navigate:async p=>p.locator('.city-nav button').filter({hasText:'Магазин'}).click(),check:async p=>{
  await p.locator('.shop-tabs button').filter({hasText:'VIP'}).click();
  await p.locator('.shop-tabs button').filter({hasText:'Товары'}).click();
  return p.evaluate(()=>({screen:!!document.querySelector('.shop-screen'),
   girl:getComputedStyle(document.querySelector('.shop-screen'),'::before').backgroundImage,
   types:document.querySelectorAll('.shop-types button').length}))}},
 {name:'tasks',selector:'.tasks-screen',navigate:async p=>p.locator('.city-shortcuts button[aria-label="Задания"]').click(),check:async p=>{
  await p.getByRole('button',{name:'Еженедельные'}).click();
  await p.getByRole('button',{name:'Ежедневные'}).click();
  return p.evaluate(()=>({screen:!!document.querySelector('.tasks-screen'),
   header:getComputedStyle(document.querySelector('.tasks-screen header')).backgroundImage,
   chests:document.querySelectorAll('.tasks-chests button').length}))}}
];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 let output=[];
 try{
  for(const item of screens){
   for(const [width,height] of [[390,844],[320,640]]){
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push('JS: '+e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+': '+r.url())});
    try{
     await page.goto(base+'?next026-20='+item.name,{waitUntil:'networkidle',timeout:30000});
     await page.getByText('Играть гостем',{exact:true}).click({timeout:25000});
     await page.waitForSelector('.city',{timeout:20000});
     await item.navigate(page);
     await page.waitForSelector(item.selector,{timeout:20000});
     let m=await item.check(page);
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
     assert.equal(m.screen,true,'no screen UI: '+JSON.stringify(m));
     assert.equal(overflow,false,'body overflow: '+JSON.stringify(m));
     assert.deepEqual(errors,[]);
     if(item.name==='inventory')assert.ok(m.background.includes('/original-panels/inventory/BagBg.webp'));
     if(item.name==='summon'){assert.equal(m.tabs,4);assert.ok(m.icon.includes('/original-panels/summon/'))}
     if(item.name==='shop')assert.ok(m.girl.includes('/original-panels/shop/ShopGirl.webp'));
     if(item.name==='tasks')assert.ok(m.header.includes('/original-panels/tasks/bg_1.png'));
     if(item.name==='campaign')assert.ok(m.source);
     if(width===390)await page.screenshot({path:'/tmp/rock-next026-'+item.name+'.png',fullPage:false});
     output.push({name:item.name,viewport:width+'x'+height,status:'PASS',...m});
    }catch(e){output.push({name:item.name,viewport:width+'x'+height,status:'FAIL',error:String(e),errors});console.error(JSON.stringify(output.slice(-1)));process.exitCode=1;}
    await page.close();
   }
  }
  console.log(JSON.stringify({checked:output.length,pass:output.filter(x=>x.status==='PASS').length,results:output},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
