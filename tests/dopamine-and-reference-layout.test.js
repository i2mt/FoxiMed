'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),ROOT=path.resolve(__dirname,'..');
const revision=fs.readFileSync(path.join(ROOT,'script.js'),'utf8').match(/const RELEASE_NOTES_REVISION = '([^']+)'/)[1];
const sources={label:'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fc1eb709-ce72-413e-9043-8e463ef0fd36',chart:'https://www.gloshospitals.nhs.uk/documents/22897/Dopamine_infusion_chart.pdf'};
// Published examples/cells, independently transcribed; volumes are FINAL volumes.
const cases=[
 {source:'label',total:200,volume:250,weight:60,dose:2,expected:9,published:9},
 {source:'label',total:400,volume:250,weight:70,dose:5,expected:13.125,published:13.13},
 {source:'chart',total:200,volume:50,weight:70,dose:5,expected:5.25,published:5.3},
 {source:'chart',total:200,volume:50,weight:70,dose:2,expected:2.1,published:2.1},
 {source:'chart',total:200,volume:50,weight:100,dose:4,expected:6,published:6},
 {source:'chart',total:400,volume:260,weight:70,dose:5,expected:13.65,published:13.7},
 {source:'chart',total:400,volume:260,weight:50,dose:2,expected:3.9,published:3.9},
 {source:'chart',total:400,volume:260,weight:60,dose:3,expected:7.02,published:7.0}
];
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost'),f=path.resolve(ROOT,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(ROOT+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.json':'application/json','.pdf':'application/pdf'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const report={status:'PASS',engine:'Chromium',sources,sourceCases:cases,calculations:[],layouts:[],checks:[]};
 try{
  const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await c.addInitScript(rev=>{localStorage.setItem('onboardingSeen','true');localStorage.setItem('foximed_setup_invite_v1','{"at":1}');localStorage.setItem('foximed_last_seen_version',rev);localStorage.setItem('pwaNeverShow','true');},revision);
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.locator('#loadingScreen').waitFor({state:'hidden'});
  const result=await p.evaluate(cases=>{
   const fails=[],results=[],el=id=>document.getElementById(id),enter=(id,v)=>{el(id).value=String(v);el(id).dispatchEvent(new Event('input',{bubbles:true}));},close=(a,b,n)=>{if(Math.abs(a-b)>1e-10)fails.push(n+': '+a+' != '+b);};
   AppState.settings.saveHistory=true;localStorage.setItem('calculationHistory','[]');
   for(const method of ['syringe','infusion'])for(const item of cases){
    selectDrug('dopamine');AppState.infusionMethod=method;syncCalculatorMethodButtons();
    AppState.currentAmpouleIndex=0;AppState.ampouleCount=item.total/200;AppState.useCustomDrugAmount=false;
    AppState.solutionVolume=item.volume;AppState.customVolume=true;enter('customVolume',item.volume);
    // Exercise the real weight toggle; no implicit 70 kg fallback.
    if(!AppState.useWeight)el('weightIosToggle').click();enter('patientWeight',item.weight);enter('doctorOrder',item.dose);
    AppState.reverseMode=false;updateReverseUI();runCalculation('forward');
    const forward=AppState.lastCalculation;close(forward.pumpRate,item.expected,'forward');close(forward.concentration*1000,item.total*1000/item.volume,'concentration');
    if(forward.doseUnit!=='mcg/kg/min'||forward.weight!==item.weight||forward.dripFactor!==null)fails.push('weighted record');
    const displayed=Number(el('pumpRateResult').textContent);close(displayed,Number(item.expected.toFixed(2)),'displayed precision');
    const warnings=el('warningsList').textContent;if(warnings.includes('غلظت از حد ثبت‌شدهٔ 800'))fails.push('false universal concentration maximum');
    const saved=JSON.parse(localStorage.getItem('calculationHistory'))[0];if(saved.weight!==item.weight||saved.doseUnit!=='mcg/kg/min')fails.push('saved weight/unit');
    if(!calculationText(forward).includes('mcg/kg/min'))fails.push('copy unit');
    AppState.reverseMode=true;updateReverseUI();enter('doctorOrder',item.expected);runCalculation('reverse');close(AppState.lastCalculation.dose,item.dose,'reverse');
    results.push({method,...item,actual:forward.pumpRate,displayed,reverseDose:AppState.lastCalculation.dose});
   }
   selectDrug('dopamine');AppState.useWeight=true;updateWeightBasedUnit(drugDatabase.dopamine);AppState.customVolume=false;AppState.solutionVolume=50;AppState.ampouleCount=1;AppState.useCustomDrugAmount=false;AppState.reverseMode=false;updateReverseUI();
   enter('doctorOrder','۵');enter('patientWeight','۷۰');runCalculation('forward');close(AppState.lastCalculation.pumpRate,5.25,'Persian dose and weight');
   enter('patientWeight','۸۰');runCalculation('forward');close(AppState.lastCalculation.pumpRate,6,'weight change 70 to 80');
   enter('patientWeight','');let rejected=false;try{readCalculation('forward');}catch{rejected=true;}if(!rejected)fails.push('empty weight accepted');
   enter('patientWeight',70);el('weightIosToggle').click();enter('doctorOrder',350);runCalculation('forward');close(AppState.lastCalculation.pumpRate,5.25,'absolute dose 350 mcg/min');if(AppState.lastCalculation.doseUnit!=='mcg/min'||AppState.lastCalculation.weight!==null)fails.push('absolute dose mode');
   return {fails,results};
  },cases);assert.deepEqual(result.fails,[]);report.calculations=result.results;
  report.checks.push('Published label examples and six NHS chart cells, both pump methods, exact forward/reverse values, final dilution volumes, display rounding, weight toggle, Persian input, changed/missing weight, absolute mcg/min, history/copy units and concentration warning');
  await p.locator('.tab-item[data-tab=drugs]').click();
  for(const width of [280,320,390,1280])for(const mode of ['light','dark']){
   await p.setViewportSize({width,height:844});await p.evaluate(mode=>{AppState.settings.themeMode=mode;applyThemeMode();},mode);
   for(const id of ['acarbose','acetazolamide','sulfate-atropin','furosemide','insulin-injection-human-reyular-insulin','hydrochloride-dopamine','phosphate-disopyramide']){
    await p.evaluate(id=>openDrugReferenceDrug(id),id);const card=p.locator('.drug-reference-card.open');await card.locator('.drug-reference-source-footer').waitFor();
    assert.equal(await card.locator('.drug-reference-status').count(),0,'No repeated top review note');
    const topic=card.locator('details:has(.drug-reference-timings)');await topic.locator('summary').click();
    const layout=await topic.locator('.drug-reference-timing-card').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {route:n.querySelector('h4').textContent,values:[...n.querySelectorAll('dd')].map(v=>v.textContent),overflow:n.scrollWidth-n.clientWidth,inside:[...n.querySelectorAll('dt,dd')].every(v=>{const r=v.getBoundingClientRect();return r.left>=b.left-.5&&r.right<=b.right+.5;})};}));
    assert(layout.length);for(const row of layout){assert(row.inside&&row.overflow<=1,JSON.stringify({width,mode,id,row}));assert.equal(row.values.length,3);}
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(id==='sulfate-atropin')assert(layout.some(row=>row.route.includes('خوراکی')&&row.values[0]==='½–2 h'));
    if(id==='phosphate-disopyramide')assert(layout.some(row=>row.values[2]==='1½–8½ h'));
    report.layouts.push({width,mode,id,routes:layout.length});
    if(process.env.FOXIMED_SCREENSHOT_DIR&&mode==='light'&&((width===320&&id==='acetazolamide')||(width===390&&id==='sulfate-atropin'))){fs.mkdirSync(process.env.FOXIMED_SCREENSHOT_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.FOXIMED_SCREENSHOT_DIR,id+'-'+width+'.png')});}
   }
  }
  report.checks.push('56 rendered drug views at 280/320/390/1280 px in light/dark; labelled route timings fit; corrected half and mixed fractions; no horizontal overflow; source footer retained; no repeated top note');
  assert.deepEqual(errors,[]);await c.close();fs.writeFileSync(path.join(ROOT,'reports/dopamine-and-reference-layout-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,sourceCases:cases.length,forwardReverseRuns:report.calculations.length*2,renderedViews:report.layouts.length,checks:report.checks}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
