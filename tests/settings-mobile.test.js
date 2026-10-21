'use strict';
// Chromium touch emulation: viewport/device profiles are not physical-device Safari tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium, devices} = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(ROOT, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(ROOT + path.sep)) throw Error('Invalid path');
    res.setHeader('Content-Type', ({'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
const revision = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8').match(/const RELEASE_NOTES_REVISION = '([^']+)'/)[1];
async function frames(page) { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); }
async function geometry(page) {
  const state = await page.evaluate(() => {
    const modal = document.querySelector('#settingsModal'), pane = modal.querySelector('.modal-body');
    const box = n => { const r = n.getBoundingClientRect(); return {top:r.top, bottom:r.bottom, left:r.left, right:r.right, height:r.height}; };
    return {
      modal:box(modal), pane:box(pane), footer:box(modal.querySelector('.settings-footer')),
      height:window.visualViewport?.height || innerHeight, top:window.visualViewport?.offsetTop || 0,
      overflow:document.documentElement.scrollWidth > innerWidth,
      cards:[...modal.querySelectorAll('.settings-card')].map(card => {
        const trigger = card.querySelector('[data-settings-toggle]'), panel = card.querySelector('.settings-group-content');
        const children = [...panel.children].filter(n => n.getClientRects().length);
        return {key:card.dataset.settingsSection, box:box(card), trigger:box(trigger), open:card.classList.contains('open'), expanded:trigger.getAttribute('aria-expanded'), hidden:panel.hidden, panel:box(panel), childBottom:Math.max(-Infinity,...children.map(n => n.getBoundingClientRect().bottom)), scrollHeight:panel.scrollHeight, clientHeight:panel.clientHeight};
      })
    };
  });
  assert(!state.overflow, JSON.stringify(state));
  assert(Math.abs(state.modal.height - state.height) <= 1, JSON.stringify(state));
  assert(Math.abs(state.modal.top - state.top) <= 1, JSON.stringify(state));
  assert(state.footer.bottom <= state.modal.bottom + 1 && state.pane.bottom <= state.footer.top + 1, JSON.stringify(state));
  for (let i = 0; i < state.cards.length; i++) {
    const c = state.cards[i];
    assert.equal(c.expanded, String(c.open), c.key);
    assert.equal(c.hidden, !c.open, c.key);
    if (c.open) {
      assert(c.panel.height > 0 && c.childBottom <= c.box.bottom + 1, JSON.stringify(c));
      assert(c.panel.bottom <= c.box.bottom + 1, JSON.stringify(c));
      assert(c.scrollHeight <= c.clientHeight + 1, JSON.stringify(c));
    } else assert.equal(c.panel.height, 0, c.key);
    if (i) assert(c.box.top >= state.cards[i-1].box.bottom, JSON.stringify(state));
    assert(Math.abs(c.box.left-state.cards[0].box.left) < 1 && Math.abs(c.box.right-state.cards[0].box.right) < 1, JSON.stringify(c));
  }
  return state;
}
async function reachable(locator) {
  await locator.evaluate(n => n.scrollIntoView({block:'center', behavior:'instant'}));
  const check = await locator.evaluate(n => {
    const r=n.getBoundingClientRect(), pane=n.closest('.modal-body').getBoundingClientRect();
    const hit=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
    return {inside:r.top>=pane.top-1 && r.bottom<=pane.bottom+1, hit:n===hit || n.contains(hit), height:r.height};
  });
  assert(check.inside && check.hit && check.height>=43, JSON.stringify(check));
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({headless:true, executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const results = {status:'PASS', engine:'Chromium touch emulation', physicalDevicesTested:false, safariTested:false, profiles:[]};
  try {
    for (const name of ['iPhone 13','Pixel 7','Galaxy S9+']) {
      const {defaultBrowserType, ...descriptor} = devices[name];
      const context = await browser.newContext({...descriptor, serviceWorkers:'block'});
      await context.route('**/*', r => new URL(r.request().url()).hostname==='127.0.0.1' ? r.continue() : r.abort());
      if (process.env.FOXIMED_FA_ASSETS) await context.route('**/ajax/libs/font-awesome/6.4.0/**', r => {
        const m=new URL(r.request().url()).pathname.match(/\/(css|webfonts)\/([^/]+)$/);
        if (!m) return r.abort();
        return r.fulfill({body:fs.readFileSync(path.join(process.env.FOXIMED_FA_ASSETS,m[1],m[2])), contentType:m[1]==='css'?'text/css':'font/woff2', headers:{'Access-Control-Allow-Origin':'*'}});
      });
      await context.addInitScript(rev => {
        localStorage.setItem('onboardingSeen','true'); localStorage.setItem('pwaNeverShow','true');
        localStorage.setItem('foximed_last_seen_version',rev); localStorage.setItem('foximed_user_name_version','5.1'); localStorage.setItem('userName','Test');
      }, revision);
      const page = await context.newPage(), errors=[];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:'+server.address().port);
      await page.locator('#loadingScreen').waitFor({state:'hidden'});
      await page.addStyleTag({content:'#greetingBanner{display:none!important}'});
      await page.locator('#settingsBtn').tap(); await frames(page); await geometry(page);
      const cards=page.locator('#settingsModal .settings-card');
      // Tap the actual icon, text and chevron; one tap must cause exactly one transition.
      for (let i=0; i<9; i++) {
        const card=cards.nth(i), trigger=card.locator('[data-settings-toggle]');
        for (const part of ['> i:first-child','.settings-card-title','.settings-chevron']) {
          const target=part.startsWith('>')?trigger.locator(':scope '+part):trigger.locator(part);
          await target.tap(); await frames(page); await geometry(page);
          assert.equal(await trigger.getAttribute('aria-expanded'),'true');
          const controls=card.locator('.settings-group-content button, .settings-group-content a, .settings-group-content select, .settings-group-content input:not([type=checkbox])');
          if (await controls.count()) await reachable(controls.last());
          await target.tap(); await frames(page);
          assert.equal(await trigger.getAttribute('aria-expanded'),'false');
        }
      }
      // Multiple expanded cards must occupy natural height, including long Appearance.
      await cards.nth(0).locator('[data-settings-toggle]').tap();
      await cards.nth(1).locator('[data-settings-toggle]').tap();
      await cards.nth(2).locator('[data-settings-toggle]').tap();
      await page.locator('[data-mode=dark]').tap();
      await page.locator('[data-theme=default]').tap();
      const slider=page.locator('label.switch').filter({has:page.locator('#largeFontToggle')});
      await slider.tap(); assert(await page.evaluate(()=>AppState.settings.largeFont));
      await slider.tap(); assert(!await page.evaluate(()=>AppState.settings.largeFont));
      await page.locator('#defaultSyringeVolumeSelect').selectOption('20');
      assert.equal(await page.evaluate(()=>String(AppState.settings.defaultSyringeVolume)),'20');
      await geometry(page);
      if (process.env.FOXIMED_SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.FOXIMED_SCREENSHOT_DIR,`mobile-normal-${name.replace(/\W+/g,'-')}.png`)});
      const layouts=[];
      for (const viewport of [descriptor.viewport,{width:descriptor.viewport.height,height:descriptor.viewport.width},{width:descriptor.viewport.width,height:350}]) {
        await page.setViewportSize(viewport); await frames(page); await geometry(page);
        await reachable(page.locator('#defaultSyringeVolumeSelect'));
        layouts.push(viewport);
      }
      await page.setViewportSize(descriptor.viewport); await frames(page);
      // Simulate the visualViewport-only resize/offset events produced by keyboards.
      await page.locator('#userNameInput').fill('Mobile test');
      await page.evaluate(() => {
        window.__settingsOriginalVV=Object.getOwnPropertyDescriptor(window,'visualViewport');
        const viewport=new EventTarget(); viewport.height=250; viewport.offsetTop=55;
        Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
        window.dispatchEvent(new Event('resize'));
      });
      await frames(page); await geometry(page);
      const focusedVisible=await page.locator('#userNameInput').evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('.modal-body').getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1});
      assert(focusedVisible,'focused input must be revealed automatically after a visual viewport shrink');
      await reachable(page.locator('#userNameInput'));
      await page.locator('#userNameSaveBtn').tap();
      assert.equal(await page.evaluate(()=>localStorage.getItem('userName')),'Mobile test');
      // The innerHeight fallback remains usable where visualViewport is unavailable.
      await page.evaluate(() => {Object.defineProperty(window,'visualViewport',{configurable:true,value:undefined});syncSettingsViewport()});
      await frames(page); await geometry(page);
      await page.evaluate(() => {Object.defineProperty(window,'visualViewport',window.__settingsOriginalVV);syncSettingsViewport()});
      await frames(page);
      // Long, enlarged text must remain in its card and scroll to the final controls.
      await page.addStyleTag({content:'#settingsModal .settings-card-title,#settingsModal .setting-item>span,#settingsModal .setting-sublabel,#settingsModal .settings-hint{font-size:200%!important}'});
      await geometry(page); await reachable(page.locator('[data-theme=dreamfire]'));
      // Keyboard access uses the same state controller; repeat activation never doubles.
      const trigger=cards.nth(1).locator('[data-settings-toggle]');
      await trigger.press('Enter'); assert.equal(await trigger.getAttribute('aria-expanded'),'false');
      await trigger.press('Space'); assert.equal(await trigger.getAttribute('aria-expanded'),'true');
      for(let i=0;i<4;i++) await trigger.tap();
      assert.equal(await trigger.getAttribute('aria-expanded'),'true');
      await geometry(page);
      if (process.env.FOXIMED_SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.FOXIMED_SCREENSHOT_DIR,`mobile-${name.replace(/\W+/g,'-')}.png`)});
      await page.locator('#closeSettings').tap();
      await page.evaluate(()=>VoiceCommands.process('ارتباط با سازنده'));
      await page.waitForFunction(()=>document.querySelector('#settings-trigger-contact').getAttribute('aria-expanded')==='true');
      await geometry(page);
      await reachable(page.locator('#creatorContact .setting-contact-btn'));
      await page.locator('#closeSettings').tap();
      await page.locator('#settingsBtn').tap();
      assert.equal(await page.locator('#settingsModal .settings-card.open').count(),0);
      assert.deepEqual(errors,[]);
      results.profiles.push({name,viewport:descriptor.viewport,touchTargetTransitions:54,submenus:9,naturalHeightAndVerticalContainment:true,controlsReachableAndHitTested:true,multipleOpen:true,rotationAndReducedViewport:layouts,visualViewportResizeAndOffsetSimulated:true,visualViewportFallback:true,enlargedText:true,keyboardAndRepeatedTaps:true,voiceContactShortcut:true,reopenResets:true});
      await context.close();
    }
    fs.writeFileSync(path.join(ROOT,'reports/settings-mobile-results.json'),JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results,null,2));
  } finally {await browser.close(); server.close();}
})().catch(e => {console.error(e);process.exit(1)});
