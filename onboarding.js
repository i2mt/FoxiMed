/* FoxiMed quick tour: live, read-only discovery plus isolated practice. */
(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  let active=false,pending=false,step=0,saved=null,resizeObserver=null,layoutFrame=0;
  let cancelWelcome=()=>{};
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
    markInert($('greetingBanner'));
  }
  function practiceHTML(s){
    if(s.welcome)return '<div class="fm-tour-credit"><span>طراحی و توسعه</span><bdi dir="ltr">Mohammad Mahdi Taghavi</bdi></div>';
    if(s.sample)return '<div class="fm-tour-practice"><span class="fm-tour-sample-label">تمرین مستقل</span><label>حجم نمونه <bdi dir="ltr">mL</bdi><input id="tourPracticeVolume" type="number" min="1" value="100" inputmode="decimal" dir="ltr"></label><div class="fm-tour-practice-result">در مدت ۲ ساعت: <output id="tourPracticeOutput" dir="ltr">50 mL/h</output></div><small>این نمونه وارد محاسبات یا تاریخچهٔ شما نمی‌شود.</small></div>';
    if(s.search)return '<button type="button" class="fm-tour-action" data-tour-action="search"><i class="fas fa-search"></i> جست‌وجوی نمونه: آمیودارون</button>';
    if(s.topics)return '';
    if(s.tools)return '<button type="button" class="fm-tour-action" data-tour-action="tools"><i class="fas fa-search"></i> جست‌وجوی نمونه: GCS</button>';
    if(s.voice)return '<div class="fm-tour-voice-examples"><span class="fm-tour-sample-label">نمونهٔ متنی</span><button type="button" data-tour-example="مرجع دارویی را باز کن">«مرجع دارویی را باز کن»</button><button type="button" data-tour-example="چه کارهایی بلدی؟">«چه کارهایی بلدی؟»</button><p id="tourVoiceExample" role="status"></p></div>';
    return '';
  }
  function render(){
    if(!active)return;
    cancelWelcome();
    const overlay=$('onboardingOverlay'),s=steps[step];previewTab(s.tab);lockBackground();
    document.body.classList.toggle('foximed-tour-welcome',!!s.welcome);
    overlay.classList.toggle('fm-tour-welcome',!!s.welcome);
    const panel=$('foximedTourCard');
    panel.setAttribute('role',s.welcome?'dialog':'region');panel.setAttribute('aria-labelledby','tourTitle');
    if(s.welcome)panel.setAttribute('aria-modal','true');else panel.removeAttribute('aria-modal');
    panel.innerHTML='<div class="fm-tour-topline"><span class="fm-tour-location">'+esc(s.location)+'</span><button type="button" class="fm-tour-skip" id="tutorialSkipBtn">بعداً</button></div>'+
      '<div class="fm-tour-copy">'+(s.welcome?'<div class="fm-tour-brand-art"><span id="tourWelcomeFox" class="fm-tour-fox" aria-hidden="true"><img src="icons/fox-mark.png" alt="" width="112" height="112"><span class="fm-tour-fox-base"></span><span class="fm-tour-fox-fill"></span></span></div><bdi class="fm-tour-wordmark" dir="ltr">FoxiMed</bdi>':'<div class="fm-tour-section-icon" aria-hidden="true"><i class="fas '+s.icon+'"></i></div>')+
      '<h2 id="tourTitle">'+esc(s.title)+'</h2><p class="fm-tour-description">'+esc(s.text)+'</p>'+practiceHTML(s)+'</div>'+
      '<div class="fm-tour-progress" role="progressbar" aria-label="پیشرفت راهنما" aria-valuemin="1" aria-valuemax="'+steps.length+'" aria-valuenow="'+(step+1)+'">'+steps.map((_,i)=>'<span class="'+(i<=step?'done':'')+'"></span>').join('')+'</div>'+
      '<div class="fm-tour-navigation">'+(step?'<button type="button" id="tutorialBackBtn" class="fm-tour-back">قبلی</button>':'')+'<button type="button" id="tutorialNextBtn" class="fm-tour-next">'+(s.welcome?'بریم آشنا شویم':s.finish?'شروع کار':'بعدی')+'</button></div>';
    panel.tabIndex=-1;panel.focus({preventScroll:true});
    const pane=$(s.tab+'Tab');if(pane)pane.scrollTop=0;
    updateHeight();
    if(s.welcome)void animateWelcome();
  }
  async function animateWelcome(){
    let cancelled=false,observer=null,intersection=null,frame=0,visible=false,scheduled=false;
    const fox=$('tourWelcomeFox'),screen=$('loadingScreen');
    const cleanup=()=>{observer?.disconnect();intersection?.disconnect();document.removeEventListener('visibilitychange',tryStart);};
    cancelWelcome=()=>{cancelled=true;cleanup();if(frame)cancelAnimationFrame(frame);};
    const current=()=>!cancelled&&active&&step===0&&fox?.isConnected;
    const screenClear=()=>!screen||getComputedStyle(screen).display==='none';
    function tryStart(){
      if(!current()||scheduled||!visible||document.hidden||!screenClear())return;
      scheduled=true;
      // Two painted frames after readiness keep the empty silhouette visible
      // before the fill begins, including on first launch and cached replays.
      frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
        scheduled=false;if(!current()||document.hidden||!screenClear())return;
        cleanup();fox.classList.add('fm-tour-fox-ready');
      });});
    }
    const asset=new Image();asset.src='icons/fox-mark-clean-mask.png';
    let maskReady=true;
    await Promise.all([
      (asset.decode?asset.decode():new Promise((resolve,reject)=>{asset.onload=resolve;asset.onerror=reject;})).catch(()=>{maskReady=false;}),
      document.fonts?.ready||Promise.resolve(),
      document.readyState==='complete'?Promise.resolve():new Promise(resolve=>window.addEventListener('load',resolve,{once:true}))
    ]);
    if(!current())return;
    if(maskReady)fox.classList.add('fm-tour-mask-ready');
    else {fox.classList.add('fm-tour-fox-fallback');return;}
    if(screen){observer=new MutationObserver(tryStart);observer.observe(screen,{attributes:true,attributeFilter:['class','style']});}
    document.addEventListener('visibilitychange',tryStart);
    if(typeof IntersectionObserver==='function'){
      intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.5;tryStart();},{threshold:.5});intersection.observe(fox);
    }else {visible=true;tryStart();}
  }
  function queueLayout(){if(active&&!layoutFrame)layoutFrame=requestAnimationFrame(updateHeight);}
  function updateHeight(){
    layoutFrame=0;
    if(!active)return;
    const panel=$('foximedTourCard');if(!panel)return;
    const viewport=window.visualViewport, height=viewport?.height||innerHeight;
    const inset=Math.max(0,innerHeight-height-(viewport?.offsetTop||0));
    const style=document.documentElement.style;
    const headerBottom=document.querySelector('.app-header').getBoundingClientRect().bottom;
    let dockMax=Math.max(164,Math.min(260,height*.42));
    if(step){
      const css=getComputedStyle(panel),line=parseFloat(getComputedStyle(panel.querySelector('.fm-tour-description')).lineHeight);
      const chrome=['.fm-tour-topline','.fm-tour-navigation','.fm-tour-progress'].reduce((sum,selector)=>sum+panel.querySelector(selector).getBoundingClientRect().height,0)+
        parseFloat(css.paddingTop)+parseFloat(css.paddingBottom)+parseFloat(css.rowGap)*3+6;
      // Enlarged text needs a readable copy viewport as well as visible actions.
      dockMax=Math.min(Math.max(dockMax,Math.ceil(chrome+Math.max(64,line*2))),Math.max(164,height-headerBottom-inset-120));
    }
    style.setProperty('--tour-dock-bottom',(inset+8)+'px');
    style.setProperty('--tour-dock-max',dockMax+'px');
    style.setProperty('--tour-view-top',Math.ceil(headerBottom+6)+'px');
    style.setProperty('--tour-view-bottom',(Math.ceil(panel.getBoundingClientRect().height)+inset+20)+'px');
  }
  function open(){
    if(active)return;
    saved={tab:AppState.currentTab||'calculator',focus:document.activeElement,scrolls:[...document.querySelectorAll('.tab-pane')].map(n=>[n,n.scrollTop]),drug:window.FoxiMedDrugReferenceView?.capture(),tools:$('toolsSearch')?.value||''};
    pending=false;active=true;step=0;const overlay=$('onboardingOverlay');overlay.style.display='flex';overlay.classList.add('visible');document.body.classList.add('foximed-tour');
    render();if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(queueLayout);resizeObserver.observe($('foximedTourCard'));resizeObserver.observe(document.querySelector('.app-header'));}
  }
  async function close(){
    if(!active)return;
    const snapshot=saved;active=false;pending=false;resizeObserver?.disconnect();resizeObserver=null;if(layoutFrame)cancelAnimationFrame(layoutFrame);layoutFrame=0;clearLocks();
    cancelWelcome();
    const overlay=$('onboardingOverlay');overlay.classList.remove('visible','fm-tour-welcome');overlay.style.display='none';
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
    window.addEventListener('resize',queueLayout,{passive:true});
    window.visualViewport?.addEventListener('resize',queueLayout,{passive:true});
    window.visualViewport?.addEventListener('scroll',queueLayout,{passive:true});
    // The first-launch setup offers this tour explicitly; it never auto-opens.
  }
  window.FoxiMedOnboarding={setup,get active(){return active},get pending(){return pending}};
})();
