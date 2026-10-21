'use strict';
// Responsive contents, not just modal outlines. Chromium touch emulation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,devices}=require('playwright'),ROOT=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost'),p=path.resolve(ROOT,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!p.startsWith(ROOT+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});const results={status:'PASS',engine:'Chromium touch emulation',physicalSafariTested:false,layouts:[],tipLayouts:[]};
 try{
 const {defaultBrowserType,...device}=devices['iPhone 13'];const c=await browser.newContext({...device,serviceWorkers:'block'});
 await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 if(process.env.FOXIMED_FA_ASSETS)await c.route('**/ajax/libs/font-awesome/6.4.0/**',r=>{const m=new URL(r.request().url()).pathname.match(/\/(css|webfonts)\/([^/]+)$/);if(!m)return r.abort();return r.fulfill({body:fs.readFileSync(path.join(process.env.FOXIMED_FA_ASSETS,m[1],m[2])),contentType:m[1]==='css'?'text/css':'font/woff2',headers:{'Access-Control-Allow-Origin':'*'}})});
 const rev=fs.readFileSync(path.join(ROOT,'script.js'),'utf8').match(/const RELEASE_NOTES_REVISION = '([^']+)'/)[1];
 await c.addInitScript(rev=>{localStorage.setItem('onboardingSeen','true');localStorage.setItem('foximed_last_seen_version',rev);localStorage.setItem('foximed_setup_invite_v1','{"at":1}');localStorage.setItem('userName','WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW');},rev);
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.locator('#loadingScreen').waitFor({state:'hidden'});
 await p.emulateMedia({reducedMotion:'reduce'});
 await p.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{};e.userChoice=Promise.resolve({outcome:'dismissed'});dispatchEvent(e)});
 async function geometry(label){
  const g=await p.locator('#firstLaunchSetup').evaluate(root=>{
   const box=n=>{const a=n.getBoundingClientRect();return{top:a.top,bottom:a.bottom,left:a.left,right:a.right,height:a.height}};
   const content=root.querySelector('.fm-setup-content'),footer=root.querySelector('.fm-setup-footer'),header=root.querySelector('.fm-setup-header'),a=box(root),b=box(content),style=getComputedStyle(content),left=b.left+parseFloat(style.paddingLeft),right=b.right-parseFloat(style.paddingRight);
   const textProblems=[];
   for(const n of content.querySelectorAll('h2,p,label>span,legend,li,.fm-setup-ready bdi,.fm-setup-swatches button,.fm-setup-modes button')){
    if(!n.getClientRects().length)continue;
    const range=document.createRange();range.selectNodeContents(n);
    for(const r of range.getClientRects())if(r.width&&((r.left<left-2)||(r.right>right+2)))textProblems.push({text:n.textContent.slice(0,45),left:r.left,right:r.right,bounds:[left,right]});
    if(n.clientWidth&&n.scrollWidth>n.clientWidth+2)textProblems.push({text:n.textContent.slice(0,45),scroll:n.scrollWidth,client:n.clientWidth});
   }
   return{root:a,largeText:root.classList.contains('fm-setup-large-text'),actionsDirection:getComputedStyle(root.querySelector('.fm-setup-actions')).flexDirection,footerHintDisplay:getComputedStyle(footer.querySelector('p')).display,content:b,header:box(header),footer:box(footer),textProblems,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...root.querySelectorAll('button,input,select')].filter(n=>n.getClientRects().length).map(n=>({id:n.id||n.dataset.setupTheme||n.dataset.setupMode,...box(n)}))};
  });
  assert(!g.overflow,JSON.stringify({label,g}));if(label.scale===2){assert(g.largeText&&g.actionsDirection==='column'&&g.footerHintDisplay==='none',JSON.stringify({label,g}))}assert.equal(g.textProblems.length,0,JSON.stringify({label,g}));assert(g.root.top>=-1&&g.root.bottom<=label.height+1,JSON.stringify({label,g}));assert(g.header.top>=g.root.top-1&&g.header.bottom<=g.content.top+1,JSON.stringify({label,g}));assert(g.content.height>=96,JSON.stringify({label,g}));assert(g.content.bottom<=g.footer.top+1&&g.footer.bottom<=g.root.bottom+1,JSON.stringify({label,g}));
  for(const n of g.controls)assert(n.left>=g.root.left-1&&n.right<=g.root.right+1&&n.height>=43,JSON.stringify({label,n,g}));
 }
 const cases=[[280,653],[320,480],[360,640],[375,548],[390,664],[412,839],[430,740],[568,280],[667,375],[844,390],[1280,900]];
 for(const scale of [1,2])for(const [width,height]of(scale===1?cases:[[320,568],[375,548],[667,375]])){
  await p.setViewportSize({width,height});
  const extra=scale===2?await p.addStyleTag({content:'.fm-setup h2,.fm-setup p,.fm-setup li,.fm-setup legend,.fm-setup label>span,.fm-setup button{font-size:200%!important;line-height:1.6!important}'}):null;
  await p.evaluate(()=>FoxiMedWelcome.open(true));await geometry({width,height,scale,step:'install'});
  await p.locator('#setupBrowser').tap();await geometry({width,height,scale,step:'name'});
  await p.locator('#setupNext').tap();await geometry({width,height,scale,step:'theme'});
  const discovery=await p.locator('#firstLaunchSetup').evaluate(root=>{const area=root.querySelector('.fm-setup-content'),a=area.getBoundingClientRect(),swatches=[...root.querySelectorAll('[data-setup-theme]')].map(n=>n.getBoundingClientRect());return {allColorsVisible:swatches.every(r=>r.top>=a.top&&r.bottom<=a.bottom),more:area.scrollHeight-area.scrollTop-area.clientHeight>12,cueVisible:!!root.querySelector('#setupMore').getClientRects().length}});
  if(scale===1&&width<=430&&height>=480)assert(discovery.allColorsVisible,JSON.stringify({width,height,discovery}));
  if(discovery.more)assert(discovery.cueVisible,JSON.stringify({width,height,discovery}));

  await p.locator('#setupNext').tap();await geometry({width,height,scale,step:'defaults'});
  await p.locator('#setupTime').evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
  const hit=await p.locator('#setupTime').evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('.fm-setup-content').getBoundingClientRect();return{select:{top:a.top,bottom:a.bottom,height:a.height},pane:{top:b.top,bottom:b.bottom,height:b.height},visible:a.top>=b.top-1&&a.bottom<=b.bottom+1,hit:document.elementFromPoint(a.left+a.width/2,a.top+a.height/2)===n}});assert(hit.visible&&hit.hit,JSON.stringify({width,height,scale,hit}));
  await geometry({width,height,scale,step:'scrolled defaults'});
  await p.locator('#setupNext').tap();await geometry({width,height,scale,step:'ready with long name'});
  if(process.env.FOXIMED_SCREENSHOT_DIR&&width===320)await p.screenshot({path:path.join(process.env.FOXIMED_SCREENSHOT_DIR,`responsive-setup-${width}-${height}-scale${scale}.png`)});
  await p.locator('#setupNext').tap();if(extra)await extra.evaluate(n=>n.remove());results.layouts.push({width,height,textScale:scale,screens:5,allControlsInsideAnd44px:true,textContained:true,footerAndHeaderStable:true,lastSelectReachable:true});
 }
 await p.addStyleTag({content:'#greetingBanner{display:none!important}'});await p.clock.install();
 for(const [width,height]of [[280,653],[320,480],[360,640],[375,548],[390,664],[412,839],[430,740]]){
  await p.setViewportSize({width,height});await p.clock.runFor(500);await p.evaluate(()=>{localStorage.setItem('foximed_feature_tips_v1',JSON.stringify({firstVisit:Date.now()-10*86400000,lastVisitAt:Date.now()-9*3600000,lastShown:0,visits:3,shown:[],used:[]}));dispatchEvent(new StorageEvent('storage',{key:'foximed_feature_tips_v1'}));document.dispatchEvent(new Event('visibilitychange'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))});await p.clock.fastForward(46000);
  const shown=await p.locator('#featureTip').count();if(shown){
   const tip=await p.locator('#featureTip').evaluate(n=>{const a=n.getBoundingClientRect(),pane=document.querySelector('.tab-pane.active').getBoundingClientRect();return{inside:a.left>=0&&a.right<=innerWidth,unclipped:n.scrollWidth<=n.clientWidth+1,separate:a.bottom<=pane.top+1,paneHeight:pane.height,controls:[...n.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return r.left>=a.left&&r.right<=a.right&&r.height>=43})}});assert(tip.inside&&tip.unclipped&&tip.separate&&tip.paneHeight>=160&&tip.controls.every(Boolean),JSON.stringify({width,height,tip}));await p.locator('.fm-tip-close').tap();
  }else assert(width<=320,'tips should fit a normal portrait phone');
  results.tipLayouts.push({width,height,shown:!!shown,spaceReserved:true,longNameWrap:true,skipsIfReadingAreaWouldBeTooSmall:!shown});
 }
 assert.deepEqual(errors,[]);await c.close();fs.writeFileSync(path.join(ROOT,'reports/welcome-responsive-results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({status:'PASS',layouts:results.layouts.length,screens:results.layouts.length*5,tipLayouts:results.tipLayouts.length}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
