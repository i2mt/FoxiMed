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
  const state = { initialized: false, records: null, byId: new Map(), details: new Map(), chunks: new Map(), results: [], filter: 'all', page: 0, openId: null, request: 0, timer: null };
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
  const hasPersianLetters = value => /[\u0621-\u064A\u066E-\u06D3]/.test(value);
  // Repair only reversed paired brackets, not words, numbers or clinical scope.
  // Unpaired source brackets remain visible and independently isolated.
  function repairParentheses(value) {
    let text = String(value).replace(/\)\s*\(\s*([A-Za-z][A-Za-z0-9/.-]*)/g, '($1)');
    const chars = [...text], openings = [], reversed = [];
    for (let i=0;i<chars.length;i++) {
      if (chars[i] === '(') {
        if (!openings.length && reversed.length) { chars[reversed.pop()] = '('; chars[i] = ')'; }
        else openings.push(i);
      } else if (chars[i] === ')') {
        if (openings.length) openings.pop(); else reversed.push(i);
      }
    }
    return chars.join('');
  }
  function latinRuns(value) {
    const run = /[A-Za-z0-9۰-۹٠-٩µμ][A-Za-z0-9۰-۹٠-٩µμ%٪°²³+.,٫٬/: \t\n\-−–]*/g;
    let out = '', cursor = 0;
    for (const match of String(value).matchAll(run)) {
      const text = match[0], measured = /[0-9۰-۹٠-٩]/.test(text) && text.trim().length <= 32;
      const inner = esc(text).replace(/([0-9۰-۹٠-٩])(?=[A-Za-zµμ])/g, '$1<span class="drug-reference-unit-gap" aria-hidden="true"></span>');
      out += esc(String(value).slice(cursor, match.index)) + '<bdi dir="ltr" class="drug-reference-ltr' + (measured ? ' drug-reference-measure' : '') + '">' + inner + '</bdi>';
      cursor = match.index + text.length;
    }
    return out + esc(String(value).slice(cursor));
  }
  function inlineText(value) {
    const text = String(value); let result = '', start = 0;
    for (let i=0;i<text.length;i++) {
      if (text[i] !== '(' && text[i] !== ')') continue;
      result += latinRuns(text.slice(start,i));
      let end = -1;
      if (text[i] === '(') {
        let depth=1;
        for (let j=i+1;j<text.length;j++) { if (text[j]==='(') depth++; if(text[j]===')'&&!--depth){end=j;break;} }
      }
      if (end>=0) {
        const inner=text.slice(i+1,end), dir=hasPersianLetters(inner)?'rtl':'ltr';
        result += '<bdi class="drug-reference-parenthesis" dir="' + dir + '">(' + inlineText(inner) + ')</bdi>';
        i=end;
      } else result += '<bdi dir="ltr" class="drug-reference-orphan-bracket">' + text[i] + '</bdi>';
      start=i+1;
    }
    return result + latinRuns(text.slice(start));
  }
  function paragraphs(value, preserveLines = false) {
    const blocks = []; let lines = [], type = 'paragraph';
    const flush = () => {
      if (!lines.length) return;
      const source = lines.join(' ').trim();
      const marker = source.match(/^\(([۰-۹٠-٩0-9]{1,2})(?=[^۰-۹٠-٩0-9]|$)/);
      const text = repairParentheses(marker ? source.slice(marker[0].length) : source);
      const direction = hasPersianLetters(text) ? 'rtl' : 'ltr';
      blocks.push('<p class="drug-reference-source-text drug-reference-' + type + '" dir="' + direction + '">' + (marker ? '<bdi dir="ltr" class="drug-reference-instruction-index">' + esc(marker[1]) + '</bdi> ' : '') + inlineText(text) + '</p>');
      lines = [];
    };
    for (let line of String(value || '').split('\n')) {
      line = line.trim();
      if (!line) { flush(); continue; }
      if (preserveLines) flush();
      const bullet = /^[•♦◊□]/.test(line);
      const numbered = /^[(（]?[۰-۹٠-٩0-9]{1,2}[)）]/.test(line) || /^[(（][۰-۹٠-٩0-9]{1,2}/.test(line);
      const metadata = /^[X?4]*\s*(?:رده بندی|نام تجاری|اشکال دارویی)/.test(line);
      if (metadata) line = line.replace(/^[X?4]\s*/, '');
      const form = /^\?\s*[A-Za-z]/.test(line);
      if (form) line = line.replace(/^\?\s*/, '• ');
      const system = /^:?(?:CNS|CV|GI|GU|EENT|Hem|Resp|Derm|Other|other)\b/.test(line) || /:(?:CNS|CV|GI|GU|EENT|Hem|Resp|Derm)$/.test(line);
      if (bullet || numbered || system || metadata || form) flush();
      if (!lines.length) type = bullet || numbered || form ? 'item' : system || metadata ? 'system' : 'paragraph';
      // A PDF line break is a typesetting boundary, not a new sentence.
      lines.push(line);
    }
    flush();
    return '<div class="drug-reference-prose">' + blocks.join('') + '</div>';
  }
  const readableTitles = {
    'اندیکاسیون، راه مصرف و دوز':'کاربرد، راه مصرف و دوز',
    'کنترا اندیکاسیون':'موارد منع مصرف',
    'فارماکودینامیک و فارماکوکینتیک':'مکانیسم اثر و سرنوشت دارو در بدن',
    'شناسه و رده‌بندی':'شناسه، رده‌بندی و بارداری',
    'شیردهی و کودکان':'شیردهی و کودکان'
  };
  function section(title, content, options = {}) {
    const display = readableTitles[title] || title;
    const tone = /منع|کنترا|احتیاط|هشدار|مسمومیت/.test(title) ? ' safety' : '';
    return '<details name="drug-reference-topic" class="drug-reference-section' + tone + '"' + '' + '><summary><span>' + esc(display) + '</span><i class="fas fa-chevron-down" aria-hidden="true"></i></summary><div class="drug-reference-section-content">' + content + '</div></details>';
  }
  function sectionText(s) {
    // Remove only a repeated printed label, never the text following its colon.
    const lines = s.text.split('\n');
    const label = /^[ ?4Xs}♦◊□⊡△⋆•]*(?:اندیکاسیون[^:：]*|کنترا اندیکاسیون|موارد احتیاط|عوارض جانبی|عارضه جانبی|تداخلات دارویی|مسمومیت و درمان|مراقبت های پرستاری و توجهات ویژه|آموزش به بیمار و خانواده|فارماکودینامیک و فارماکوکینتیک|اشکال دارویی موجود|مصرف در شیر دهی و کودکان|شرایط نگهداری)\s*[:：]\s*/;
    lines[0] = lines[0].replace(label, '');
    if (/^:\s*/.test(lines[0]) && lines[0].length < 110 && /اندیکاسیون/.test(lines[0]) && /دوز/.test(lines[0])) lines[0] = '';
    return lines.join('\n').trim();
  }
  function metadataHTML(d) {
    const classification = d.classFa && d.classFa !== 'رده نیازمند بازبینی' ? d.classFa : d.classEn && d.classEn !== 'Drug reference' ? d.classEn : '';
    const bits = [];
    if (d.brands?.length) bits.push('<div class="drug-reference-meta-item"><span class="drug-reference-meta-icon" aria-hidden="true"><i class="fas fa-tag"></i></span><div><dt>نام‌های تجاری</dt><dd class="drug-reference-brand-list">' + d.brands.map(name => '<bdi dir="auto" class="drug-reference-brand">' + inlineText(name) + '</bdi>').join('') + '</dd></div></div>');
    if (classification) bits.push('<div class="drug-reference-meta-item"><span class="drug-reference-meta-icon" aria-hidden="true"><i class="fas fa-layer-group"></i></span><div><dt>ردهٔ دارویی</dt><dd>' + inlineText(classification) + '</dd></div></div>');
    return bits.length ? '<dl class="drug-reference-metadata">' + bits.join('') + '</dl>' : '';
  }
  function detailHTML(d) {
    const topics = [];
    if (d.sourceText) {
      const forms = formsText(d);
      const sections = Array.isArray(d.sections) && d.sections.length ? d.sections : [{title:'متن منبع',text:d.sourceText}];
      for (const s of sections) {
        if (/اشکال دارویی/.test(s.title) && forms) {
          topics.push({title:'شکل‌ها و قدرت‌های دارویی',text:forms,forms:true});
          continue;
        }
        let text=sectionText(s);
        if (/شناسه/.test(s.title)) {
          const lines=text.split('\n'), firstEnglish=d.sourceHeading?.en?.match(/[A-Za-z]+/)?.[0];
          if(firstEnglish && lines[0]?.includes(firstEnglish) && !lines[0].includes(':')) lines.shift();
          text=lines.filter(line=>!((d.brands?.length || line.trim()==='نام تجاری') && /نام تجاری/.test(line))).join('\n').trim();
        }
        if (forms && /شناسه/.test(s.title)) {
          const lines=text.split('\n'), first=lines.findIndex(line=>/اشکال\s*دارویی/.test(line));
          if (first>=0) {
            const offset=lines.slice(first+1).findIndex(line=>/فارماکو|اندیکاسیون|کنترا|موارد احتیاط|مراقبت|عارضه|عوارض|تداخل|مصرف در شیر|آموزش|مسمومیت/.test(line));
            lines.splice(first,offset<0?lines.length-first:offset+1); text=lines.join('\n').trim();
          }
        }
        if (text) topics.push({...s,text});
        // Forms belong immediately after the opening identity/classification
        // block, where they appear in the PDF. All other topics retain source order.
        if (forms && /شناسه/.test(s.title) && !sections.some(item=>/اشکال دارویی/.test(item.title))) topics.push({title:'شکل‌ها و قدرت‌های دارویی',text:forms,forms:true});
      }
    } else {
      if (d.summary) topics.push({title:'معرفی',text:d.summary});
      for (const [key,title] of [['mechanism','مکانیسم اثر'],['uses','کاربردها'],['dose','دوز و تجویز'],['warnings','هشدارها و احتیاطات'],['interactions','تداخلات'],['renal','کلیه و کبد'],['nursing','ملاحظات پرستاری'],['pregnancy','بارداری و شیردهی']]) {
        const value = d[key];
        if (Array.isArray(value) && value.length) topics.push({title,text:value.map(s=>'• '+s).join('\n')});
        else if (typeof value === 'string' && value.trim()) topics.push({title,text:value});
      }
    }
    const heading = '<div class="drug-reference-reader-heading"><h3>اطلاعات دارو</h3><p>موضوع مورد نظرتان را انتخاب کنید</p></div>';
    return '<div class="drug-reference-reader"><p class="drug-reference-status">'+(d.sourceText?'متن استخراج‌شده از کتاب؛ بازبینی مستقل بالینی تکمیل نشده و تاریخ بازبینی بالینی ثبت نشده است. برای دوز و تصمیم درمانی، نسخهٔ اصلی و منبع به‌روز را بررسی کنید.':'منبع اختصاصی و تاریخ بازبینی بالینی ثبت نشده است؛ اطلاعات این مدخل نیازمند تأیید با منبع به‌روز است.')+'</p>' + metadataHTML(d) + heading + '<div class="drug-reference-detail-body" data-drug-topics>' +
      topics.map(s=>section(s.title, s.forms ? '<div class="drug-reference-form-rows">' + paragraphs(s.text,true) + '</div>' : paragraphs(s.text,/شناسه/.test(s.title)))).join('') +
      (!topics.length ? '<p class="drug-reference-status">اطلاعات تفصیلی برای این مدخل ثبت نشده است.</p>' : '') + '</div>' + sourceFooter(d) + '</div>';
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
        script.src = d.chunk + '?v=4'; script.async = true;
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
      '<span class="accordion-title-wrap"><span class="accordion-title" dir="' + (/[\u0600-\u06ff]/.test(heading) ? 'rtl' : 'ltr') + '" title="' + esc(heading) + '">' + inlineText(heading) + '</span>' +
      (d.en && d.en !== heading ? '<span class="accordion-sub" lang="en" dir="ltr" title="' + esc(d.en) + '">' + esc(d.en) + '</span>' : '') + '</span>' +
      '<i class="fas fa-chevron-down accordion-chevron" aria-hidden="true"></i></button>' +
      '<div class="drug-reference-expanded" id="drug-detail-' + esc(d.id) + '" hidden></div></article>';
  }
  function sourceFooter(d) {
    if (!d.sourceText) return '<p class="drug-reference-source-footer">منبع اختصاصی برای این مدخل ثبت نشده است.</p>';
    const pages = Array.isArray(d.sourcePdfPages) ? d.sourcePdfPages : [];
    return '<p class="drug-reference-source-footer" dir="rtl">منبع: داروهای ژنریک ایران' + (pages.length ? ' · صفحات PDF: ' + pages.map(n => '<bdi dir="ltr">' + esc(n) + '</bdi>').join('، ') : '') +
      (pages.length ? ' · <a href="drug-reference-source.pdf#page=' + pages[0] + '" target="_blank" rel="noopener">نسخهٔ اصلی</a>' : '') + '.</p>';
  }
  function tidyForms(value) {
    return value.split('\n').map(line => {
      if (!/[\u0600-\u06ef]/.test(line) && /^\)\s*\?\s*[A-Za-z]/.test(line) && line.includes('(')) {
        return '• ' + line.replace(/^\)\s*\?\s*/, '').trim() + ')';
      }
      return line.replace(/^\?\s*(?=[A-Za-z])/, '• ');
    }).join('\n');
  }
  function formsText(d) {
    const sections = Array.isArray(d.sections) ? d.sections : [];
    const explicit = sections.find(s => normalize(s.title).includes('اشکالدارویی'));
    if (explicit) return tidyForms(sectionText(explicit));
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
    return tidyForms(formLines.join('\n').replace(/[4△]?\s*اشکال\s*دارویی\s*موجود\s*[:：]?/g, '').trim());
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
    state.openId = null;
  }
  function renderPage() {
    closeDrug();
    const grid = $('drugReferenceGrid');
    const start = state.page * PAGE_SIZE;
    grid.innerHTML = state.results.slice(start,start+PAGE_SIZE).map(cardHTML).join('') || '<div class="drug-reference-empty">دارویی پیدا نشد. نام فارسی، انگلیسی یا تجاری را امتحان کنید.</div>';
    $('drugReferenceCount').innerHTML = inlineText(state.results.length + ' نتیجه از ' + state.records.length + ' رکورد' + (state.results.length ? ' · نمایش ' + (start+1) + ' تا ' + Math.min(start+PAGE_SIZE,state.results.length) : ''));
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
    closeDrug(); state.openId = id;
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
      panel.innerHTML = detailHTML(full);
    } catch (error) {
      if (state.openId !== id || state.request !== request || !panel.isConnected) return;
      panel.innerHTML = '<p class="drug-reference-status" role="alert">اطلاعات بارگذاری نشد. اتصال اینترنت را بررسی کنید.</p><div class="drug-reference-detail-toolbar"><button type="button" class="drug-reference-close" data-drug-retry="' + esc(id) + '">تلاش دوباره</button></div>';
    } finally {
      if (state.request === request) panel.removeAttribute('aria-busy');
    }
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
      const summary = event.target.closest('.drug-reference-section > summary');
      if (summary) {
        event.preventDefault(); event.stopPropagation();
        const topic = summary.parentElement, pane = $('drugsTab');
        const top = summary.getBoundingClientRect().top, opening = !topic.open;
        const behavior = pane.style.scrollBehavior;
        // Native exclusive details can collapse a tall preceding section and
        // trigger smooth scroll anchoring. Apply the change once, then preserve
        // the activated heading's viewport position for pointer and keyboard use.
        pane.style.scrollBehavior = 'auto';
        topic.closest('[data-drug-topics]').querySelectorAll('.drug-reference-section[open]').forEach(other => { other.open = false; });
        topic.open = opening;
        pane.scrollTop += summary.getBoundingClientRect().top - top;
        pane.style.scrollBehavior = behavior;
        return;
      }
      const button = event.target.closest('button');
      if (!button) return;
      event.stopPropagation();
      if (button.hasAttribute('data-drug-close')) closeDrug(true);
      else if (button.dataset.drugRetry) { const id=button.dataset.drugRetry; closeDrug(); void showDrug(id); }
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
  // Read-only discovery state can be restored after the guided tour.
  window.FoxiMedDrugReferenceView = {
    capture() { return {term:$('drugReferenceSearch')?.value||'',filter:state.filter,page:state.page,openId:state.openId}; },
    async restore(snapshot) {
      if(!snapshot)return;
      window.initDrugReference();clearTimeout(state.timer);closeDrug();
      $('drugReferenceSearch').value=snapshot.term;state.filter=snapshot.filter;
      $('drugReferenceFilters').querySelectorAll('[data-drug-filter]').forEach(b=>{const selected=b.dataset.drugFilter===state.filter;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
      search();state.page=Math.max(0,Math.min(snapshot.page,Math.max(0,Math.ceil(state.results.length/PAGE_SIZE)-1)));renderPage();
      if(snapshot.openId&&cardFor(snapshot.openId))await showDrug(snapshot.openId);
    }
  };
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
