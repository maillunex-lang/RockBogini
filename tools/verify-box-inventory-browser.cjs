/* NEXT-015.4 box UI smoke. Mock only inventory data/actions.
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
    body.items=body.items.filter(x=>![144,1503,1504,1505].includes(x.itemId));
    body.items.push({
     itemId:1503,amount:'1',kind:'consume',sellPrice:0,canSell:false,usable:true,useSubType:6,
     openCosts:[1503,1,1504,3,1505,1],icon:'item-icons/1503.webp',
    });
    body.itemCount=body.items.length;
    servedData=body;
    await route.fulfill({response:r,json:body});
   });
   await p.route('**/v1/inventory/use',async route=>{
    const payload=route.request().postDataJSON();
    if(payload.itemId!==1503||payload.count!==1){errs.push('Wrong use request '+JSON.stringify(payload))}
    const after=JSON.parse(JSON.stringify(servedData));
    after.items=after.items.filter(x=>x.itemId!==1503);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,used:{itemId:1503,count:1,remaining:'0'},rewards:[{itemId:40151,amount:'1',total:'1'}],inventory:after,
    })});
   });
   await p.goto(origin+'?qa=box',{waitUntil:'domcontentloaded'});
   await p.getByText('Играть гостем',{exact:true}).click();
   await p.waitForSelector('.city');
   await p.locator('[data-guide=city-bag]').click();
   await p.waitForSelector('.inventory-bag');
   const row=p.locator('.inventory-row').filter({hasText:'#1503'});
   await row.click();
   const dialog=p.locator('.inventory-overlay [role=dialog]');
   const recipe=await dialog.locator('.inventory-compose-recipe').innerText();
   const open=dialog.getByRole('button',{name:'Открыть сундук'});
   if(!(await open.isEnabled()))errs.push('Box open disabled');
   await open.click();
   await p.getByText(/Открыто:.*награды:/).waitFor();
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
   const ok=recipe.includes('1503')&&recipe.includes('1504')&&recipe.includes('1505')&&!overflow&&!errs.length;
   console.log(JSON.stringify({viewport:width+'x'+height,recipe:recipe.slice(0,160),overflow,errors:errs,result:ok?'PASS':'FAIL'}));
   if(!ok)process.exitCode=1;
   await p.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('BROWSER_QA_ERROR',e.message);process.exitCode=1});
