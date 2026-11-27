/* NEXT-015.3 browser UI smoke. Mock only inventory data/actions.
   Real DB compose correctness is independently verified by inventory.test.ts. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/rock-pixi8-bench/node_modules/playwright');
const origin=process.env.PREVIEW_URL||'https://rikagro.ru/sexyidle/';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  for(const [width,height] of [[320,640],[390,844],[768,1024]]){
   const p=await browser.newPage({viewport:{width,height}});
   const errs=[];
   p.on('pageerror',e=>errs.push(e.message));
   p.on('response',r=>{if(r.status()>=400&& !r.url().includes('/item-icons/1011301.webp'))errs.push('HTTP '+r.status()+' '+r.url())});
   let servedData;
   await p.route('**/v1/inventory',async route=>{
    const r=await route.fetch(),body=await r.json();
    body.items=body.items.filter(x=>x.itemId!==1011301);
    body.items.push({
     itemId:1011301,amount:'65',kind:'shard',sellPrice:0,canSell:false,usable:false,
     compose:{need:20,cardId:1111301,max:3},icon:'item-icons/1111301.webp',
    });
    body.itemCount=body.items.length;
    body.byKind={...body.byKind,shard:(body.byKind?.shard??0)+1};
    servedData=body;
    await route.fulfill({response:r,json:body});
   });
   await p.route('**/v1/inventory/compose',async route=>{
    const payload=route.request().postDataJSON();
    if(payload.itemId!==1011301||payload.count!==1){errs.push('Wrong compose request '+JSON.stringify(payload))}
    const after=JSON.parse(JSON.stringify(servedData));
    const shard=after.items.find(x=>x.itemId===1011301);
    shard.amount='45';shard.compose.max=2;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,used:{itemId:1011301,count:20,remaining:'45'},rewards:[{itemId:1111301,amount:'1',total:'1'}],inventory:after,
    })});
   });
   await p.route('**/v1/inventory/compose-all',async route=>{
    const after=JSON.parse(JSON.stringify(servedData));
    const shard=after.items.find(x=>x.itemId===1011301);
    shard.amount='5';shard.compose.max=0;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,rewards:[{itemId:1111301,amount:'3',total:'3'}],inventory:after,
    })});
   });
   await p.goto(origin+'?qa=piece',{waitUntil:'domcontentloaded'});
   await p.getByText('Играть гостем',{exact:true}).click();
   await p.waitForSelector('.city');
   await p.locator('[data-guide=city-bag]').click();
   await p.waitForSelector('.inventory-bag');
   const row=p.locator('.inventory-row').filter({hasText:'#1011301'});
   await row.click();
   const dialog=p.locator('.inventory-overlay [role=dialog]');
   const recipe=await dialog.locator('.inventory-compose-recipe').innerText();
   const combine=dialog.getByRole('button',{name:'Объединить осколки'});
   if(!(await combine.isEnabled()))errs.push('Compose disabled');
   await combine.click();
   await p.getByText(/Объединено: 20 осколков/).waitFor();
   await dialog.getByRole('button',{name:'Закрыть'}).click();
   await p.getByRole('button',{name:'Объединить все доступные осколки'}).click();
   await p.getByText('Объединено карт: 3').waitFor();
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
   const ok=recipe.includes('20')&&recipe.includes('1111301')&&!overflow&&!errs.length;
   console.log(JSON.stringify({viewport:width+'x'+height,recipe:recipe.slice(0,120),overflow,errors:errs,result:ok?'PASS':'FAIL'}));
   if(!ok)process.exitCode=1;
   await p.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('BROWSER_QA_ERROR',e.message);process.exitCode=1});
