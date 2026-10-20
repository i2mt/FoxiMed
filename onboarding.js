/* FoxiMed quick tour: live, read-only discovery plus isolated practice. */
(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  let active=false,pending=false,step=0,saved=null,resizeObserver=null;
  const inerted=new Set();
  const steps=[
    {tab:'calculator',location:'آشنایی با برنامه',title:'به FoxiMed خوش آمدید',text:'از محاسبه تا پیدا کردن اطلاعات دارو؛ یک همراه جمع‌وجور برای شیفت شما.',icon:'fa-paw',welcome:true},
    {tab:'calculator',location:'محاسبه‌گر',title:'محاسبه، روشن و مرحله‌به‌مرحله',text:'دارو، روش تجویز و مقدارهای لازم را انتخاب کنید. نتیجه و واحد آن کنار هم نمایش داده می‌شوند.',icon:'fa-calculator',sample:true},
    {tab:'drugs',location:'مرجع دارویی',title:'داروی مورد نظرتان را پیدا کنید',text:'بیش از ۱۱۰۰ مدخل دارویی؛ با نام فارسی، انگلیسی یا تجاری جست‌وجو کنید. همین‌جا می‌توانید امتحان کنید.',icon:'fa-book-medical',search:true},
    {tab:'drugs',location:'موضوع‌های هر دارو',title:'فقط اطلاعاتی که می‌خواهید',text:'روی کارت دارو بزنید تا همهٔ موضوع‌ها را ببینید. هیچ بخشی خودکار باز نمی‌شود؛ موضوع مورد نظرتان را خودتان انتخاب کنید.',icon:'fa-list-ul',topics:true},
    {tab:'tools',location:'ابزارهای بالینی',title:'ابزار درست، سریع‌تر پیدا می‌شود',text:'مقیاس‌های بالینی، مبدل‌ها و محاسبه‌گرها در بخش ابزارها هستند. نام یک ابزار را در جست‌وجوی بالای صفحه امتحان کنید.',icon:'fa-toolbox',tools:true},
    {tab:'voice',location:'دستیار',title:'با یک جمله شروع کنید',text:'از بخش دستیار می‌توانید با صدا یا متن درخواستتان را بگویید. برای دیدن توانایی‌ها، از فاکسی بپرسید چه کارهایی بلد است.',icon:'fa-microphone',voice:true},
    {tab:'calculator',location:'آمادهٔ شروع',title:'همه چیز دم دست شماست',text:'تاریخچه با نشان ساعت و تنظیمات با چرخ‌دنده در نوار بالا در دسترس‌اند. این راهنما را هم هر زمان از تنظیمات دوباره باز کنید.',icon:'fa-check',finish:true}
  ];
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function markInert(node){if(node&&!node.inert){node.inert=true;inerted.add(node);}}
  function clearLocks(){for(const node of inerted)node.inert=false;inerted.clear();}
  function previewTab(tab){
    document.querySelectorAll('.tab-item').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));
    document.querySelectorAll('.tab-pane').forEach(n=>{const on=n.id===tab+'Tab';n.classList.toggle('active',on);n.style.display=on?'block':'none';});
    // Deliberately avoid switchTab: previewing Voice must not preload its model.
    if(tab==='drugs')window.initDrugReference?.();
    window.removeAccordionFloatBar?.();
  }
  function lockBackground(){
    clearLocks();
    markInert(document.querySelector('.app-header'));markInert(document.querySelector('.bottom-nav')||document.querySelector('.tab-bar'));
    document.querySelectorAll('.tab-item').forEach(markInert);
    const s=steps[step];
    document.querySelectorAll('.tab-pane').forEach(pane=>{
      if(pane.id!==s.tab+'Tab'||s.welcome||s.finish||!['drugs','tools'].includes(s.tab)){markInert(pane);return;}
      if(s.tab==='tools')pane.querySelectorAll('button,input,select,a,summary').forEach(n=>{if(!n.matches('#toolsSearch,#toolsSearchClear'))markInert(n);});
    });
    for(const id of ['greetingBanner','namePrompt'])markInert($(id));
  }
  function practiceHTML(s){
    if(s.welcome)return '<div class="tour-feature-row"><span><i class="fas fa-calculator"></i> محاسبه</span><span><i class="fas fa-book-medical"></i> مرجع دارویی</span><span><i class="fas fa-toolbox"></i> ابزارها</span></div><div class="tour-credit">طراحی و توسعه <bdi dir="ltr">Mohammad Mahdi Taghavi</bdi></div>';
    if(s.sample)return '<div class="tour-practice"><span class="tour-sample-label">تمرین مستقل</span><label>حجم نمونه <bdi dir="ltr">mL</bdi><input id="tourPracticeVolume" type="number" min="1" value="100" inputmode="decimal" dir="ltr"></label><div class="tour-practice-result">در مدت ۲ ساعت: <output id="tourPracticeOutput" dir="ltr">50 mL/h</output></div><small>این نمونه وارد محاسبات یا تاریخچهٔ شما نمی‌شود.</small></div>';
    if(s.search)return '<button type="button" class="tour-action" data-tour-action="search"><i class="fas fa-search"></i> جست‌وجوی نمونه: آمیودارون</button>';
    if(s.topics)return '<div class="tour-topic-hint"><span><i class="fas fa-chevron-down"></i> انتخاب کارت</span><i class="fas fa-arrow-left" aria-hidden="true"></i><span><i class="fas fa-list-ul"></i> انتخاب موضوع</span></div>';
    if(s.tools)return '<button type="button" class="tour-action" data-tour-action="tools"><i class="fas fa-search"></i> جست‌وجوی نمونه: GCS</button>';
    if(s.voice)return '<div class="tour-voice-examples"><span class="tour-sample-label">نمونهٔ متنی</span><button type="button" data-tour-example="مرجع دارویی را باز کن">«مرجع دارویی را باز کن»</button><button type="button" data-tour-example="چه کارهایی بلدی؟">«چه کارهایی بلدی؟»</button><p id="tourVoiceExample" role="status"></p></div>';
    return '<div class="tour-finish-list"><span><i class="fas fa-history"></i> تاریخچهٔ محاسبات</span><span><i class="fas fa-cog"></i> نام، ظاهر و تنظیمات</span><span><i class="fas fa-mobile-alt"></i> افزودن برنامه به صفحهٔ اصلی</span></div>';
  }
  function render(){
    if(!active)return;
    const overlay=$('onboardingOverlay'),s=steps[step];previewTab(s.tab);lockBackground();
    document.body.classList.toggle('foximed-tour-welcome',!!s.welcome);
    overlay.classList.toggle('tour-welcome',!!s.welcome);
    const panel=overlay.querySelector('.tutorial-box');
    panel.setAttribute('role',s.welcome?'dialog':'region');panel.setAttribute('aria-labelledby','tourTitle');
    if(s.welcome)panel.setAttribute('aria-modal','true');else panel.removeAttribute('aria-modal');
    panel.innerHTML='<div class="tour-topline"><span>'+esc(s.location)+'</span><button type="button" class="tour-skip" id="tutorialSkipBtn">بعداً</button></div>'+
      '<div class="tour-copy">'+(s.welcome?'<div class="tour-brand-art"><img src="icons/fox-mark.png" alt="" width="96" height="96"></div><bdi class="tour-wordmark" dir="ltr">FoxiMed</bdi>':'<div class="tour-section-icon" aria-hidden="true"><i class="fas '+s.icon+'"></i></div>')+
      '<h2 id="tourTitle">'+esc(s.title)+'</h2><p class="tour-description">'+esc(s.text)+'</p>'+practiceHTML(s)+'</div>'+
      '<div class="tour-progress" role="progressbar" aria-label="پیشرفت راهنما" aria-valuemin="1" aria-valuemax="'+steps.length+'" aria-valuenow="'+(step+1)+'">'+steps.map((_,i)=>'<span class="'+(i<=step?'done':'')+'"></span>').join('')+'</div>'+
      '<div class="tour-bottomline"><span class="tour-step-count">'+(step+1)+' از '+steps.length+'</span><div class="tour-navigation">'+(step?'<button type="button" id="tutorialBackBtn" class="tour-back">قبلی</button>':'')+'<button type="button" id="tutorialNextBtn" class="tour-next">'+(s.welcome?'بریم آشنا شویم':s.finish?'شروع کار':'بعدی')+' <i class="fas '+(s.finish?'fa-check':'fa-arrow-left')+'" aria-hidden="true"></i></button></div></div>';
    panel.tabIndex=-1;panel.focus({preventScroll:true});
    const pane=$(s.tab+'Tab');if(pane)pane.scrollTop=0;
    updateHeight();
  }
  function updateHeight(){
    if(!active)return;
    const panel=$('onboardingOverlay')?.querySelector('.tutorial-box');if(!panel)return;
    const viewport=window.visualViewport, height=viewport?.height||innerHeight;
    const inset=Math.max(0,innerHeight-height-(viewport?.offsetTop||0));
    const style=document.documentElement.style;
    style.setProperty('--tour-dock-bottom',(inset+8)+'px');
    style.setProperty('--tour-dock-max',Math.max(164,Math.min(300,height*.42))+'px');
    style.setProperty('--tour-view-top',Math.ceil(document.querySelector('.app-header').getBoundingClientRect().bottom+6)+'px');
    style.setProperty('--tour-view-bottom',(Math.ceil(panel.getBoundingClientRect().height)+inset+20)+'px');
  }
  function open(){
    if(active)return;
    saved={tab:AppState.currentTab||'calculator',focus:document.activeElement,scrolls:[...document.querySelectorAll('.tab-pane')].map(n=>[n,n.scrollTop]),drug:window.FoxiMedDrugReferenceView?.capture(),tools:$('toolsSearch')?.value||''};
    pending=false;active=true;step=0;const overlay=$('onboardingOverlay');overlay.style.display='flex';overlay.classList.add('visible');document.body.classList.add('foximed-tour');
    const pwa=$('pwaModal');if(pwa)pwa.style.display='none';
    render();if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(updateHeight);resizeObserver.observe(overlay.querySelector('.tutorial-box'));resizeObserver.observe(document.querySelector('.app-header'));}
  }
  async function close(){
    if(!active)return;
    const snapshot=saved;active=false;pending=false;resizeObserver?.disconnect();resizeObserver=null;clearLocks();
    const overlay=$('onboardingOverlay');overlay.classList.remove('visible','tour-welcome');overlay.style.display='none';
    document.body.classList.remove('foximed-tour','foximed-tour-welcome');for(const key of ['--tour-dock-bottom','--tour-dock-max','--tour-view-top','--tour-view-bottom'])document.documentElement.style.removeProperty(key);
    previewTab(snapshot.tab);
    if(window.FoxiMedDrugReferenceView&&snapshot.drug)await window.FoxiMedDrugReferenceView.restore(snapshot.drug);
    const search=$('toolsSearch');if(search){search.value=snapshot.tools;search.dispatchEvent(new Event('input',{bubbles:true}));}
    for(const [pane,top]of snapshot.scrolls)pane.scrollTop=top;
    localStorage.setItem('onboardingSeen','true');localStorage.setItem('foximed_tour_version','2');
    (snapshot.focus?.isConnected&&snapshot.focus.matches?.('button,input,select,a,summary,[tabindex]')&&snapshot.focus.getClientRects().length?snapshot.focus:$('settingsBtn'))?.focus({preventScroll:true});saved=null;
  }
  function setup(){
    const overlay=$('onboardingOverlay');if(!overlay||overlay._openTutorial)return;
    overlay._openTutorial=open;
    overlay.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.id==='tutorialSkipBtn')void close();
      else if(button.id==='tutorialBackBtn'){step--;render();}
      else if(button.id==='tutorialNextBtn'){if(step===steps.length-1)void close();else{step++;render();}}
      else if(button.dataset.tourAction==='search'){$('drugReferenceSearch').value='آمیودارون';$('drugReferenceSearch').dispatchEvent(new Event('input',{bubbles:true}));}
      else if(button.dataset.tourAction==='tools'){$('toolsSearch').value='GCS';$('toolsSearch').dispatchEvent(new Event('input',{bubbles:true}));}
      else if(button.dataset.tourExample)$('tourVoiceExample').textContent=button.dataset.tourExample==='چه کارهایی بلدی؟'?'فهرست توانایی‌ها از نشان سؤال در بخش دستیار در دسترس است.':'برای پیدا کردن دارو، نام فارسی یا انگلیسی آن را هم می‌توانید بگویید.';
    });
    overlay.addEventListener('input',event=>{if(event.target.id==='tourPracticeVolume'){const v=Number(event.target.value);$('tourPracticeOutput').textContent=Number.isFinite(v)&&v>0?String(v/2)+' mL/h':'—';}});
    document.addEventListener('keydown',event=>{
      if(!active)return;
      if(event.key==='Escape'){event.preventDefault();void close();return;}
      if(event.key!=='Tab')return;
      const nodes=[...document.querySelectorAll('.tab-pane.active button,.tab-pane.active input,.tab-pane.active select,.tab-pane.active summary,#onboardingOverlay button,#onboardingOverlay input')].filter(n=>!n.disabled&&!n.closest('[inert]')&&n.getClientRects().length);
      const index=nodes.indexOf(document.activeElement);
      if(event.shiftKey&&index<=0){event.preventDefault();nodes.at(-1)?.focus();}
      else if(!event.shiftKey&&(index<0||index===nodes.length-1)){event.preventDefault();nodes[0]?.focus();}
    });
    window.addEventListener('resize',updateHeight,{passive:true});
    window.visualViewport?.addEventListener('resize',updateHeight,{passive:true});
    window.visualViewport?.addEventListener('scroll',updateHeight,{passive:true});
    if(!localStorage.getItem('onboardingSeen')){pending=true;setTimeout(()=>{if(pending)open();},700);}
  }
  window.FoxiMedOnboarding={setup,get active(){return active},get pending(){return pending}};
})();
