const {chromium}=require('/work/node_modules/playwright-core');
const assert=require('node:assert/strict');
const {randomUUID}=require('crypto');
const guest={id:randomUUID(),token:'G'.repeat(43)};
const linked={id:guest.id,token:'L'.repeat(43)};
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:360,height:740}}),calls=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/next-api/v1/auth/**',route=>{
   const path=new URL(route.request().url()).pathname;calls.push(path);
   if(path.endsWith('/guest'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(guest)});
   if(path.endsWith('/session'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:guest.id})});
   if(path.endsWith('/link')){
    assert.equal(route.request().headers().authorization,'Bearer '+guest.token);
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(linked)});
   }
   return route.fulfill({status:404});
  });
  await page.goto('http://127.0.0.1:18992/');
  await page.getByRole('button',{name:'Играть гостем'}).click();
  await page.getByRole('button',{name:'Привязать почту'}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'Привязать почту'}).click();
  await page.getByText('Сохранить гостевой аккаунт').waitFor();
  await page.getByLabel('Электронная почта').fill('test@example.test');
  await page.getByLabel('Пароль (от 10 символов)').fill('test-password-123');
  await page.getByRole('button',{name:'Привязать аккаунт'}).click();
  await page.getByText('Аккаунт: '+guest.id.slice(0,8)).waitFor();
  assert.equal(await page.getByRole('button',{name:'Привязать почту'}).count(),0);
  const raw=await page.evaluate(()=>localStorage.getItem('rockbogini.next.session.v1'));
  assert.equal(JSON.parse(raw).token,linked.token);
  assert.equal(JSON.parse(raw).id,guest.id);
  assert.deepEqual(errors,[]);
  assert.ok(calls.some(s=>s.endsWith('/link')));
  console.log('PASS: guest session survives reload, link preserves ID, rotates token in storage, errors 0');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
