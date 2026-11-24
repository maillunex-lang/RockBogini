const {chromium}=require('/work/node_modules/playwright-core');
const assert=require('node:assert/strict');
const {randomUUID}=require('crypto');
const email=randomUUID()+'@example.test',password='TestPassword123!';
const url='http://127.0.0.1:18992/';
const guestAccount={id:randomUUID(),token:'A'.repeat(43)};
const registeredAccount={id:randomUUID(),token:'B'.repeat(43)};
let session=guestAccount;
let signup=0,guest=0,login=0,logout=0,restore=0;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:360,height:740}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/next-api/v1/auth/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   const reply=(status,data)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(path.endsWith('/guest')){guest++;session=guestAccount;return reply(200,session)}
   if(path.endsWith('/register')){signup++;session=registeredAccount;return reply(201,session)}
   if(path.endsWith('/login')){login++;session=registeredAccount;return reply(200,session)}
   if(path.endsWith('/session')){restore++;return reply(200,{id:session.id})}
   if(path.endsWith('/logout')){logout++;return route.fulfill({status:204,body:''})}
   return reply(404,{});
  });
  await page.goto(url);
  await page.getByRole('button',{name:'Играть гостем'}).click();
  await page.getByText('Аккаунт: '+guestAccount.id.slice(0,8)).waitFor();
  await page.reload();
  await page.getByText('Аккаунт: '+guestAccount.id.slice(0,8)).waitFor();
  assert.equal(guest,1);assert.equal(restore,1);
  await page.getByRole('button',{name:'Выйти из аккаунта'}).click();
  await page.getByRole('button',{name:'Войти в игру'}).waitFor();
  await page.getByRole('button',{name:'Регистрация',exact:true}).click();
  await page.getByLabel('Электронная почта').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button',{name:'Создать аккаунт'}).click();
  await page.getByText('Аккаунт: '+registeredAccount.id.slice(0,8)).waitFor();
  await page.getByRole('button',{name:'Выйти из аккаунта'}).click();
  await page.getByRole('button',{name:'Войти в игру'}).waitFor();
  await page.getByLabel('Электронная почта').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button',{name:'Войти в игру'}).click();
  await page.getByText('Аккаунт: '+registeredAccount.id.slice(0,8)).waitFor();
  assert.deepEqual({guest,signup,login,logout,restore},{guest:1,signup:1,login:1,logout:2,restore:1});
  assert.deepEqual(errors,[]);
  console.log('PASS: guest, reload restore, logout, register, login; JS errors 0');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
