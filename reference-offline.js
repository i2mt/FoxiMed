/* Explicit opt-in, integrity-checked reference + app-shell download. No voice assets. */
(function(){
 'use strict';
 const CACHE='FoxiMed_Reference_5.4.0_full',PREFIX='FoxiMed_Reference_',MANIFEST='reference-offline-manifest.json?v=1';
 let manifestPromise,running=false,controller,checking=false,verified=false;
 const $=id=>document.getElementById(id),url=p=>new URL(p,document.baseURI).href,mb=n=>(n/1000000).toFixed(1)+' MB';
 const setStatus=t=>{if($('referenceOfflineStatus'))$('referenceOfflineStatus').textContent=t;};
 const supported=()=>isSecureContext&&'caches'in window&&!!crypto.subtle&&'serviceWorker'in navigator;
 async function manifest(){
  if(!manifestPromise)manifestPromise=fetch(url(MANIFEST),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('manifest');return r.json();}).then(m=>{if(m.version!=='5.4.0'||!Array.isArray(m.files)||!m.files.length||m.files.some(f=>typeof f.url!=='string'||f.url.startsWith('/')||f.url.includes('..')||new URL(f.url,document.baseURI).origin!==location.origin||!Number.isSafeInteger(f.bytes)||f.bytes<=0||!/^[a-f0-9]{64}$/.test(f.sha256)))throw Error('manifest');return m;}).catch(e=>{manifestPromise=null;throw e;});
  return manifestPromise;
 }
 async function workerSupportsReference(worker=navigator.serviceWorker.controller){
  if(!worker)return false;
  return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>finish(false),1200);function finish(value){clearTimeout(timer);channel.port1.close();resolve(value);}channel.port1.onmessage=event=>finish(event.data?.referenceOfflineProtocol===1);try{worker.postMessage({type:'REFERENCE_OFFLINE_CAPABILITY'},[channel.port2]);}catch{finish(false);}});
 }
 async function digest(buffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');}
 async function valid(response,file){if(!response||!response.ok)return false;const bytes=await response.arrayBuffer();return bytes.byteLength===file.bytes&&await digest(bytes)===file.sha256;}
 function buttons(){const b=$('referenceOfflineDownload');if(!b)return;b.hidden=running;b.disabled=checking;$('referenceOfflineCancel').hidden=!running;$('referenceOfflineRemove').hidden=running;b.textContent=verified?'بررسی دوبارهٔ بستهٔ آفلاین':'دریافت / ادامهٔ دانلود با رضایت من';}
 async function check(){
  if(running||checking)return;checking=true;verified=false;buttons();
  try{
   if(!supported())throw Error('unsupported');
   const m=await manifest();$('referenceOfflineSize').textContent='حجم کل: '+mb(m.files.reduce((n,f)=>n+f.bytes,0))+' · متن کامل مرجع، PDF و فایل‌های لازم برنامه؛ بدون مدل دستیار';
   const cache=await caches.open(CACHE);let count=0,savedBytes=0;
   for(const f of m.files){const response=await cache.match(url(f.url));if(await valid(response,f)){count++;savedBytes+=f.bytes;}else if(response)await cache.delete(url(f.url));}
   $('referenceOfflineProgress').value=savedBytes/m.files.reduce((n,f)=>n+f.bytes,0)*100;
   const complete=count===m.files.length;verified=complete&&await workerSupportsReference();
   if(verified)setStatus('بستهٔ کامل بررسی شد و برای استفادهٔ آفلاین آماده است. مرورگر ممکن است با پاک‌سازی داده‌ها آن را حذف کند؛ در همین بخش دوباره بررسی کنید.');
   else if(complete)setStatus('همهٔ فایل‌ها ذخیره و بررسی شدند. برای استفادهٔ کامل آفلاین، به‌روزرسانی برنامه را اعمال و صفحه را بازخوانی کنید.');
   else setStatus(count?'دانلود ناقص است: '+count+' از '+m.files.length+' فایل معتبر ذخیره شده؛ می‌توانید ادامه دهید.':'برای جستجو، همهٔ مدخل‌ها و PDF بدون اینترنت، دریافت بسته را انتخاب کنید.');
  }catch(e){setStatus(e.message==='unsupported'?'این مرورگر امکان ذخیرهٔ آفلاین مطمئن را در این حالت ندارد. برنامه را در مرورگر پشتیبانی‌شده با HTTPS باز کنید.':'بررسی بسته ممکن نشد؛ اتصال و فضای مرورگر را بررسی و دوباره تلاش کنید.');}
  finally{checking=false;buttons();}
 }
 async function download(){
  if(running||checking)return;if(verified){await check();return;}
  running=true;verified=false;controller=new AbortController();buttons();
  try{
   if(!supported())throw Error('unsupported');
   const m=await manifest(),cache=await caches.open(CACHE),total=m.files.reduce((n,f)=>n+f.bytes,0);let done=0;
   const progress=n=>{const value=Math.min(total,done+n);$('referenceOfflineProgress').value=value/total*100;setStatus('در حال دریافت و بررسی: '+mb(value)+' از '+mb(total));};
   $('referenceOfflineProgress').hidden=false;progress(0);
   await cache.put(url(MANIFEST),new Response(JSON.stringify(m),{headers:{'Content-Type':'application/json'}}));
   await new Promise((resolve,reject)=>{const finish=(error)=>{clearTimeout(timer);controller.signal.removeEventListener('abort',aborted);error?reject(error):resolve();},aborted=()=>finish(new DOMException('Cancelled','AbortError')),timer=setTimeout(()=>finish(Error('worker-unavailable')),10000);controller.signal.addEventListener('abort',aborted,{once:true});navigator.serviceWorker.ready.then(()=>finish(),finish);});
   if(!await workerSupportsReference(navigator.serviceWorker.controller||(await navigator.serviceWorker.ready).active))throw Error('worker-update-required');
   for(const f of m.files){
    if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
    let response=await cache.match(url(f.url));
    if(await valid(response?.clone(),f)){done+=f.bytes;progress(0);continue;}
    // Reuse a previously visited file only after checking current expected bytes.
    response=await caches.match(url(f.url));
    if(response&&await valid(response.clone(),f)){await cache.put(url(f.url),response);done+=f.bytes;progress(0);continue;}
    response=await fetch(url(f.url),{signal:controller.signal,cache:'no-store',headers:{'X-FoxiMed-Reference-Refresh':'1'}});
    if(!response.ok||response.type==='opaque')throw Error('download');
    const chunks=[];let received=0;
    if(response.body){const reader=response.body.getReader();for(;;){const {done:ended,value}=await reader.read();if(ended)break;received+=value.byteLength;if(received>f.bytes){await reader.cancel();throw Error('integrity');}chunks.push(value);progress(received);}}
    else {const bytes=new Uint8Array(await response.arrayBuffer());chunks.push(bytes);received=bytes.byteLength;}
    const bytes=new Uint8Array(received);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
    if(received!==f.bytes||await digest(bytes)!==f.sha256)throw Error('integrity');
    if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
    const headers=new Headers(response.headers);headers.delete('content-encoding');headers.set('content-length',String(received));
    await cache.put(url(f.url),new Response(bytes,{status:200,headers}));done+=f.bytes;progress(0);
   }
   running=false;await check();
   if(verified){for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);}
  }catch(e){verified=false;setStatus(e.name==='AbortError'?'دانلود متوقف شد؛ فایل‌های کامل حفظ شدند. برای ادامه دوباره دریافت را بزنید.':e.message==='worker-update-required'?'برای دریافت کامل آفلاین، به‌روزرسانی برنامه را اعمال و صفحه را بازخوانی کنید؛ سپس ادامه دهید.':e.name==='QuotaExceededError'?'فضای مرورگر کافی نیست. فایل‌های کامل حفظ شدند؛ فضا آزاد کنید و ادامه دهید.':e.message==='integrity'?'یک فایل با نسخهٔ مورد انتظار مطابقت نداشت. بسته آماده نیست؛ پس از انتشار کامل فایل‌ها دوباره ادامه دهید.':'دریافت کامل نشد؛ اتصال و فضای مرورگر را بررسی کنید. فایل‌های معتبر برای ادامه حفظ شدند.');}
  finally{running=false;controller=null;buttons();}
 }
 async function remove(){if(running||checking||!confirm('بستهٔ دانلودشدهٔ مرجع از این مرورگر حذف شود؟'))return;for(const key of await caches.keys())if(key.startsWith(PREFIX))await caches.delete(key);verified=false;$('referenceOfflineProgress').hidden=true;setStatus('بستهٔ آفلاین حذف شد. دادهٔ دستیار و تنظیمات دست‌نخورده‌اند.');buttons();}
 function setup(){
  const host=$('drugReferenceListView');if(!host)return;
  const card=document.createElement('section');card.className='reference-offline-card';card.innerHTML='<strong>مرجع کامل دارویی آفلاین</strong><p id="referenceOfflineSize">دریافت اختیاری؛ مدل دستیار جداست.</p><p id="referenceOfflineStatus">برای استفاده بدون اینترنت، بسته را با رضایت خود دریافت کنید. ذخیره به این مرورگر محدود است.</p><progress id="referenceOfflineProgress" max="100" value="0" hidden></progress><div class="reference-offline-actions"><button type="button" id="referenceOfflineDownload">دریافت / ادامهٔ دانلود با رضایت من</button><button type="button" id="referenceOfflineCancel" hidden>توقف دانلود</button><button type="button" id="referenceOfflineRemove">حذف بستهٔ مرجع</button></div>';
  host.prepend(card);$('referenceOfflineDownload').addEventListener('click',download);$('referenceOfflineCancel').addEventListener('click',()=>controller?.abort());$('referenceOfflineRemove').addEventListener('click',remove);
  if(!supported()){$('referenceOfflineDownload').disabled=true;setStatus('ذخیرهٔ آفلاین در این مرورگر/حالت در دسترس نیست.');}
  // Verification waits until the Reference tab is actually used.
  const observer=new MutationObserver(()=>{if($('drugsTab')?.classList.contains('active'))check();});if($('drugsTab'))observer.observe($('drugsTab'),{attributes:true,attributeFilter:['class']});
  if($('drugsTab')?.classList.contains('active'))check();
 }
 window.FoxiReferenceOffline={check,download,cancel:()=>controller?.abort(),get state(){return{running,checking,verified};}};
 document.addEventListener('DOMContentLoaded',setup);
})();
