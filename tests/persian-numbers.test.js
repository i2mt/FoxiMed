'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),ROOT=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost'),p=path.resolve(ROOT,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!p.startsWith(ROOT+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const c=await browser.newContext({serviceWorkers:'block'});await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await c.addInitScript(()=>{localStorage.setItem('onboardingSeen','true');localStorage.setItem('foximed_setup_invite_v1','{"at":1}');});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.locator('#loadingScreen').waitFor({state:'hidden'});await p.evaluate(()=>document.querySelector('#whatsNewModal').classList.remove('active'));
 const checks=await p.evaluate(()=>{
  const failures=[],check=(ok,label)=>{if(!ok)failures.push(label)},digits=(v,kind)=>String(v).replace(/\d/g,d=>String.fromCharCode((kind==='fa'?0x6f0:0x660)+Number(d))).replace(/\./g,'٫');
  function enter(id,v){const n=document.getElementById(id);n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}));return n;}
  for(const [s,n] of [['۷۰٫۵',70.5],['٧٠٫٥',70.5],['۱٬۲۳۴٫۵',1234.5],['۱۲,۵',12.5],['−۵٫۲',-5.2],['1,234.5',1234.5],['\u200f۷۰',70]])check(PersianNumbers.parseNumber(s)===n,'parse '+s);
  for(const s of ['', ' ', '70kg','7..4','۱۲،۳،۴','Infinity'])check(Number.isNaN(PersianNumbers.parseNumber(s)),'reject '+s);
  openManualCalculation();
  const fields=[...document.querySelectorAll('input[data-numeric="true"],input.numeric-input')];
  check(document.querySelectorAll('input[type=number]').length===0,'no browser-sanitized number fields');
  for(const n of fields){check(n.type==='text'&&['decimal','numeric'].includes(n.inputMode),'field keyboard '+n.id);enter(n.id,'۱۲۳٫۵');check(PersianNumbers.parseNumber(n.value)===123.5,'Persian entry '+n.id);enter(n.id,'');check(!('numericValue'in n.dataset),'clear cached value '+n.id);}
  const cases=[
   ['BMI',{bmiWeight:70.5,bmiHeight:170},'calculateBMI','bmiResult'],
   ['BSA',{bsaWeight:70.5,bsaHeight:170},'calculateBSA','bsaResult'],
   ['IBW',{ibwHeight:170},'calculateIBW','ibwResult'],
   ['CrCl',{crclAge:40,crclWeight:70.5,crclValue:1.2},'calculateCrCl','crclResult'],
   ['Temperature',{tempC:37.5},'convertTempLive','tempF','c'],
   ['Weight',{weightKg:70.5},'convertWeightLive','weightLb','kg'],
   ['Pressure',{pressurePSI:14.7},'convertPressureLive','pressureMMHG','psi'],
   ['Units',{unitFromVal:2.5},'convertUnitsLive','unitToVal','from'],
   ['Electrolytes',{electrolyteMeq:2.5},'convertElectrolyteLive','electrolyteMg','meq'],
   ['Percentage',{percentageValue:5.5,percentageVolume:100},'convertPercentageLive','percentageResult'],
   ['Drip',{dripVolume:500,dripTime:8},'calculateDripRateLive','dripResult'],
   ['Oxygen',{oxyCylinderSize:5,oxyPressure:150,oxyFlow:2},'calculateOxygen','oxyResult'],
   ['Ventilator',{ventHeight:170},'calculateVentTV','ventResult'],
   ['Nutrition',{nutWeight:70.5,nutHeight:170,nutAge:40},'calculateNutrition','nutResult']
  ];
  const read=id=>{const n=document.getElementById(id);return n instanceof HTMLInputElement?n.value:n.textContent};
  for(const [label,values,fn,result,arg] of cases){
   let latin;
   for(const kind of ['latin','fa','ar']){for(const [id,v]of Object.entries(values))enter(id,kind==='latin'?String(v):digits(v,kind));window[fn](arg);const output=read(result);check(output.trim().length>0,label+' has output');if(kind==='latin')latin=output;else check(output===latin,label+' equivalent '+kind);}
  }
  enter('bmiWeight','۷۰');enter('bmiHeight','۱۷۰');calculateBMI();check(document.getElementById('bmiResult').textContent.includes('24.2'),'known BMI 24.2');enter('bmiWeight','');calculateBMI();check(document.getElementById('bmiResult').style.display==='none','blank BMI rejected');
  selectDrug('heparin');let rate;
  for(const kind of ['latin','fa','ar']){enter('doctorOrder',kind==='latin'?'1000':digits(1000,kind));calculateInfusion();const text=document.getElementById('pumpRateResult').textContent;check(Number(text)>0,'infusion output');if(kind==='latin')rate=text;else check(text===rate,'main infusion equivalent '+kind);}
  enter('doctorOrder','');calculateInfusion();check(!('numericValue'in document.getElementById('doctorOrder').dataset),'cleared dose cache');check(document.getElementById('resultsSection').style.display==='none','cleared dose cannot reuse result');
  document.querySelector('#manualVolumePresets [data-vol="50"]').click();document.getElementById('manualDoseUnit').value='mcg/kg/min';document.getElementById('manualDrugUnit').value='mg';let manual;
  for(const kind of ['latin','fa','ar']){for(const[id,v]of Object.entries({manualDrugAmount:200,manualDesiredDose:5,manualPatientWeight:70}))enter(id,kind==='latin'?String(v):digits(v,kind));calculateManualInfusion();const text=document.getElementById('manualPumpRate').textContent;check(Number(text)>0,'manual output');if(kind==='latin')manual=text;else check(text===manual,'manual infusion equivalent '+kind);}
  enter('manualPatientWeight','');check(!('numericValue'in document.getElementById('manualPatientWeight').dataset),'manual cleared weight cache');check(document.getElementById('manualResults').style.display==='none','blank manual input hides old result');
  return {fields:fields.length,calculationCases:cases.length+2,digitSets:['Latin','Persian','Arabic'],failures};
 });
 assert.deepEqual(checks.failures,[]);
 await p.evaluate(()=>{document.getElementById('closeManualBtn').click();switchTab('tools');document.querySelector('#bmiAccordionItem .accordion-header').click();});
 await p.locator('#bmiWeight').fill('۷۰٫۵');await p.locator('#bmiHeight').fill('١٧٠');assert.equal(await p.locator('#bmiWeight').inputValue(),'70.5');assert.equal(await p.locator('#bmiHeight').inputValue(),'170');
 await p.locator('#bmiWeight').fill('');await p.locator('#bmiWeight').focus();await p.keyboard.insertText('۷۰٫۵');assert.equal(await p.locator('#bmiWeight').inputValue(),'70.5');
 await p.locator('#bmiAccordionItem .tool-btn').click();assert((await p.locator('#bmiResult').textContent()).includes('24.4'));
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(ROOT,'reports/persian-numbers-results.json'),JSON.stringify({status:'PASS',engine:'Chromium',...checks},null,2)+'\n');console.log(JSON.stringify(checks));await c.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
