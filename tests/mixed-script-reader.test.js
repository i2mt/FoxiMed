'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(ROOT,n),'utf8'),c=vm.createContext({window:{}});
vm.runInContext(read('drug-reference.js').replace(/\}\)\(\);\s*$/,'window.readerTest={paragraphs,inlineText,detailHTML,systemRows,digitText};})();'),c);
for(let i=1;i<=10;i++)vm.runInContext(read(`drug-reference-book-${String(i).padStart(2,'0')}.js`),c);
vm.runInContext(read('drug-reference-presentation.js'),c);
const r=c.window.readerTest,book=c.window.FoxiMedDrugBookData,d=book.find(d=>d.id==='acetaminophen-paracetamol');
const decode=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const numberSource=s=>s.replace(/<bdi[^>]*data-source-number="([^"]*)"[^>]*>[\s\S]*?<\/bdi>/g,(_,v)=>v);
const bag=s=>[...r.digitText(s).replace(/[\s()]/g,'')].sort().join('');
const adverse=d.sections.find(s=>s.title==='عوارض جانبی').text;
const adverseHTML=r.paragraphs(adverse);
for(const label of ['Hep','Hem','Met','Derm'])assert(adverseHTML.includes('>'+label+':</bdi>'),label+': distinct category label');
assert.equal((adverseHTML.match(/class="drug-reference-system-row"/g)||[]).length,4);
assert(adverseHTML.includes('آسیب شدید کبدی')&&adverseHTML.includes('هیپوگلیسمی')&&adverseHTML.includes('کهیر ،خارش'));
let systemSections=0;
for(const drug of book)for(const section of drug.sections){
 const html=r.paragraphs(section.text);
 if(!html.includes('drug-reference-system-group'))continue;
 // Check the actual displayed text too, independently of the saved source anchor.
 const expected=section.text.replace(/^[X?4]\s*(?=(?:رده بندی|نام تجاری|اشکال دارویی))/gm,'').replace(/^\?\s*(?=[A-Za-z])/gm,'• ');
 assert.equal(bag(decode(numberSource(html))),bag(expected),drug.id+': category layout dropped/added source characters');systemSections++;
}
for(const [text,labels]of [['گیجی ،درد :CNS\nادامهٔ شرح',['CNS']],[':Hepآسیب کبدی :Metهیپوگلیسمی',['Hep','Met']],['GI: تهوع\nادامه\nCV: تپش قلب',['GI','CV']],[':Hypersensitivityکهیر و خارش',['Hypersensitivity']]]){
 const html=r.paragraphs(text);assert.equal((html.match(/class="drug-reference-system-row(?:[^"]*)"/g)||[]).length,labels.length);assert.equal(bag(decode(numberSource(html))),bag(text));
}
for(const [source,expected]of [['۲۴ تا ۷۲ ساعت','24–72'],['۷۲تا۹۶ساعت','72–96'],['نسبت ۱:۲','1:2'],['کسر ۱/۲','1/2']])assert(decode(r.inlineText(source)).includes(expected),source);
const full=r.detailHTML(d),updates=c.window.FoxiMedReferencePresentation.clinicalSections[d.id];
assert.equal(updates.length,1);assert(d.sections.some(s=>s.text===updates[0].original));
for(const expected of ['0–24','24–72','72–96'])assert(full.includes(expected),'Current acute poisoning stage '+expected);
assert(full.includes('بیش از')&&full.includes('5')&&full.includes('روز'));
for(const stale of ['21–42','42–84','27–69'])assert(!full.includes(stale),'Legacy erroneous stage range '+stale);
assert(full.includes(updates[0].sourceUrl));assert(!full.includes('class="drug-reference-status"'));
const stale=r.detailHTML({...d,sections:d.sections.map(s=>({...s,text:s.text+' Updated'}))});assert(!stale.includes(updates[0].sourceUrl),'Source update must require exact anchor');
const report={status:'PASS',systemSections,checks:['Four separate acetaminophen adverse-effect labels','Prefix/suffix labels and wrapped continuations','Displayed character inventory across all system-labelled sections','Atomic Persian تا ranges, ratios and slash notation','Exact-anchor clinical update with footer attribution; no generic top warning'],browserLayouts:[]};
async function browserChecks(){
 const http=require('node:http'),{chromium}=require('playwright');
 const revision=read('script.js').match(/const RELEASE_NOTES_REVISION = '([^']+)'/)[1];
 const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost'),f=path.resolve(ROOT,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(ROOT+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.json':'application/json'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
  const ctx=await b.newContext({serviceWorkers:'block'});await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await ctx.addInitScript(rev=>{localStorage.setItem('onboardingSeen','true');localStorage.setItem('foximed_setup_invite_v1','{"at":1}');localStorage.setItem('foximed_last_seen_version',rev);localStorage.setItem('pwaNeverShow','true');},revision);
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.locator('#loadingScreen').waitFor({state:'hidden'});await p.evaluate(()=>switchTab('drugs'));await p.evaluate(()=>openDrugReferenceDrug('acetaminophen-paracetamol'));const card=p.locator('.drug-reference-card.open');await card.locator('.drug-reference-source-footer').waitFor();
  for(const width of [280,320,390,1280])for(const mode of ['light','dark']){
   await p.setViewportSize({width,height:844});await p.evaluate(mode=>{AppState.settings.themeMode=mode;applyThemeMode();},mode);
   for(const title of ['عوارض جانبی','مسمومیت و درمان']){
    const topic=card.locator('details').filter({has:p.locator('summary span',{hasText:title})});if(await topic.getAttribute('open')===null)await topic.locator('summary').click();
    if(title==='عوارض جانبی'){
     assert.deepEqual(await topic.locator('.drug-reference-system-label').allTextContents(),['Hep:','Hem:','Met:','Derm:']);
     const rows=await topic.locator('.drug-reference-system-row').evaluateAll(ns=>ns.map(n=>{const l=n.querySelector('.drug-reference-system-label').getBoundingClientRect(),t=n.querySelector('p').getBoundingClientRect();return {overlap:l.left<t.right-1&&t.left<l.right-1&&l.top<t.bottom-1&&t.top<l.bottom-1,overflow:n.scrollWidth-n.clientWidth};}));assert(rows.every(r=>!r.overlap&&r.overflow<=1));
    }else{
     const quantities=await topic.locator('.drug-reference-measure').evaluateAll(ns=>ns.filter(n=>/^(0–24|24–72|72–96)$/.test(n.textContent)).map(n=>{const a=document.createRange(),z=document.createRange(),t=n.firstChild;a.setStart(t,0);a.setEnd(t,1);z.setStart(t,t.length-1);z.setEnd(t,t.length);return {text:n.textContent,first:a.getBoundingClientRect().left,last:z.getBoundingClientRect().left,nowrap:getComputedStyle(n).whiteSpace,lines:n.getClientRects().length};}));assert.equal(quantities.length,3);assert(quantities.every(q=>q.first<q.last&&q.nowrap==='nowrap'&&q.lines===1));
    }
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    report.browserLayouts.push({width,mode,title});
    if(process.env.FOXIMED_SCREENSHOT_DIR&&[320,1280].includes(width)&&mode==='dark'){fs.mkdirSync(process.env.FOXIMED_SCREENSHOT_DIR,{recursive:true});await topic.locator(title==='عوارض جانبی'?'.drug-reference-system-row':'.drug-reference-item').first().scrollIntoViewIfNeeded();await p.waitForTimeout(150);await p.screenshot({path:path.join(process.env.FOXIMED_SCREENSHOT_DIR,(title==='عوارض جانبی'?'adverse':'poisoning')+'-'+width+'.png')});}
   }
  }
  await p.evaluate(()=>openDrugReferenceDrug('captopril'));const longCard=p.locator('.drug-reference-card.open');await longCard.locator('.drug-reference-source-footer').waitFor();const longTopic=longCard.locator('details:has(.drug-reference-system-long-label)');await longTopic.locator('summary').click();
  for(const width of [320,390]){await p.setViewportSize({width,height:844});const row=longTopic.locator('.drug-reference-system-long-label').first();const layout=await row.evaluate(n=>({labelBottom:n.querySelector('.drug-reference-system-label').getBoundingClientRect().bottom,textTop:n.querySelector('p').getBoundingClientRect().top,overflow:n.scrollWidth-n.clientWidth}));assert(layout.labelBottom<=layout.textTop+1&&layout.overflow<=1);report.browserLayouts.push({width,mode:'dark',title:'captopril: long category label'});}
  assert.deepEqual(errors,[]);await ctx.close();
 }finally{await b.close();server.close();}
}
(async()=>{if(process.argv.includes('--ui'))await browserChecks();fs.writeFileSync(path.join(ROOT,'reports/mixed-script-reader-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));})().catch(e=>{console.error(e);process.exit(1)});
