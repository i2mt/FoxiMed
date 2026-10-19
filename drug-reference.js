/* FoxiMed Drug Reference: small name index, bounded results, on-demand details. */
(function () {
  'use strict';
  const PAGE_SIZE = 40;
  const $ = id => document.getElementById(id);
  const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[أإآ]/g, 'ا')
    .replace(/[\u064B-\u065F\u0670]/g, '').replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c))
    .replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c))
    .replace(/[\u200c\u200f\u200e\s\-_.()/،,]/g, '');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = { initialized: false, records: null, byId: new Map(), details: new Map(), chunks: new Map(), results: [], filter: 'all', page: 0, openId: null, mode: 'overview', request: 0, timer: null };
  const categoryNames = {
    antibiotic: ['ceftriaxone','vancomycin','amoxicillin','azithromycin','ciprofloxacin','piperacillin','meropenem','metronidazole','doxycycline','clindamycin'],
    cardio: ['amiodarone','adenosine','epinephrine','norepinephrine','nitroglycerin','furosemide','metoprolol','atropine','lidocaine'],
    anticoagulant: ['heparin','enoxaparin','aspirin','warfarin','apixaban','rivaroxaban','clopidogrel','abciximab','acetylsalicylic'],
    analgesic: ['paracetamol','acetaminophen','ibuprofen','morphine','fentanyl','midazolam','ketorolac','tramadol']
  };
  function prepare() {
    if (state.records) return;
    const sources = [window.FoxiMedDrugBookIndex || [], window.FoxiMedDrugReferenceData || [], window.FoxiMedDrugCatalog || []];
    for (const source of sources) for (const raw of source) {
      if (!raw || typeof raw.id !== 'string') continue;
      const previous = state.byId.get(raw.id);
      if (previous) {
        // Enrich discovery aliases only; never blend clinical texts from different sources.
        previous.synonyms = [...new Set([...previous.synonyms, ...(raw.synonyms || []), ...(raw.brands || []), raw.en, raw.fa].filter(Boolean))];
        continue;
      }
      const d = { ...raw, synonyms: [...(raw.synonyms || [])], brands: [...(raw.brands || [])] };
      state.byId.set(d.id, d);
      if (!d.chunk) state.details.set(d.id, d);
    }
    state.records = [...state.byId.values()];
    for (const d of state.records) {
      d._names = [d.fa, d.en, ...d.synonyms, ...d.brands].filter(Boolean).map(normalize);
      d._search = normalize([d.fa, d.en, d.classFa, d.classEn, ...d.synonyms, ...d.brands].join(' '));
      const genericName = normalize(d.en);
      d._categories = Object.keys(categoryNames).filter(key => d.category === key || categoryNames[key].some(name => genericName.includes(name)));
    }
  }
  function section(title, content) {
    return '<section class="drug-reference-section"><h3>' + esc(title) + '</h3>' + content + '</section>';
  }
  function paragraphs(value) { return '<p class="drug-reference-source-text" dir="auto">' + esc(value) + '</p>'; }
  function detailHTML(d) {
    if (d.sourceText) {
      return '<div class="drug-reference-detail-body">' + (Array.isArray(d.sections) && d.sections.length ? d.sections : [{title:'متن منبع',text:d.sourceText}]).map(s => section(s.title, paragraphs(s.text))).join('') + '</div>';
    }

    const content = [];
    if (d.brands?.length) content.push(section('نام‌های تجاری', paragraphs(d.brands.join('، '))));
    if (d.summary) content.push(section('معرفی', paragraphs(d.summary)));
    for (const [key,title] of [['uses','کاربردها'],['mechanism','مکانیسم اثر'],['dose','دوز و تجویز'],['warnings','هشدارها و احتیاطات'],['nursing','ملاحظات پرستاری'],['pregnancy','بارداری و شیردهی'],['renal','کلیه و کبد'],['interactions','تداخلات']]) {
      const value = d[key];
      if (Array.isArray(value) && value.length) content.push(section(title, '<ul>' + value.map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>'));
      else if (typeof value === 'string' && value.trim()) content.push(section(title, paragraphs(value)));
    }
    return '<div class="drug-reference-detail-body">' + content.join('') + '</div>';
  }
  function loadDetail(d) {
    if (state.details.has(d.id)) return Promise.resolve(state.details.get(d.id));
    if (!d.chunk || !/^drug-reference-book-\d{2}\.js$/.test(d.chunk)) return Promise.reject(new Error('Missing monograph'));
    if (!state.chunks.has(d.chunk)) {
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const finish = error => {
          clearTimeout(timeout); script.remove();
          if (error) { reject(error); return; }
          for (const item of window.FoxiMedDrugBookData || []) if (item?.id) state.details.set(item.id, item);
          window.FoxiMedDrugBookData = [];
          resolve();
        };
        const timeout = setTimeout(() => { script.onload = script.onerror = null; finish(new Error('Timeout')); }, 15000);
        script.src = d.chunk + '?v=2'; script.async = true;
        script.onload = () => finish();
        script.onerror = () => finish(new Error('Network or offline error'));
        document.head.appendChild(script);
      }).catch(error => { state.chunks.delete(d.chunk); throw error; });
      state.chunks.set(d.chunk, promise);
    }
    return state.chunks.get(d.chunk).then(() => {
      if (!state.details.has(d.id)) throw new Error('Monograph not found');
      return state.details.get(d.id);
    });
  }
  const palettes = {
    antibiotic: 'linear-gradient(135deg,#10b981,#0d9488)',
    cardio: 'linear-gradient(135deg,#f97316,#ef4444)',
    anticoagulant: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    analgesic: 'linear-gradient(135deg,#f59e0b,#ef4444)'
  };
  function cardHTML(d) {
    const heading = d.fa || d.en || d.id;
    const background = palettes[d._categories[0]] || 'var(--gradient-primary)';
    // The entire compact header is a native button, just like Tools. Brand,
    // classification and all clinical material belong inside the accordion.
    return '<article class="drug-reference-card" data-drug-card="' + esc(d.id) + '">' +
      '<button type="button" class="accordion-header drug-reference-card-main" data-drug-toggle="' + esc(d.id) + '" aria-expanded="false" aria-controls="drug-detail-' + esc(d.id) + '">' +
      '<span class="accordion-icon-wrap" style="background:' + background + '"><i class="fas ' + esc(d.icon || 'fa-pills') + '" aria-hidden="true"></i></span>' +
      '<span class="accordion-title-wrap"><span class="accordion-title" dir="auto" title="' + esc(heading) + '">' + esc(heading) + '</span>' +
      (d.en && d.en !== heading ? '<span class="accordion-sub" lang="en" dir="ltr" title="' + esc(d.en) + '">' + esc(d.en) + '</span>' : '') + '</span>' +
      '<i class="fas fa-chevron-down accordion-chevron" aria-hidden="true"></i></button>' +
      '<div class="drug-reference-expanded" id="drug-detail-' + esc(d.id) + '" hidden></div></article>';
  }
  function sourceFooter(d) {
    if (!d.sourceText) return '<p class="drug-reference-source-footer">منبع اختصاصی برای این مدخل ثبت نشده است.</p>';
    const pages = Array.isArray(d.sourcePdfPages) ? d.sourcePdfPages : [];
    return '<p class="drug-reference-source-footer">منبع: داروهای ژنریک ایران' + esc(pages.length ? ' · صفحات PDF: ' + pages.join('، ') : '') +
      (pages.length ? ' · <a href="drug-reference-source.pdf#page=' + pages[0] + '" target="_blank" rel="noopener">نسخهٔ اصلی</a>' : '') + '.</p>';
  }
  function formsText(d) {
    const sections = Array.isArray(d.sections) ? d.sections : [];
    const explicit = sections.find(s => normalize(s.title).includes('اشکالدارویی'));
    if (explicit) return explicit.text;
    const identity = sections.find(s => normalize(s.title).includes('شناسه'));
    if (!identity) return '';
    const lines = identity.text.split('\n');
    const start = lines.findIndex(line => normalize(line).includes('اشکالدارویی'));
    // Keep complete source lines and units; never manufacture a shorter dose.
    const formLines = [];
    for (const line of start < 0 ? [] : lines.slice(start)) {
      if (/فارماکو|اندیکاسیون|کنترا|موارد احتیاط|مراقبت|عارضه|عوارض|تداخل|شیر\s*دهی|بارداری|حاملگی|آموزش|مسمومیت/.test(line)) break;
      formLines.push(line);
    }
    return formLines.join('\n').replace(/[4△]?\s*اشکال\s*دارویی\s*موجود\s*[:：]?/g, '').trim();
  }
  function overviewHTML(d) {
    const content = [];
    const classification = d.classFa && d.classFa !== 'رده نیازمند بازبینی' ? d.classFa : d.classEn && d.classEn !== 'Drug reference' ? d.classEn : '';
    const metadata = [];
    if (classification) metadata.push('<div><dt>ردهٔ دارویی</dt><dd dir="auto">' + esc(classification) + '</dd></div>');
    if (d.brands?.length) metadata.push('<div><dt>نام‌های تجاری</dt><dd dir="auto">' + esc(d.brands.join(' · ')) + '</dd></div>');
    if (metadata.length) content.push('<dl class="drug-reference-overview-meta">' + metadata.join('') + '</dl>');
    if (d.sourceText) {
      const forms = formsText(d);
      if (forms) content.push(section('شکل‌ها و قدرت‌های دارویی', paragraphs(forms)));
      // First level contains complete source sections for identification,
      // indications and key precautions. Pregnancy/lactation, kinetics and
      // the remaining monograph stay in the second level.
      const important = (d.sections || []).filter(s => /اندیکاسیون|کنترا اندیکاسیون|موارد احتیاط/.test(s.title));
      content.push(...important.map(s => {
        const lines = s.text.split('\n');
        const pregnancy = lines.findIndex(line => /^[\s♦◊□⊡?s]*(?:مصرف\s*در\s*(?:شیر|بارداری|حاملگی)|رده\s*بندی\s*مصرف\s*در\s*حاملگی|بارداری\s*و\s*شیر)/.test(line));
        return section(s.title, paragraphs((pregnancy < 0 ? lines : lines.slice(0,pregnancy)).join('\n')));
      }));
    } else {
      if (d.summary) content.push(section('معرفی', paragraphs(d.summary)));
      for (const [key,title] of [['uses','کاربردها'],['warnings','هشدارها و احتیاطات'],['nursing','ملاحظات پرستاری']]) {
        if (Array.isArray(d[key]) && d[key].length) content.push(section(title, '<ul>' + d[key].map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>'));
      }
    }
    if (!content.length) content.push('<p class="drug-reference-status">اطلاعات مختصر بیشتری برای این مدخل ثبت نشده است.</p>');
    return '<div class="drug-reference-overview">' + content.join('') + '</div>' +
      '<div class="drug-reference-detail-toolbar"><button type="button" class="drug-reference-more" data-drug-comprehensive="' + esc(d.id) + '">اطلاعات بیشتر <i class="fas fa-chevron-down" aria-hidden="true"></i></button></div>' + sourceFooter(d);
  }
  function cardFor(id) { return [...$('drugReferenceGrid').children].find(el => el.dataset.drugCard === id); }
  function attachCloseBar(card) {
    if (typeof window.addAccordionFloatBar === 'function') {
      window.addAccordionFloatBar(card, card.querySelector('[data-drug-toggle]'), () => closeDrug(true));
    }
  }
  function closeDrug(focus = false) {
    if (!state.openId) return;
    const card = cardFor(state.openId);
    state.request++;
    if (typeof window.removeAccordionFloatBar === 'function') window.removeAccordionFloatBar();
    if (card) {
      const button = card.querySelector('[data-drug-toggle]');
      card.classList.remove('open'); button.setAttribute('aria-expanded','false');
      const detail = card.querySelector('.drug-reference-expanded'); detail.hidden = true; detail.innerHTML = '';
      if (focus) button.focus({preventScroll:true});
    }
    state.openId = null; state.mode = 'overview';
  }
  function renderPage() {
    closeDrug();
    const grid = $('drugReferenceGrid');
    const start = state.page * PAGE_SIZE;
    grid.innerHTML = state.results.slice(start,start+PAGE_SIZE).map(cardHTML).join('') || '<div class="drug-reference-empty">دارویی پیدا نشد. نام فارسی، انگلیسی یا تجاری را امتحان کنید.</div>';
    $('drugReferenceCount').textContent = state.results.length + ' نتیجه از ' + state.records.length + ' رکورد' + (state.results.length ? ' · نمایش ' + (start+1) + ' تا ' + Math.min(start+PAGE_SIZE,state.results.length) : '');
    $('drugReferencePagination').hidden = state.results.length <= PAGE_SIZE;
    $('drugReferencePrevious').disabled = state.page === 0;
    $('drugReferenceNext').disabled = start + PAGE_SIZE >= state.results.length;
    $('drugReferencePage').textContent = (state.page+1) + ' / ' + Math.max(1,Math.ceil(state.results.length/PAGE_SIZE));
  }
  function search() {
    clearTimeout(state.timer);
    const term = normalize($('drugReferenceSearch').value);
    $('drugReferenceClear').hidden = !term;
    state.results = state.records.filter(d => (!term || d._search.includes(term)) && (state.filter === 'all' || d._categories.includes(state.filter)));
    if (term) {
      const rank = d => d._names.some(n => n === term) ? 0 : d._names.some(n => n.startsWith(term)) ? 1 : 2;
      state.results.sort((a,b) => rank(a)-rank(b));
    }
    state.page = 0; renderPage();
  }
  async function showDrug(id) {
    const d = state.byId.get(id), card = cardFor(id);
    if (!d || !card) return;
    if (state.openId === id) { closeDrug(true); return; }
    closeDrug(); state.openId = id; state.mode = 'overview';
    const request = ++state.request;
    card.classList.add('open');
    const toggle = card.querySelector('[data-drug-toggle]');
    toggle.setAttribute('aria-expanded','true');
    const panel = card.querySelector('.drug-reference-expanded');
    panel.hidden = false; panel.setAttribute('aria-busy','true');
    panel.innerHTML = '<p class="drug-reference-status" role="status">در حال بارگذاری اطلاعات…</p>';
    attachCloseBar(card);
    card.scrollIntoView({behavior:'smooth',block:'start'});
    try {
      const full = await loadDetail(d);
      if (state.openId !== id || state.request !== request || !panel.isConnected) return;
      panel.innerHTML = overviewHTML(full);
    } catch (error) {
      if (state.openId !== id || state.request !== request || !panel.isConnected) return;
      panel.innerHTML = '<p class="drug-reference-status" role="alert">اطلاعات بارگذاری نشد. اتصال اینترنت را بررسی کنید.</p><div class="drug-reference-detail-toolbar"><button type="button" class="drug-reference-close" data-drug-retry="' + esc(id) + '">تلاش دوباره</button></div>';
    } finally {
      if (state.request === request) panel.removeAttribute('aria-busy');
    }
  }
  function showComprehensive(id, overview = false) {
    if (state.openId !== id) return;
    const card = cardFor(id), d = state.details.get(id);
    if (!card || !d) return;
    state.mode = overview ? 'overview' : 'comprehensive';
    const panel = card.querySelector('.drug-reference-expanded');
    panel.innerHTML = overview ? overviewHTML(d) : '<div class="drug-reference-comprehensive">' + detailHTML(d) +
      '<div class="drug-reference-detail-toolbar"><button type="button" class="drug-reference-more" data-drug-overview="' + esc(id) + '">نمایش خلاصه</button></div>' + sourceFooter(d) + '</div>';
    // Leave focus at a stable reading point without an asynchronous scroll.
    const start = panel.querySelector(overview ? '.drug-reference-overview' : '.drug-reference-comprehensive');
    start?.setAttribute('tabindex','-1');
    start?.focus({preventScroll:true});
    panel.scrollIntoView({block:'start'});
  }
  function bind() {
    $('drugReferenceSearch').addEventListener('input', () => { clearTimeout(state.timer); state.timer = setTimeout(search,80); });
    $('drugReferenceClear').addEventListener('click', () => { $('drugReferenceSearch').value=''; search(); $('drugReferenceSearch').focus(); });
    $('drugReferenceFilters').addEventListener('click', event => {
      const button = event.target.closest('[data-drug-filter]');
      if (!button) return;
      state.filter = button.dataset.drugFilter;
      for (const b of $('drugReferenceFilters').querySelectorAll('[data-drug-filter]')) {
        b.classList.toggle('active',b===button); b.setAttribute('aria-pressed',String(b===button));
      }
      search();
    });
    $('drugReferenceGrid').addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      event.stopPropagation();
      if (button.hasAttribute('data-drug-close')) closeDrug(true);
      else if (button.dataset.drugRetry) { const id=button.dataset.drugRetry; closeDrug(); void showDrug(id); }
      else if (button.dataset.drugComprehensive) showComprehensive(button.dataset.drugComprehensive);
      else if (button.dataset.drugOverview) showComprehensive(button.dataset.drugOverview, true);
      else if (button.dataset.drugToggle) void showDrug(button.dataset.drugToggle);
    });
    $('drugReferenceGrid').addEventListener('keydown', event => {
      if (event.key==='Escape' && state.openId) { event.stopPropagation(); closeDrug(true); }
    });
    for (const [id,step] of [['drugReferencePrevious',-1],['drugReferenceNext',1]]) $(id).addEventListener('click', () => {
      clearTimeout(state.timer);
      state.page = Math.max(0,Math.min(Math.ceil(state.results.length/PAGE_SIZE)-1,state.page+step));
      renderPage(); $('drugReferenceSearch').focus({preventScroll:true}); $('drugReferenceListView').scrollIntoView({block:'start'});
    });
    $('drugReferenceFilters').querySelectorAll('[data-drug-filter]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.drugFilter==='all')));
  }
  window.initDrugReference = function () {
    if (!state.initialized) { prepare(); bind(); state.initialized=true; search(); }
    else if (state.openId) { const card = cardFor(state.openId); if (card) attachCloseBar(card); }
  };
  window.openDrugReferenceDrug = function (id) {
    window.initDrugReference();
    if (!state.byId.has(id)) return;
    clearTimeout(state.timer);
    $('drugReferenceSearch').value=''; state.filter='all';
    $('drugReferenceFilters').querySelectorAll('[data-drug-filter]').forEach(b => { const all=b.dataset.drugFilter==='all'; b.classList.toggle('active',all); b.setAttribute('aria-pressed',String(all)); });
    search();
    state.page=Math.floor(state.results.findIndex(d=>d.id===id)/PAGE_SIZE); renderPage();
    void showDrug(id); cardFor(id)?.scrollIntoView({block:'start'});
  };
})();
