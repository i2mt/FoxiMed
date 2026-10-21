/* Optional, device-local setup and quiet feature discovery. No push notifications. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const SETUP_KEY = 'foximed_setup_v1', TIPS_KEY = 'foximed_feature_tips_v1', DAY = 86400000;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fa = value => Number(value).toLocaleString('fa-IR');
  let active = false, pending = false, step = 0, draft, snapshot, initialized = false, startupObserver,foxObserver;
  let fromSettings = false, committed = false, openingToken = 0, installOutcome = '';
  const standalone=()=>window.FoxiMedInstall?.isStandalone()||false;
  const locks = new Set();
  const themes = () => [...document.querySelectorAll('#themeSwatches [data-theme]')];
  function restoreStorage(key, value) { try { if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value); } catch {} }
  function viewport() {
    if(!active)return;
    const v=window.visualViewport, root=$('firstLaunchSetup');
    const title=root.querySelector('#setupTitle');
    root.classList.toggle('fm-setup-large-text',!!title&&parseFloat(getComputedStyle(title).fontSize)>25);
    root.style.setProperty('--fm-setup-height',(v?.height||innerHeight)+'px');
    root.style.setProperty('--fm-setup-top',(v?.offsetTop||0)+'px');
    requestAnimationFrame(()=>{
      const focus=document.activeElement,area=root.querySelector('.fm-setup-content');
      if(!area?.contains(focus)||!focus.matches('input,select,textarea,button'))return;
      const a=focus.getBoundingClientRect(),b=area.getBoundingClientRect();
      if(a.bottom>b.bottom-8)area.scrollTop+=a.bottom-b.bottom+8;
      else if(a.top<b.top+8)area.scrollTop-=b.top-a.top+8;
    });
  }
  function previewTheme() {
    AppState.settings.colorTheme=draft.colorTheme;
    AppState.settings.themeMode=draft.themeMode;
    applyThemeMode();
    // Theme helpers persist by default. Setup previews remain a draft until Save.
    restoreStorage('appSettings',snapshot.storedSettings);
    restoreStorage('theme',snapshot.storedTheme);
    syncPreview();
  }
  function syncPreview() {
    const root=$('firstLaunchSetup');
    root.querySelectorAll('[data-setup-theme]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.setupTheme===draft.colorTheme)));
    root.querySelectorAll('[data-setup-mode]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.setupMode===draft.themeMode)));
    const label=root.querySelector('#setupThemeName');
    if(label)label.textContent=themes().find(n=>n.dataset.theme===draft.colorTheme)?.querySelector('.swatch-name')?.textContent||'Fox';
  }
  function selectHTML(id,key,label,source) {
    const options=[...$(source).options].map(o=>'<option value="'+esc(o.value)+'"'+(String(draft[key])===o.value?' selected':'')+'>'+esc(o.textContent.replace(/\bcc\b/g,'میلی‌لیتر'))+'</option>').join('');
    return '<label class="fm-setup-field" for="'+id+'"><span>'+label+'</span><select id="'+id+'" data-setup-field="'+key+'">'+options+'</select></label>';
  }
  function installGuide() {
    const ua=navigator.userAgent;
    const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const embedded=/FBAN|FBAV|Instagram|Telegram|; wv\)/i.test(ua);
    let guide;
    if(ios)guide='<li>در <bdi dir="ltr">Safari</bdi>، منو و بعد «اشتراک‌گذاری» رو بزن.</li><li>«افزودن به صفحهٔ اصلی» <bdi dir="ltr">Add to Home Screen</bdi> رو انتخاب کن. اگر «باز کردن به‌عنوان برنامه» بود، روشنش کن.</li><li>«افزودن» رو بزن و از آیکون <bdi dir="ltr">FoxiMed</bdi> در صفحهٔ اصلی ادامه بده.</li>';
    else if(/SamsungBrowser/i.test(ua))guide='<li>در مرورگر سامسونگ، نشان نصب یا + کنار آدرس رو بزن؛ در بعضی نسخه‌ها از منو، «افزودن صفحه به» و سپس «صفحهٔ اصلی» رو انتخاب کن.</li><li>افزودن یا نصب رو تأیید کن و برنامه رو از آیکون <bdi dir="ltr">FoxiMed</bdi> باز کن.</li>';
    else if(/Firefox/i.test(ua)&&/Android/i.test(ua))guide='<li>منوی سه‌نقطهٔ فایرفاکس رو باز کن و «نصب» <bdi dir="ltr">Install</bdi> رو انتخاب کن.</li><li>افزودن به صفحهٔ اصلی رو تأیید کن و برنامه رو از آیکون <bdi dir="ltr">FoxiMed</bdi> باز کن.</li>';
    else if(/Android/i.test(ua))guide='<li>منوی مرورگر رو باز کن؛ دنبال «نصب برنامه» یا «افزودن به صفحهٔ اصلی» بگرد. در بعضی نسخه‌های کروم این گزینه داخل «نصب و ساخت میان‌بر» است.</li><li>نصب یا افزودن رو تأیید کن و بعد برنامه رو از آیکون <bdi dir="ltr">FoxiMed</bdi> باز کن.</li>';
    else guide='<li>از نشان نصب در نوار آدرس یا منوی مرورگر، «نصب برنامه» رو انتخاب کن.</li><li>اگر این گزینه رو ندیدی، می‌تونی فعلاً در مرورگر ادامه بدی.</li>';
    return (embedded?'<p class="fm-install-callout">این صفحه داخل یک برنامهٔ دیگه باز شده. از منوی همین صفحه، «باز کردن در مرورگر» رو انتخاب کن؛ بعد مراحل زیر رو انجام بده.</p>':'')+'<ol class="fm-install-steps">'+guide+'</ol><p class="fm-setup-note">نام گزینه‌ها ممکنه در مرورگرت کمی متفاوت باشه.</p>';
  }
  function renderInstall() {
    foxObserver?.disconnect();
    const root=$('firstLaunchSetup'),available=window.FoxiMedInstall?.available;
    const message=installOutcome==='accepted'?'نصب تأیید شد. حالا فاکسی‌مد رو از آیکون صفحهٔ اصلی باز کن؛ شخصی‌سازی اونجا شروع می‌شه.':installOutcome==='dismissed'?'اشکالی نداره؛ هر وقت خواستی می‌تونی نصب کنی یا در مرورگر ادامه بدی.':installOutcome==='failed'?'پنجرهٔ نصب باز نشد. از مراحل زیر یا منوی مرورگر استفاده کن.':'';
    root.innerHTML='<div class="fm-setup-shell fm-install-screen"><header class="fm-setup-header"><div class="fm-setup-brand"><img src="icons/fox-mark.png" width="28" height="28" alt=""><bdi dir="ltr">FoxiMed</bdi></div><button type="button" id="setupDismiss" aria-label="رد کردن و ورود به برنامه">بستن</button></header><div class="fm-setup-content"><div class="fm-setup-eyebrow">قبل از شروع</div><h2 id="setupTitle" tabindex="-1">اول نصبش کنیم؟</h2><p class="fm-setup-description">برای تجربهٔ بهتر، فاکسی‌مد رو نصب کن و از آیکونش باز کن؛ تنظیماتت رو همون‌جا انجام می‌دیم.</p><div class="fm-install-brand"><span class="fm-setup-fox fm-install-fox" id="setupInstallFox" aria-hidden="true"><img src="icons/fox-mark.png" alt=""><span class="fm-setup-fox-base"></span><span class="fm-setup-fox-fill"></span></span><span><bdi dir="ltr">FoxiMed</bdi><small>دسترسی سریع، در یک پنجرهٔ مستقل</small></span></div><p id="setupInstallStatus" class="fm-install-callout" role="status"'+(!message?' hidden':'')+'>'+esc(message)+'</p>'+installGuide()+'</div><footer class="fm-setup-footer"><p>نصب اختیاریه؛ در مرورگر هم می‌تونی ادامه بدی.</p><div class="fm-setup-actions">'+(available?'<button type="button" class="fm-setup-primary" id="setupInstall"><i class="fas fa-download" aria-hidden="true"></i> نصب فاکسی‌مد</button>':'')+'<button type="button" class="'+(available?'fm-setup-secondary':'fm-setup-primary')+'" id="setupBrowser">ادامه در مرورگر</button></div></footer></div>';
    viewport();$('setupTitle').focus({preventScroll:true});void animateFox(++openingToken,'setupInstallFox');
  }
  function render() {
    if(!active)return;
    if(step===-1){renderInstall();return}
    foxObserver?.disconnect();
    const root=$('firstLaunchSetup');
    const titles=['خوش اومدی، همکار عزیز','فاکسی‌مد به سلیقهٔ تو','متناسب با کار روزمرهٔ تو','آمادهٔ شروعی!'];
    const descriptions=['بیایم فاکسی‌مد رو کمی شبیه خودت کنیم؛ فقط سه قدم کوتاه.','رنگ و حالت نمایش رو امتحان کن؛ همین حالا تغییرش رو می‌بینی.','گزینه‌های معمولت رو انتخاب کن تا هر بار از اول شروع نکنی.','محاسبهٔ دارو، مرجع دارویی و ابزارهای بالینی در دسترس تو هستند.'];
    let content='';
    if(step===0)content='<div class="fm-setup-welcome-art"><span class="fm-setup-fox" id="setupWelcomeFox" aria-hidden="true"><img src="icons/fox-mark.png" alt=""><span class="fm-setup-fox-base"></span><span class="fm-setup-fox-fill"></span></span></div><label class="fm-setup-field" for="setupName"><span>دوست داری چی صدات کنیم؟ <small>اختیاری</small></span><input id="setupName" data-setup-field="name" type="text" maxlength="30" autocomplete="given-name" placeholder="نام شما" value="'+esc(draft.name)+'" dir="auto"></label><p class="fm-setup-note">نامت فقط روی همین دستگاه می‌مونه. بدون وارد کردن نام هم می‌تونی ادامه بدی.</p>';
    if(step===1){
      content='<div class="fm-setup-preview" aria-label="پیش‌نمایش زندهٔ ظاهر"><div class="fm-setup-preview-bar"><img src="icons/fox-mark.png" alt="" width="24" height="24"><bdi dir="ltr">FoxiMed</bdi><bdi id="setupThemeName" dir="ltr"></bdi></div><p>همراهت در شیفت‌های شلوغ</p><div class="fm-setup-preview-card"><i class="fas fa-book-medical" aria-hidden="true"></i><span>مرجع دارویی<small>پیدا کردن اطلاعات، به همین سادگی</small></span><i class="fas fa-chevron-down" aria-hidden="true"></i></div></div><fieldset class="fm-setup-choices"><legend>حالت نمایش</legend><div class="fm-setup-modes">'+[['light','روشن','sun'],['dark','تیره','moon'],['auto','همراه دستگاه','circle-half-stroke']].map(([key,label,icon])=>'<button type="button" data-setup-mode="'+key+'"><i class="fas fa-'+icon+'" aria-hidden="true"></i>'+label+'</button>').join('')+'</div></fieldset><fieldset class="fm-setup-choices"><legend>'+fa(themes().length)+' رنگ؛ کدوم بیشتر بهت میاد؟</legend><div class="fm-setup-swatches">'+themes().map(n=>'<button type="button" data-setup-theme="'+esc(n.dataset.theme)+'"><span class="fm-setup-dot" style="background:'+esc(n.querySelector('.swatch-dot').style.background)+'"></span><bdi dir="ltr">'+esc(n.querySelector('.swatch-name').textContent)+'</bdi></button>').join('')+'</div></fieldset>';
    }
    if(step===2)content='<div class="fm-setup-fields">'+selectHTML('setupPump','defaultInfusionMethod','بیشتر از کدوم پمپ استفاده می‌کنی؟','defaultInfusionMethodSelect')+selectHTML('setupSyringe','defaultSyringeVolume','حجم معمول پمپ سرنگ','defaultSyringeVolumeSelect')+selectHTML('setupInfusion','defaultInfusionVolume','حجم معمول پمپ انفوزیون','defaultInfusionVolumeSelect')+selectHTML('setupTime','timeFormat','نمایش ساعت در تاریخچه','timeFormatSelect')+'</div><p class="fm-setup-note">این‌ها فقط انتخاب‌های اولیه‌اند؛ برای هر محاسبه می‌تونی تغییرشون بدی. گزینهٔ «پیش‌فرض دارو» هم در دسترسه.</p>';
    if(step===3)content='<div class="fm-setup-ready"><img src="icons/fox-mark.png" alt="" width="64" height="64"><p>'+(draft.name?'<bdi dir="auto">'+esc(draft.name)+'</bdi> عزیز، ':'')+'همه‌چیز برای شروع آماده‌ست.</p><div class="fm-setup-destinations"><span><i class="fas fa-calculator" aria-hidden="true"></i> محاسبهٔ دارو</span><span><i class="fas fa-book-medical" aria-hidden="true"></i> مرجع دارویی</span><span><i class="fas fa-toolbox" aria-hidden="true"></i> ابزارها</span></div><p class="fm-setup-note">دوست داری یک نگاه کوتاه به بخش‌های برنامه بندازیم؟ انتخاب با توست؛ راهنما همیشه در تنظیمات هست.</p></div>';
    root.innerHTML='<div class="fm-setup-shell"><header class="fm-setup-header"><div class="fm-setup-brand"><img src="icons/fox-mark.png" width="28" height="28" alt=""><bdi dir="ltr">FoxiMed</bdi></div><button type="button" id="setupDismiss" aria-label="رد کردن و ورود به برنامه">بستن</button></header><div class="fm-setup-content"><div class="fm-setup-eyebrow">'+(step<3?'شخصی‌سازی · '+fa(step+1)+' از ۳':'به همین سادگی')+'</div><h2 id="setupTitle" tabindex="-1">'+titles[step]+'</h2><p class="fm-setup-description">'+descriptions[step]+'</p>'+content+'</div><footer class="fm-setup-footer"><p>همهٔ این انتخاب‌ها بعداً از تنظیمات قابل تغییرند.</p><div class="fm-setup-progress" aria-label="'+(step<3?'قدم '+fa(step+1)+' از ۳':'تنظیمات ذخیره شد')+'">'+[0,1,2].map(i=>'<span class="'+(i<=step?'done':'')+'"></span>').join('')+'</div><div class="fm-setup-actions">'+(step>0&&step<3?'<button type="button" class="fm-setup-secondary" id="setupBack">قبلی</button>':'')+'<button type="button" class="fm-setup-primary" id="setupNext">'+(step===2?'ذخیره و ادامه':step===3?'شروع کار':'بعدی')+'</button>'+(step===3?'<button type="button" class="fm-setup-secondary" id="setupTour">دیدن راهنما</button>':'')+'</div></footer></div>';
    syncPreview();viewport();$('setupTitle').focus({preventScroll:true});
    if(step===0)void animateFox(++openingToken);else openingToken++;
  }
  async function animateFox(token,id='setupWelcomeFox') {
    const fox=$(id),asset=new Image();asset.src='icons/fox-mark-clean-mask.png';
    try {await Promise.all([asset.decode(),document.fonts?.ready||Promise.resolve()])} catch {return}
    const current=()=>active&&fox?.isConnected&&token===openingToken;
    if(!current())return;
    fox.classList.add('fm-setup-mask-ready');
    const start=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{if(current())fox.classList.add('fm-setup-fox-ready')}));
    if(typeof IntersectionObserver==='function'){
      const observer=new IntersectionObserver(entries=>{
        if(!current()){observer.disconnect();return}
        if(entries[0].isIntersecting&&entries[0].intersectionRatio>=.5){observer.disconnect();start()}
      },{threshold:.5});foxObserver=observer;observer.observe(fox);
    }else start();
  }
  function open(installationFirst=false) {
    if(active||window.FoxiMedOnboarding?.active)return;
    pending=false;startupObserver?.disconnect();
    const settings=$('settingsModal');fromSettings=settings.classList.contains('active');
    snapshot={settings:{...AppState.settings},theme:AppState.theme,storedSettings:localStorage.getItem('appSettings'),storedTheme:localStorage.getItem('theme'),focus:document.activeElement};
    delete snapshot.settings.__loadWatchdog;
    draft={name:localStorage.getItem('userName')||'',colorTheme:AppState.settings.colorTheme||'fox',themeMode:AppState.settings.themeMode||'light',defaultInfusionMethod:AppState.settings.defaultInfusionMethod||'syringe',defaultSyringeVolume:AppState.settings.defaultSyringeVolume||'auto',defaultInfusionVolume:AppState.settings.defaultInfusionVolume||'auto',timeFormat:AppState.settings.timeFormat||'24'};
    settings.classList.remove('active');$('greetingBanner').style.display='none';
    hideTip();step=installationFirst&&!standalone()?-1:0;committed=false;active=true;installOutcome='';
    const root=$('firstLaunchSetup');root.hidden=false;document.body.classList.add('fm-setting-up','no-scroll');
    for(const n of document.body.children)if(n!==root&&!['SCRIPT','STYLE','LINK'].includes(n.tagName)&&!n.inert){n.inert=true;locks.add(n)}
    render();
  }
  function commit() {
    const {name,...preferences}=draft;
    AppState.settings={...snapshot.settings,...preferences};
    applyThemeMode();saveSettings();loadSettings();updateVolumeOptions();clearResults();
    if(name.trim())saveUserNameValue(name);
    write(SETUP_KEY,{status:'completed',at:Date.now()});
    localStorage.setItem('onboardingSeen','true');
    if(draft.colorTheme!==snapshot.settings.colorTheme||draft.themeMode!==snapshot.settings.themeMode)markUsed('theme');
    if(['defaultInfusionMethod','defaultSyringeVolume','defaultInfusionVolume'].some(k=>draft[k]!==snapshot.settings[k]))markUsed('defaults');
    committed=true;step=3;render();
  }
  function close(tour=false) {
    if(!active)return;
    if(!committed){
      AppState.settings={...snapshot.settings};applyThemeMode();
      restoreStorage('appSettings',snapshot.storedSettings);restoreStorage('theme',snapshot.storedTheme);
      write(SETUP_KEY,{status:'skipped',at:Date.now()});localStorage.setItem('onboardingSeen','true');
    }
    active=false;pending=false;openingToken++;foxObserver?.disconnect();
    $('firstLaunchSetup').hidden=true;document.body.classList.remove('fm-setting-up','no-scroll');
    for(const n of locks)n.inert=false;locks.clear();
    if(fromSettings&&!tour){$('settingsModal').classList.add('active');document.body.classList.add('no-scroll');syncSettingsViewport();}
    (snapshot.focus?.isConnected&&snapshot.focus.getClientRects().length?snapshot.focus:$('settingsBtn'))?.focus({preventScroll:true});
    window.dispatchEvent(new Event('foximed:setup-closed'));
    if(tour)showTutorial();
  }
  // Feature discovery is limited to a handful of tips on later, idle visits.
  let tipState,tipNode=null,lastActivity=Date.now(),sessionShown=false,calculationTouched=false,tipTimer,tipInterval;
  function tipSave(){write(TIPS_KEY,tipState)}
  function markUsed(key){if(!tipState)return;if(!tipState.used.includes(key)){tipState.used.push(key);tipSave()}}
  function hideTip(){clearTimeout(tipTimer);tipNode?.remove();tipNode=null;document.body.classList.remove('fm-tip-visible')}
  function drugCount(){return new Set([...(window.FoxiMedDrugBookIndex||[]),...(window.FoxiMedDrugReferenceData||[]),...(window.FoxiMedDrugCatalog||[])].map(n=>n.id)).size}
  const tips=[
    {id:'theme',text:()=>fa(themes().length)+' تم رنگی برای سلیقهٔ تو داریم؛ رنگ و حالت نمایش رو از تنظیمات انتخاب کن.',action:'انتخاب ظاهر',go:()=>openSettings('appearance')},
    {id:'bmi',text:()=> 'می‌دونستی محاسبهٔ BMI هم در بخش ابزارها در دسترسه؟',action:'رفتن به BMI',go:()=>{switchTab('tools');$('toolsSearch').value='BMI';$('toolsSearch').dispatchEvent(new Event('input',{bubbles:true}));const item=$('bmiAccordionItem');if(!item.classList.contains('open'))item.querySelector('.accordion-header').click();}},
    {id:'drugs',text:()=> 'دنبال اطلاعات یا مراقبت‌های پرستاری یک دارو هستی؟ نامش رو بین '+fa(drugCount())+' مدخل مرجع دارویی جست‌وجو کن.',action:'جست‌وجوی دارو',go:()=>{switchTab('drugs');$('drugReferenceSearch').focus()}},
    {id:'history',eligible:()=>read('calculationHistory',[]).length>0,text:()=> 'محاسبات ذخیره‌شده رو از نشان تاریخچه در نوار بالا دوباره پیدا کن.',action:'دیدن تاریخچه',go:()=>$('historyBtn').click()},
    {id:'defaults',text:()=> 'پمپ و حجم معمولت رو در تنظیمات انتخاب کن تا برای محاسبات بعدی آماده باشند.',action:'انتخاب پیش‌فرض‌ها',go:()=>openSettings('calculator')}
  ];
  function openSettings(key){$('settingsBtn').click();setSettingsSection(document.querySelector('[data-settings-section="'+key+'"]'),true);$('settings-trigger-'+key).focus();}
  function isClear() {
    if(active||pending||calculationTouched||window.FoxiMedOnboarding?.active||document.hidden||AppState.currentTab!=='calculator')return false;
    if(document.querySelector('.modal.active,.reverse-tooltip-overlay.visible'))return false;
    if($('loadingScreen')&&getComputedStyle($('loadingScreen')).display!=='none')return false;
    if($('greetingBanner')&&getComputedStyle($('greetingBanner')).display!=='none')return false;
    if(document.activeElement?.matches('input,select,textarea,[contenteditable=true]'))return false;
    if(($('doctorOrder')?.value||'').trim()||($('manualDose')?.value||'').trim()||document.querySelector('#calculatorTab .accordion-item.open'))return false;
    if($('manualSection')&&getComputedStyle($('manualSection')).display!=='none')return false;
    if($('resultsSection')&&getComputedStyle($('resultsSection')).display!=='none')return false;
    return [...document.querySelectorAll('#calculatorTab,.calculator-main')].every(n=>n.scrollTop<3)&&innerHeight>=420;
  }
  function maybeTip() {
    if(!tipState||sessionShown||AppState.settings.featureTips===false)return false;
    const now=Date.now();
    if(tipState.visits<3||now-tipState.firstVisit<2*DAY||now-tipState.lastShown<7*DAY||now-lastActivity<45000||!isClear())return false;
    const tip=tips.find(t=>!tipState.shown.includes(t.id)&&!tipState.used.includes(t.id)&&(!t.eligible||t.eligible()));
    if(!tip)return false;
    const name=(localStorage.getItem('userName')||'').trim();
    tipNode=document.createElement('aside');tipNode.id='featureTip';tipNode.className='fm-feature-tip';tipNode.setAttribute('aria-label','نکتهٔ آشنایی با برنامه');
    tipNode.innerHTML='<div class="fm-tip-copy"><strong>یک نکتهٔ کوتاه</strong><p role="status">'+(name&&tipState.shown.length===0?'<bdi dir="auto">'+esc(name)+'</bdi> عزیز، ':'')+esc(tip.text())+'</p></div><button type="button" class="fm-tip-close" aria-label="بستن نکته">×</button><div class="fm-tip-actions"><button type="button" data-tip-go>'+tip.action+'</button><button type="button" data-tip-disable>دیگر نمایش نده</button></div>';
    document.querySelector('.main-content').prepend(tipNode);document.body.classList.add('fm-tip-visible');
    if(document.querySelector('.tab-pane.active').clientHeight<160||tipNode.scrollWidth>tipNode.clientWidth+1){hideTip();return false;}
    sessionShown=true;tipState.shown.push(tip.id);tipState.lastShown=now;tipSave();
    tipNode.querySelector('.fm-tip-close').addEventListener('click',hideTip);
    tipNode.querySelector('[data-tip-disable]').addEventListener('click',()=>{AppState.settings.featureTips=false;saveSettings();$('featureTipsToggle').checked=false;hideTip()});
    tipNode.querySelector('[data-tip-go]').addEventListener('click',()=>{markUsed(tip.id);hideTip();tip.go()});
    tipTimer=setTimeout(()=>{if(!tipNode?.contains(document.activeElement))hideTip()},30000);
    return true;
  }
  function registerVisit() {
    const now=Date.now();let freshSession=false;
    try {freshSession=!sessionStorage.getItem('foximed_tip_visit');sessionStorage.setItem('foximed_tip_visit','1')} catch {freshSession=true}
    if(freshSession||now-tipState.lastVisitAt>=8*3600000){
      tipState.visits++;tipState.lastVisitAt=now;sessionShown=false;calculationTouched=false;tipSave();
    }
  }
  function setupTips() {
    const stored=read(TIPS_KEY,{}),now=Date.now();
    tipState={firstVisit:Number(stored.firstVisit)||now,lastShown:Number(stored.lastShown)||0,visits:Number(stored.visits)||0,lastVisitAt:Number(stored.lastVisitAt)||0,shown:Array.isArray(stored.shown)?stored.shown:[],used:Array.isArray(stored.used)?stored.used:[]};
    registerVisit();
    if(AppState.settings.colorTheme!=='fox'||AppState.settings.themeMode!=='light')markUsed('theme');
    if(AppState.settings.defaultSyringeVolume!=='auto'||AppState.settings.defaultInfusionVolume!=='auto'||AppState.settings.defaultInfusionMethod!=='syringe')markUsed('defaults');
    tipSave();
    const activity=event=>{if(tipNode?.contains(event.target))return;if(['pointerdown','input'].includes(event.type)&&event.target.closest?.('#calculatorTab'))calculationTouched=true;lastActivity=Date.now();if(tipNode)hideTip()};
    ['pointerdown','keydown','input','scroll','focusin'].forEach(type=>document.addEventListener(type,activity,{capture:true,passive:true}));
    document.addEventListener('visibilitychange',()=>{lastActivity=Date.now();hideTip();if(!document.hidden)registerVisit()});
    window.addEventListener('foximed:tab-changed',()=>{lastActivity=Date.now();hideTip()});
    document.addEventListener('click',event=>{
      const n=event.target;
      if(n.closest('#themeSwatches button,#themeModeButtons button,#themeToggle'))markUsed('theme');
      if(n.closest('#bmiAccordionItem .accordion-header'))markUsed('bmi');
      if(n.closest('.drug-reference-card [data-drug-toggle]'))markUsed('drugs');
      if(n.closest('#historyBtn'))markUsed('history');
    });
    document.addEventListener('change',event=>{if(event.target.matches('#defaultInfusionMethodSelect,#defaultSyringeVolumeSelect,#defaultInfusionVolumeSelect'))markUsed('defaults')});
    window.addEventListener('storage',event=>{if(event.key===TIPS_KEY){const latest=read(TIPS_KEY,null);if(latest){tipState={...tipState,...latest};hideTip()}}else if(event.key==='appSettings'){AppState.settings.featureTips=read('appSettings',{}).featureTips!==false;if(!AppState.settings.featureTips)hideTip()}});
    tipInterval=setInterval(maybeTip,15000);
    window.addEventListener('pagehide',()=>{clearInterval(tipInterval);hideTip()});
    window.addEventListener('pageshow',event=>{if(event.persisted){lastActivity=Date.now();registerVisit();clearInterval(tipInterval);tipInterval=setInterval(maybeTip,15000)}});
  }
  function setup() {
    if(initialized)return;initialized=true;
    const root=$('firstLaunchSetup');
    root.addEventListener('input',event=>{const key=event.target.dataset.setupField;if(key)draft[key]=event.target.value});
    root.addEventListener('change',event=>{const key=event.target.dataset.setupField;if(key)draft[key]=event.target.value});
    root.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.id==='setupDismiss')close();
      else if(b.id==='setupBrowser'){localStorage.setItem('pwaRemindAfter',String(Date.now()+7*DAY));step=0;render()}
      else if(b.id==='setupInstall'){b.disabled=true;b.setAttribute('aria-busy','true');b.innerHTML='<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> در حال باز کردن نصب…';window.FoxiMedInstall.request().then(outcome=>{installOutcome=outcome;if(active&&step===-1)renderInstall()})}
      else if(b.id==='setupBack'){step--;render()}
      else if(b.id==='setupNext'){if(step===2)commit();else if(step===3)close();else{step++;render()}}
      else if(b.id==='setupTour')close(true);
      else if(b.dataset.setupTheme){draft.colorTheme=b.dataset.setupTheme;previewTheme()}
      else if(b.dataset.setupMode){draft.themeMode=b.dataset.setupMode;previewTheme()}
    });
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();close();return}
      if(event.key==='Enter'&&event.target.id==='setupName'){event.preventDefault();step=1;render();return}
      if(event.key!=='Tab')return;
      const nodes=[...root.querySelectorAll('button,input,select')].filter(n=>!n.disabled&&n.getClientRects().length),index=nodes.indexOf(document.activeElement);
      if(event.shiftKey&&index<=0){event.preventDefault();nodes.at(-1)?.focus()}
      else if(!event.shiftKey&&(index<0||index===nodes.length-1)){event.preventDefault();nodes[0]?.focus()}
    });
    $('replaySetupBtn')?.addEventListener('click',()=>open());
    $('installAppSettingsBtn')?.addEventListener('click',()=>open(true));
    if(standalone())$('installAppSettingsBtn').hidden=true;
    $('featureTipsToggle')?.addEventListener('change',event=>{AppState.settings.featureTips=event.target.checked;saveSettings();if(!event.target.checked)hideTip()});
    $('timeFormatSelect')?.addEventListener('change',event=>{AppState.settings.timeFormat=event.target.value==='12'?'12':'24';saveSettings()});
    window.addEventListener('resize',viewport,{passive:true});
    window.visualViewport?.addEventListener('resize',viewport,{passive:true});
    window.visualViewport?.addEventListener('scroll',viewport,{passive:true});
    window.addEventListener('beforeinstallprompt',()=>{if(active&&step===-1)renderInstall()});
    window.addEventListener('appinstalled',()=>{installOutcome='accepted';if(active&&step===-1)renderInstall()});
    window.matchMedia('(display-mode: standalone)').addEventListener('change',()=>{if(active&&step===-1&&standalone()){step=0;render()}});
    setupTips();
    if(!read(SETUP_KEY,null)&&!HAS_PRE_V5_INSTALL){
      pending=true;
      const ready=()=>{if(!pending)return;if(getComputedStyle($('loadingScreen')).display!=='none'||document.querySelector('.modal.active'))return;open(true)};
      startupObserver=new MutationObserver(ready);startupObserver.observe(document.body,{attributes:true,subtree:true,attributeFilter:['style','class']});ready();
    }
  }
  window.FoxiMedWelcome={setup,open,get active(){return active},get pending(){return pending},get previewing(){return active&&!committed},refreshThemePreview:previewTheme};
})();
