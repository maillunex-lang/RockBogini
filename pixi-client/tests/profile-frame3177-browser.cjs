const {chromium}=require('/work/node_modules/playwright-core'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
const p=await b.newPage({viewport:{width:360,height:740}}),errors=[],responses=[];
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('/profile/effects/3177/'))responses.push([r.url(),r.status()])});
await p.goto('http://127.0.0.1:18992/');await p.getByRole('button',{name:'Играть гостем'}).click();await p.getByRole('button',{name:'Профиль',exact:true}).click();await p.getByText('Уровень 1 · Опыт 0').waitFor();
await p.getByRole('button',{name:'Выбрать рамку'}).click();let next=p.getByRole('button',{name:'Далее',exact:true});for(let i=0;i<14;i++){if(await p.getByRole('button',{name:'Рамка 3177',exact:true}).count())break;await next.click()}
await p.getByRole('button',{name:'Рамка 3177',exact:true}).click();
await p.locator('[data-animation-state="ready"]').waitFor({timeout:15000});assert.equal(await p.locator('[aria-label="Анимированная рамка 3177"]').count(),1);
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);assert.equal(responses.length,3);assert.ok(responses.every(r=>r[1]===200),JSON.stringify(responses));
await p.locator('.profile-avatar').screenshot({path:'/reports/NEXT-008-frame3177-crop.png'});await p.screenshot({path:'/reports/NEXT-008-frame3177-mobile.png'});await p.reload();await p.getByRole('button',{name:'Профиль',exact:true}).click();await p.locator('[data-animation-state="ready"]').waitFor({timeout:15000});
await p.getByRole('button',{name:'Выбрать рамку'}).click();await p.getByRole('button',{name:'Рамка 3102',exact:true}).click();assert.equal(await p.locator('.profile-frame-effect').count(),0);
console.log('PASS Spine frame 3177 real API selection, playback, reload and removal, 360px viewport');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
