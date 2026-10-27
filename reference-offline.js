/* Opt-in reference storage. Compact invitation; management lives in Settings. */
(function(){
 'use strict';
 const VERSION='5.4.4',CACHE='FoxiMed_Reference_'+VERSION+'_full',PREFIX='FoxiMed_Reference_',MANIFEST='reference-offline-manifest.json?v=5',PREF_KEY='foximed_reference_offline_v1';
 const $=id=>document.getElementById(id),url=p=>new URL(p,document.baseURI).href,mb=n=>(n/1000000).toFixed(1)+' MB';
 let manifestPromise,running=false,checking=false,verified=false,controller,automatic=false,automaticAttempted=false,savedCount=0,totalBytes=0,progressValue=0,status='وضعیت دریافت بررسی نشده است.';
 let prefs={consented:false,autoUpdate:true,completedVersion:null,dismissed:false,pausedVersion:null};
 try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||'null');if(p&&typeof p==='object')prefs={...prefs,consented:p.consented===true,autoUpdate:p.autoUpdate!==false,completedVersion:typeof p.completedVersion==='string'?p.completedVersion:null,dismissed:p.dismissed===true,pausedVersion:typeof p.pausedVersion==='string'?p.pausedVersion:null};}catch{}
 const supported=()=>isSecureContext&&'caches'in window&&!!crypto.subtle&&'serviceWorker'in navigator;
 function remember(changes){Object.assign(prefs,changes);try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));}catch{}}
 function setStatus(value){status=value;render();}
 function render(){
  const manager=$('referenceOfflineManager');if(!manager)return;
  $('referenceOfflineStatus').textContent=status;
  $('referenceOfflineSize').textContent=totalBytes?'بستهٔ کامل: '+mb(totalBytes)+' · شامل PDF':'متن کامل مرجع و PDF';
  const button=$('referenceOfflineDownload');button.textContent=verified?'بررسی به‌روزرسانی':prefs.consented?'ادامه / به‌روزرسانی':'دریافت مرجع کامل';button.hidden=running;button.disabled=checking||!supported();
  $('referenceOfflineCancel').hidden=!running;$('referenceOfflineRemove').hidden=running||(!savedCount&&!prefs.consented&&!prefs.completedVersion);
  $('referenceOfflineAutoUpdate').checked=prefs.autoUpdate;
  const progress=$('referenceOfflineProgress');progress.hidden=!running;progress.value=progressValue;
  const prompt=$('referenceOfflinePrompt');prompt.hidden=checking||verified||prefs.dismissed||!!prefs.completedVersion||!supported();
  $('referenceOfflinePromptSize').textContent=totalBytes?mb(totalBytes):'';
  $('referenceOfflinePromptDownload').hidden=running;$('referenceOfflinePromptDownload').disabled=checking;
  $('referenceOfflinePromptDownload').textContent=prefs.consented?'ادامه':'دریافت';
  $('referenceOfflinePromptCancel').hidden=!running;$('referenceOfflinePromptDismiss').hidden=running;
  $('referenceOfflinePromptProgress').hidden=!running;$('referenceOfflinePromptProgress').value=progressValue;
  $('referenceOfflinePromptTitle').textContent=running?'دریافت مرجع آفلاین':'مرجع کامل آفلاین';
 }
 function validManifest(m,expectedVersion){return m&&(!expectedVersion||m.version===expectedVersion)&&Array.isArray(m.files)&&m.files.length>0&&m.files.every(f=>typeof f.url==='string'&&!f.url.startsWith('/')&&!f.url.includes('..')&&new URL(f.url,document.baseURI).origin===location.origin&&Number.isSafeInteger(f.bytes)&&f.bytes>0&&/^[a-f0-9]{64}$/.test(f.sha256));}
 async function manifest(fresh=false){
  if(fresh)manifestPromise=null;
  if(!manifestPromise)manifestPromise=fetch(url(MANIFEST),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('manifest');return r.json();}).then(m=>{if(!validManifest(m))throw Error('manifest');if(m.version!==VERSION)throw Error('app-update-required');return m;}).catch(e=>{manifestPromise=null;throw e;});
  return manifestPromise;
 }
 async function digest(buffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');}
 async function valid(response,file){if(!response||!response.ok)return false;const bytes=await response.arrayBuffer();return bytes.byteLength===file.bytes&&await digest(bytes)===file.sha256;}
 async function workerSupportsReference(worker=navigator.serviceWorker.controller){
  if(!worker)return false;
  return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>finish(false),1200);function finish(value){clearTimeout(timer);channel.port1.close();resolve(value);}channel.port1.onmessage=event=>finish(event.data?.referenceOfflineProtocol===1);try{worker.postMessage({type:'REFERENCE_OFFLINE_CAPABILITY'},[channel.port2]);}catch{finish(false);}});
 }
 async function migrateCompletedDownload(){
  if(prefs.consented||prefs.completedVersion)return;
  for(const name of (await caches.keys()).filter(n=>n.startsWith(PREFIX))){
   const cache=await caches.open(name),key=(await cache.keys()).find(r=>new URL(r.url).pathname.endsWith('/reference-offline-manifest.json'));if(!key)continue;
   try{const old=await(await cache.match(key)).json();if(!validManifest(old)||!old.files.some(f=>f.url.split('?')[0]==='drug-reference-source.pdf')||Array.from({length:10},(_,i)=>'drug-reference-book-'+String(i+1).padStart(2,'0')+'.js').some(name=>!old.files.some(f=>f.url.split('?')[0]===name)))continue;let complete=true;for(const f of old.files){if(!await valid(await cache.match(url(f.url)),f)){complete=false;break;}}
    if(complete){remember({consented:true,completedVersion:old.version,dismissed:true});return;}
   }catch{}
  }
 }
 async function verifyCurrent(m){
  const cache=await caches.open(CACHE);let count=0,bytes=0;
  for(const f of m.files){const response=await cache.match(url(f.url));if(await valid(response,f)){count++;bytes+=f.bytes;}else if(response)await cache.delete(url(f.url));}
  savedCount=count;totalBytes=m.files.reduce((n,f)=>n+f.bytes,0);progressValue=bytes/totalBytes*100;
  const complete=count===m.files.length;verified=complete&&await workerSupportsReference();
  if(verified){remember({consented:true,completedVersion:VERSION,pausedVersion:null});status='آمادهٔ آفلاین · نسخهٔ '+VERSION;}
  else if(complete)status='فایل‌ها ذخیره شدند؛ به‌روزرسانی برنامه را اعمال و صفحه را بازخوانی کنید.';
  else if(prefs.completedVersion&&prefs.completedVersion!==VERSION)status='نسخهٔ '+prefs.completedVersion+' ذخیره است؛ به‌روزرسانی '+VERSION+' آمادهٔ دریافت است.';
  else status=count?'دریافت ناقص است؛ می‌توانید ادامه دهید.':'مرجع کامل هنوز برای آفلاین دریافت نشده است.';
 }
 async function check({auto=false,fresh=false}={}){
  if(running||checking)return;checking=true;render();
  try{if(!supported())throw Error('unsupported');await migrateCompletedDownload();await verifyCurrent(await manifest(fresh));}
  catch(e){verified=false;status=e.message==='unsupported'?'ذخیرهٔ آفلاین در این مرورگر در دسترس نیست.':e.message==='app-update-required'?'نسخهٔ تازه‌ای آماده است؛ ابتدا به‌روزرسانی برنامه را اعمال کنید.':'بررسی ممکن نشد؛ اتصال و فضای مرورگر را بررسی کنید.';}
  finally{checking=false;render();}
  if(auto&&!verified&&prefs.consented&&prefs.completedVersion&&prefs.autoUpdate&&prefs.pausedVersion!==VERSION&&navigator.onLine&&!automaticAttempted){automaticAttempted=true;await download({automatic:true});}
 }
 async function waitForWorker(signal){
  await new Promise((resolve,reject)=>{let finished=false;const finish=error=>{if(finished)return;finished=true;clearTimeout(timer);signal.removeEventListener('abort',aborted);error?reject(error):resolve();},aborted=()=>finish(new DOMException('Cancelled','AbortError')),timer=setTimeout(()=>finish(Error('worker-unavailable')),10000);signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();else navigator.serviceWorker.ready.then(()=>finish(),finish);});
  if(!await workerSupportsReference(navigator.serviceWorker.controller||(await navigator.serviceWorker.ready).active))throw Error('worker-update-required');
 }
 async function download(options={}){
  if(running||checking)return;if(verified){await check({fresh:true});return;}
  automatic=options.automatic===true;
  if(!automatic)remember({consented:true,pausedVersion:null});
  running=true;verified=false;controller=new AbortController();render();
  try{
   if(!supported())throw Error('unsupported');
   const m=await manifest(),cache=await caches.open(CACHE);totalBytes=m.files.reduce((n,f)=>n+f.bytes,0);let done=0;
   const progress=n=>{progressValue=Math.min(totalBytes,done+n)/totalBytes*100;setStatus((automatic?'به‌روزرسانی خودکار: ':'در حال دریافت: ')+mb(Math.min(totalBytes,done+n))+' / '+mb(totalBytes));};progress(0);
   await waitForWorker(controller.signal);
   await cache.put(url(MANIFEST),new Response(JSON.stringify(m),{headers:{'Content-Type':'application/json'}}));
   for(const f of m.files){
    if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
    let response=await cache.match(url(f.url));
    if(await valid(response?.clone(),f)){done+=f.bytes;progress(0);continue;}
    response=await caches.match(url(f.url));
    if(response&&await valid(response.clone(),f)){await cache.put(url(f.url),response);done+=f.bytes;progress(0);continue;}
    response=await fetch(url(f.url),{signal:controller.signal,cache:'no-store',headers:{'X-FoxiMed-Reference-Refresh':'1'}});
    if(!response.ok||response.type==='opaque')throw Error('download');
    const chunks=[];let received=0;
    if(response.body){const reader=response.body.getReader();for(;;){const {done:ended,value}=await reader.read();if(ended)break;received+=value.byteLength;if(received>f.bytes){await reader.cancel();throw Error('integrity');}chunks.push(value);progress(received);}}
    else{const bytes=new Uint8Array(await response.arrayBuffer());chunks.push(bytes);received=bytes.byteLength;}
    const bytes=new Uint8Array(received);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
    if(received!==f.bytes||await digest(bytes)!==f.sha256)throw Error('integrity');
    if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
    const headers=new Headers(response.headers);headers.delete('content-encoding');headers.set('content-length',String(received));
    await cache.put(url(f.url),new Response(bytes,{status:200,headers}));savedCount++;done+=f.bytes;progress(0);
   }
   await verifyCurrent(m);
   if(verified)for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
  }catch(e){verified=false;status=e.name==='AbortError'?'دریافت متوقف شد؛ فایل‌های کامل برای ادامه حفظ شدند.':['worker-update-required','app-update-required'].includes(e.message)?'ابتدا به‌روزرسانی برنامه را اعمال و صفحه را بازخوانی کنید.':e.name==='QuotaExceededError'?'فضای مرورگر کافی نیست؛ پس از آزادکردن فضا ادامه دهید.':e.message==='integrity'?'یک فایل با نسخهٔ مورد انتظار مطابقت ندارد؛ دوباره تلاش کنید.':'دریافت کامل نشد؛ اتصال و فضای مرورگر را بررسی کنید.';}
  finally{running=false;automatic=false;controller=null;render();}
 }
 function cancel(){if(controller){remember({pausedVersion:VERSION});controller.abort();}}
 async function remove(){if(running||checking||!confirm('مرجع آفلاین از این مرورگر حذف شود؟'))return;for(const key of await caches.keys())if(key.startsWith(PREFIX))await caches.delete(key);remember({consented:false,completedVersion:null,dismissed:true,pausedVersion:null});verified=false;savedCount=0;progressValue=0;setStatus('بستهٔ مرجع حذف شد.');}
 async function manualUpdate(){await check({fresh:true});if(!verified&&!checking&&!running)await download();}
 function setup(){
  const host=$('drugReferenceListView'),settings=$('settings-panel-data');if(!host||!settings)return;
  const prompt=document.createElement('section');prompt.id='referenceOfflinePrompt';prompt.className='reference-offline-prompt';prompt.hidden=true;prompt.innerHTML='<div class="reference-offline-prompt-copy"><strong id="referenceOfflinePromptTitle">مرجع کامل آفلاین</strong><span id="referenceOfflinePromptSize"></span></div><button type="button" id="referenceOfflinePromptDownload">دریافت</button><button type="button" id="referenceOfflinePromptCancel" hidden>توقف</button><button type="button" id="referenceOfflinePromptDismiss">بعداً</button><progress id="referenceOfflinePromptProgress" max="100" value="0" hidden></progress>';host.prepend(prompt);
  const manager=document.createElement('section');manager.id='referenceOfflineManager';manager.className='reference-offline-manager';manager.innerHTML='<h4>مرجع دارویی آفلاین</h4><p id="referenceOfflineStatus"></p><p id="referenceOfflineSize"></p><progress id="referenceOfflineProgress" max="100" value="0" hidden></progress><div class="settings-btn-row"><button type="button" class="setting-btn" id="referenceOfflineDownload">دریافت مرجع کامل</button><button type="button" class="setting-btn" id="referenceOfflineCancel" hidden>توقف</button><button type="button" class="setting-btn" id="referenceOfflineRemove" hidden>حذف بسته</button></div><label class="reference-offline-auto"><input type="checkbox" id="referenceOfflineAutoUpdate">به‌روزرسانی خودکار همراه نسخهٔ برنامه</label><p class="settings-hint">پس از دریافت، فایل‌های تغییرکرده به‌روز می‌شوند. پاک‌سازی داده‌های مرورگر می‌تواند بسته را حذف کند.</p>';settings.prepend(manager);
  $('referenceOfflinePromptDownload').addEventListener('click',()=>download());$('referenceOfflineDownload').addEventListener('click',manualUpdate);
  for(const id of ['referenceOfflineCancel','referenceOfflinePromptCancel'])$(id).addEventListener('click',cancel);
  $('referenceOfflineRemove').addEventListener('click',remove);$('referenceOfflinePromptDismiss').addEventListener('click',()=>{remember({dismissed:true});render();});
  $('referenceOfflineAutoUpdate').addEventListener('change',e=>{remember({autoUpdate:e.target.checked,pausedVersion:null});if(!e.target.checked&&automatic)cancel();else if(e.target.checked){automaticAttempted=false;check({auto:true});}});
  const observe=(node,fn)=>{if(node)new MutationObserver(fn).observe(node,{attributes:true,attributeFilter:['class']});};
  observe($('drugsTab'),()=>{if($('drugsTab').classList.contains('active'))check({auto:true});});
  observe(settings.closest('.settings-card'),()=>{if(!settings.hidden)check();});
  window.addEventListener('online',()=>{automaticAttempted=false;check({auto:true});});
  // Fresh users never download the reference automatically. Existing opt-in packages follow app updates.
  setTimeout(async()=>{if(!supported())return;try{if(prefs.consented||(await caches.keys()).some(n=>n.startsWith(PREFIX)))await check({auto:true});}catch{}},3200);
  if($('drugsTab')?.classList.contains('active'))check({auto:true});
 }
 window.FoxiReferenceOffline={check,download,cancel,remove,manualUpdate,get state(){return{running,checking,verified,automatic,version:VERSION,completedVersion:prefs.completedVersion,autoUpdate:prefs.autoUpdate};}};
 document.addEventListener('DOMContentLoaded',setup);
})();
