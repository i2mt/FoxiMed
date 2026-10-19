'use strict';
/* Optional rendered regression suite: install Playwright in your test environment.
 * node tests/drug-reference-ui.test.js
 * Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to use an existing Chromium binary.
 * Test-only onboarding settings and greeting suppression isolate the feature.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const ROOT = path.resolve(__dirname,'..');
const revision = fs.readFileSync(path.join(ROOT,'script.js'),'utf8').match(/const RELEASE_NOTES_REVISION = '([^']+)'/)[1];
const server = http.createServer((req,res) => {
  try {
    const url=new URL(req.url,'http://localhost');
    const file=path.resolve(ROOT,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
    if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.pdf':'application/pdf','.png':'image/png'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  }catch{res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const passed=[];
  async function context(extra={}){
    const c=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900},...extra});
    await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
    await c.addInitScript(rev=>{localStorage.setItem('onboardingSeen','true');localStorage.setItem('pwaNeverShow','true');localStorage.setItem('foximed_last_seen_version',rev);localStorage.setItem('foximed_user_name_version','5.1');localStorage.setItem('userName','Test')},revision);
    return c;
  }
  try{
    const c=await context(),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto(url);await p.addStyleTag({content:'#greetingBanner{display:none!important}'});
    await p.locator('.tab-item[data-tab=drugs]').click();
    assert.equal(await p.locator('.drug-reference-card').count(),40);
    assert.equal(await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/drug-reference-book-\d/.test(r.name)).length),0);
    passed.push('initial results bounded to 40; no eager book requests');
    const search=p.locator('#drugReferenceSearch');
    for(const term of ['استامینوفن','Acetaminophen','Tylenol','سفترياكسون','unlikely-no-drug-result']){
      await search.fill(term);await p.waitForTimeout(160);
      const count=await p.locator('.drug-reference-card').count();
      if(term==='unlikely-no-drug-result')assert.equal(count,0);else assert(count>0,term);
    }
    await p.locator('#drugReferenceClear').click();
    passed.push('Persian, English, brand, partial/normalized and empty searches');
    await search.fill('acet');await p.waitForTimeout(160);assert(await p.locator('.drug-reference-card').count()>0);
    await p.locator('#drugReferenceClear').click();
    await p.locator('#drugReferenceNext').click();assert((await p.locator('#drugReferencePage').innerText()).startsWith('2'));
    await p.locator('#drugReferencePrevious').click();
    await p.locator('[data-drug-filter=antibiotic]').click();assert(await p.locator('.drug-reference-card').count()>0);
    await p.locator('[data-drug-filter=all]').click();passed.push('pagination and category controls');
    for(const width of [1280,390,320]){
      await p.setViewportSize({width,height:900});
      const layout=await p.locator('.drug-reference-card').evaluateAll(cards=>cards.slice(0,8).map(c=>{const b=c.getBoundingClientRect();return {x:b.x,width:b.width,top:b.top,bottom:b.bottom}}));
      for(let i=1;i<layout.length;i++){assert.equal(layout[i].x,layout[0].x);assert.equal(layout[i].width,layout[0].width);assert(layout[i].top>=layout[i-1].bottom);}
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const card=p.locator('.drug-reference-card').first();
      await card.locator('[data-drug-toggle]').click();await card.locator('.drug-reference-source-footer').waitFor();
      assert.equal(await p.locator('.drug-reference-card.open').count(),1);
      assert.equal(await p.locator('.drug-reference-clinical-warning,.drug-reference-float-bar').count(),0);
      assert((await card.locator('.drug-reference-source-footer').innerText()).startsWith('منبع:'));
      const overlaps=await card.locator('[data-drug-close]').first().evaluate(el=>{const a=el.getBoundingClientRect(),b=document.querySelector('#settingsBtn').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top});assert(!overlaps);
      await card.locator('[data-drug-close]').first().click();
      assert.equal(await p.locator('.drug-reference-card.open').count(),0);
      assert(!await p.locator('#settingsModal').evaluate(e=>e.classList.contains('active')));
      await card.locator('[data-drug-toggle]').click();await card.locator('.drug-reference-source-footer').waitFor();
      await card.locator('[data-drug-close]').first().press('Escape');assert.equal(await p.locator('.drug-reference-card.open').count(),0);
    }
    passed.push('one card per row at 1280/390/320; no overflow; footer only; click/Escape closing and header separation');
    const longId=await p.evaluate(()=>[...window.FoxiMedDrugBookIndex].sort((a,b)=>b.en.length-a.en.length)[0].id);
    await p.evaluate(id=>openDrugReferenceDrug(id),longId);
    await p.locator('.drug-reference-card.open .drug-reference-source-footer').waitFor();
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await p.locator('.drug-reference-card.open [data-drug-close]').last().click();
    const longest=await p.evaluate(()=>window.FoxiMedDrugBookData?.length||0);assert.equal(longest,0);
    // All chunks remain lazy; exercise a later chunk and a longer monograph.
    await p.evaluate(()=>openDrugReferenceDrug('vancomycin-hydrochlorid'));
    await p.locator('.drug-reference-card.open .drug-reference-source-footer').waitFor();
    assert((await p.locator('.drug-reference-card.open .drug-reference-source-text').allTextContents()).join('').length>2000);
    await p.locator('.drug-reference-card.open [data-drug-close]').last().click();
    passed.push('long generic name and long multi-page monograph');
    await p.locator('#settingsBtn').click();assert(await p.locator('#settingsModal').evaluate(e=>e.classList.contains('active')));
    await p.evaluate(()=>{document.querySelector('#settingsModal').classList.remove('active');document.body.classList.remove('no-scroll')});
    await p.locator('.tab-item[data-tab=tools]').click();assert(await p.locator('#toolsTab').isVisible());
    await p.locator('#toolsSearch').fill('GCS');await p.waitForTimeout(160);await p.locator('#toolsSearchClear').click();
    passed.push('Settings opens independently; Tools search/clear preserved');assert.deepEqual(errors,[]);await c.close();
    // Network failure, retry, stale response, and missing optional fields.
    const e=await context();let requests=0;
    await e.route('**/drug-reference-catalog.js*',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text())+'\nwindow.FoxiMedDrugCatalog.push({id:"optional-fixture",en:"Optional fixture"});'});});
    await e.route('**/drug-reference-book-01.js*',async r=>{requests++;if(requests===1)await r.abort();else{await new Promise(resolve=>setTimeout(resolve,200));await r.continue();}});
    const q=await e.newPage();await q.goto(url);await q.addStyleTag({content:'#greetingBanner{display:none!important}'});await q.locator('.tab-item[data-tab=drugs]').click();
    await q.locator('[data-drug-toggle=abciximab]').click();await q.locator('[data-drug-retry=abciximab]').waitFor();
    await q.locator('[data-drug-retry=abciximab]').click();await q.locator('[data-drug-toggle=acarbose]').click();
    await q.locator('[data-drug-card=acarbose] .drug-reference-source-footer').waitFor();assert.equal(await q.locator('.drug-reference-card.open').getAttribute('data-drug-card'),'acarbose');
    await q.evaluate(()=>openDrugReferenceDrug('optional-fixture'));await q.locator('[data-drug-card=optional-fixture] .drug-reference-source-footer').waitFor();
    assert(!(await q.locator('[data-drug-card=optional-fixture]').innerText()).includes('undefined'));
    passed.push('network failure/retry; rapid record switching; absent optional fields');await e.close();
    console.log(JSON.stringify({status:'PASS',passed},null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{server.close();console.error(e);process.exit(1)});
