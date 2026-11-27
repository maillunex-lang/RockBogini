/* NEXT-020.2 real production API smoke, new guest only, no manipulation of rewards.
   Test actual current backend and frontend screens on three viewport sizes. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/rock-pixi8-bench/node_modules/playwright');
const origin=process.env.PREVIEW_URL||'https://rikagro.ru/sexyidle/';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push('PAGE '+e.message));
  await page.goto(origin+'?qa=main-tasks',{waitUntil:'domcontentloaded'});
  await page.getByText('Играть гостем',{exact:true}).click();
  await page.waitForSelector('.city');
  const openTasks=page.getByRole('button',{name:'Задания',exact:true});
  await openTasks.first().click();
  await page.waitForSelector('.tasks-list');
  await page.getByRole('button',{name:'Сюжет',exact:true}).click();
  const count=await page.locator('.tasks-list article').count();
  if(count!==26)errors.push('Expected 26 source quests, received '+count);
  if(!(await page.getByText('Оригинальная сюжетная цепочка · 26 заданий').count()))errors.push('Main title not visible');
  await page.getByRole('button',{name:'Ежедневные'}).click();
  const daily=await page.locator('.tasks-list article').count();
  if(daily<5)errors.push('Daily tasks missing '+daily);
  await page.getByRole('button',{name:'Еженедельные'}).click();
  const weekly=await page.locator('.tasks-list article').count();
  if(weekly<5)errors.push('Weekly tasks missing '+weekly);
  await page.getByRole('button',{name:'Сюжет',exact:true}).click();
  for(const [width,height] of [[320,640],[390,844],[768,1024]]){
   await page.setViewportSize({width,height});
   const actual=await page.locator('.tasks-list article').count();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
   const ok=actual===26&&!overflow&&!errors.length;
   console.log(JSON.stringify({viewport:width+'x'+height,main:actual,daily,weekly,overflow,errors,result:ok?'PASS':'FAIL'}));
   if(!ok)process.exitCode=1;
  }
  await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error('MAIN_TASKS_BROWSER_QA',e.message);process.exitCode=1});
