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
    const density=[];
    for(const width of [1280,390,320]){
      await p.setViewportSize({width,height:900});
      const layout=await p.locator('.drug-reference-card').evaluateAll(cards=>cards.slice(0,8).map(c=>{const b=c.getBoundingClientRect();return {x:b.x,width:b.width,top:b.top,bottom:b.bottom,height:b.height}}));
      for(let i=1;i<layout.length;i++){assert.equal(layout[i].x,layout[0].x);assert.equal(layout[i].width,layout[0].width);assert(layout[i].top>=layout[i-1].bottom);}
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.equal(await p.locator('[data-drug-comprehensive]').count(),0);
      assert.equal(await p.locator('#drugReferenceGrid .drug-reference-more').count(),0);
      assert(!(await p.locator('.drug-reference-card').first().innerText()).match(/حاملگی|شیردهی|بارداری|Reopro/));
      const card=p.locator('.drug-reference-card').first();
      // The icon and text are part of the same full-width button.
      await card.locator('.accordion-icon-wrap').click();await card.locator('.drug-reference-source-footer').waitFor();
      assert.equal(await p.locator('.drug-reference-card.open').count(),1);
      assert.equal(await card.locator('.drug-reference-comprehensive').count(),0);
      const summary=await card.locator('.drug-reference-overview').innerText();
      assert(summary.includes('کاربرد'));assert(summary.includes('Injection'));
      assert(!summary.includes('مصرف در حاملگی'));assert(!summary.includes('مصرف در شیر'));
      assert.equal(await card.locator('[data-drug-comprehensive]').count(),1);
      assert.equal(await p.locator('.drug-reference-clinical-warning').count(),0);
      assert((await card.locator('.drug-reference-source-footer').innerText()).startsWith('منبع:'));
      // The second tap closes without opening another view.
      await card.locator('.accordion-title').click();assert.equal(await p.locator('.drug-reference-card.open').count(),0);
      await card.locator('[data-drug-toggle]').press('Enter');await card.locator('[data-drug-comprehensive]').waitFor();
      await card.locator('[data-drug-comprehensive]').click();
      await card.locator('.drug-reference-comprehensive').waitFor();
      const identity=card.locator('.drug-reference-comprehensive .drug-reference-section').filter({hasText:'شناسه، رده‌بندی و بارداری'});
      await identity.locator('summary').click();
      assert((await identity.innerText()).includes('مصرف در حاملگی'));
      await p.waitForFunction(()=>document.querySelectorAll('.drug-reference-card.open .drug-reference-section[open]').length===1);
      assert.equal(await card.locator('.drug-reference-source-footer').count(),1);
      assert.equal(await p.locator('.drug-reference-card.open').count(),1);
      await card.locator('[data-drug-overview]').click();await card.locator('.drug-reference-overview').waitFor();
      assert.equal(await card.locator('.drug-reference-comprehensive').count(),0);
      await card.locator('[data-drug-comprehensive]').press('Escape');assert.equal(await p.locator('.drug-reference-card.open').count(),0);
      if(process.env.FOXIMED_SCREENSHOT_DIR){fs.mkdirSync(process.env.FOXIMED_SCREENSHOT_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.FOXIMED_SCREENSHOT_DIR,'drugs-'+width+'.png')});}
      const drugHeight=layout[0].height;
      await p.locator('.tab-item[data-tab=tools]').click();
      const toolHeight=await p.locator('#gcsAccordionItem').evaluate(e=>e.getBoundingClientRect().height);
      assert(Math.abs(drugHeight-toolHeight)<=4,`density differs from Tools: ${drugHeight} vs ${toolHeight}`);
      if(process.env.FOXIMED_SCREENSHOT_DIR)await p.screenshot({path:path.join(process.env.FOXIMED_SCREENSHOT_DIR,'tools-'+width+'.png')});
      const toolStyle=await p.locator('#gcsAccordionItem').evaluate(e=>({radius:getComputedStyle(e).borderRadius,background:getComputedStyle(e).backgroundColor}));
      await p.locator('.tab-item[data-tab=drugs]').click();
      const drugStyle=await card.evaluate(e=>({radius:getComputedStyle(e).borderRadius,background:getComputedStyle(e).backgroundColor}));assert.deepEqual(drugStyle,toolStyle);
      density.push({width,drugHeight,toolHeight});
      // Scroll the actual pane, then exercise the same floating control Tools uses.
      await card.locator('[data-drug-toggle]').click();await card.locator('.drug-reference-source-footer').waitFor();
      await p.waitForTimeout(450);
      assert(!await p.locator('.accordion-float-bar').isVisible());
      await p.locator('#drugsTab').evaluate(e=>{e.scrollTop+=250});
      await p.locator('.accordion-float-bar.visible').waitFor({state:'visible'});
      const safe=()=>p.evaluate(()=>{
        const bar=document.querySelector('.accordion-float-bar').getBoundingClientRect(),header=document.querySelector('.app-header').getBoundingClientRect(),settings=document.querySelector('#settingsBtn'),b=settings.getBoundingClientRect();
        return {below:bar.top>=header.bottom-.5,settingsHit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('#settingsBtn')===settings};
      });
      assert.deepEqual(await safe(),{below:true,settingsHit:true});
      await p.locator('.app-header').evaluate(e=>e.style.paddingTop='23px');await p.waitForTimeout(60);assert.deepEqual(await safe(),{below:true,settingsHit:true});
      await p.locator('.app-header').evaluate(e=>e.style.paddingTop='');
      await p.locator('.tab-item[data-tab=tools]').click();assert.equal(await p.locator('.accordion-float-bar').count(),0);
      await p.locator('.tab-item[data-tab=drugs]').click();await p.locator('.accordion-float-bar.visible').waitFor();
      assert.equal(await p.locator('.accordion-float-bar').count(),1);
      await p.locator('.accordion-float-close').click();assert.equal(await p.locator('.drug-reference-card.open').count(),0);
      assert.equal(await p.locator('.accordion-float-bar').count(),0);
      assert(!await p.locator('#settingsModal').evaluate(e=>e.classList.contains('active')));
    }
    passed.push('compact headers match Tools heights/radius/surfaces at 1280/390/320; whole-header click and keyboard toggling');
    passed.push('overview then explicit comprehensive view; no pregnancy/lactation in collapsed headers or overview metadata; one source footer');
    passed.push('shared scroll close bar stays below actual/resized header; Settings hit target clear; no stale bars on tab changes');
    // Regression for clinical prose previously imported into Persian titles.
    for (const id of ['aminoglutethimide','nitrazepam','r-iron-plus-multivitamin','b-cetylpyridium']) {
      await p.evaluate(id=>openDrugReferenceDrug(id),id);
      const card=p.locator('.drug-reference-card.open');
      await card.locator('[data-drug-comprehensive]').waitFor();
      assert(!/ثابت نشده|بی خطر بودن|دارو طی|روزانه|محلول رقیق/.test(await card.locator('.accordion-title').innerText()));
      await card.locator('[data-drug-toggle]').click();
    }
    await p.evaluate(()=>openDrugReferenceDrug('hydrochloride-amiodarone'));
    const amio=p.locator('.drug-reference-card.open');
    await amio.locator('[data-drug-comprehensive]').waitFor();
    assert((await amio.locator('.drug-reference-overview').textContent()).includes('فیبریلاسیون بطنی'));
    for (const width of [1280,390,320]) {
      await p.setViewportSize({width,height:900});
      assert.equal(await amio.locator('.drug-reference-overview .drug-reference-section[open]').count(),1);
      const measures=await amio.locator('.drug-reference-measure').evaluateAll(es=>es.map(e=>({direction:getComputedStyle(e).direction,whiteSpace:getComputedStyle(e).whiteSpace})));
      assert(measures.length);assert(measures.every(m=>m.direction==='ltr'&&m.whiteSpace==='nowrap'));
      assert(await amio.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      const precautions=amio.locator('.drug-reference-section').filter({hasText:'موارد احتیاط'});
      await precautions.locator('summary').press('Enter');
      await p.waitForFunction(()=>document.querySelectorAll('.drug-reference-overview .drug-reference-section[open]').length===1);
      assert(await precautions.getAttribute('open')!==null);
      await amio.locator('.drug-reference-section').filter({hasText:'کاربرد، راه مصرف و دوز'}).locator('summary').click();
    }
    await amio.locator('[data-drug-toggle]').click();
    passed.push('contaminated title regressions, fibrillation copy edit, isolated unbroken numeric/unit runs, exclusive topics and keyboard controls at all three widths');
    const longId=await p.evaluate(()=>[...window.FoxiMedDrugBookIndex].sort((a,b)=>b.en.length-a.en.length)[0].id);
    await p.evaluate(id=>openDrugReferenceDrug(id),longId);
    await p.locator('.drug-reference-card.open [data-drug-comprehensive]').waitFor();
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await p.locator('.drug-reference-card.open [data-drug-toggle]').click();
    const longest=await p.evaluate(()=>window.FoxiMedDrugBookData?.length||0);assert.equal(longest,0);
    await p.evaluate(()=>openDrugReferenceDrug('vancomycin-hydrochlorid'));
    await p.locator('.drug-reference-card.open [data-drug-comprehensive]').waitFor();
    const shortText=(await p.locator('.drug-reference-card.open .drug-reference-source-text').allTextContents()).join('');
    await p.locator('.drug-reference-card.open [data-drug-comprehensive]').click();
    assert((await p.locator('.drug-reference-card.open .drug-reference-source-text').allTextContents()).join('').length>shortText.length);
    if(process.env.FOXIMED_SCREENSHOT_DIR)await p.screenshot({path:path.join(process.env.FOXIMED_SCREENSHOT_DIR,'comprehensive.png')});
    await p.locator('.drug-reference-card.open [data-drug-overview]').click();
    if(process.env.FOXIMED_SCREENSHOT_DIR)await p.screenshot({path:path.join(process.env.FOXIMED_SCREENSHOT_DIR,'overview.png')});
    await p.locator('.drug-reference-card.open [data-drug-toggle]').click();
    passed.push('long names do not overflow; multi-page comprehensive content stays behind the second action');
    await p.locator('#settingsBtn').click();assert(await p.locator('#settingsModal').evaluate(e=>e.classList.contains('active')));
    await p.evaluate(()=>{document.querySelector('#settingsModal').classList.remove('active');document.body.classList.remove('no-scroll')});
    await p.locator('.tab-item[data-tab=tools]').click();assert(await p.locator('#toolsTab').isVisible());
    await p.locator('#toolsSearch').fill('GCS');await p.waitForTimeout(160);await p.locator('#toolsSearchClear').click();
    await p.locator('#gcsAccordionItem .accordion-header').click();await p.waitForTimeout(450);
    await p.locator('#toolsTab').evaluate(e=>{e.scrollTop+=230});
    await p.locator('.accordion-float-bar.visible').waitFor();
    assert(await p.locator('.accordion-float-bar').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.app-header').getBoundingClientRect().bottom-.5));
    await p.locator('.accordion-float-close').click();assert(!await p.locator('#gcsAccordionItem').evaluate(e=>e.classList.contains('open')));
    passed.push('Settings, Tools search/clear, and Tools own accordion/floating close continue working');
    assert.deepEqual(errors,[]);await c.close();
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
    console.log(JSON.stringify({status:'PASS',density,passed},null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{server.close();console.error(e);process.exit(1)});
