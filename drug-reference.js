/* FoxiMed Drug Reference — compact accordion UI */
(function () {
  'use strict';
  const data = () => {
    const book = Array.isArray(window.FoxiMedDrugBookData) ? window.FoxiMedDrugBookData : [];
    // The PDF extractor sometimes reverses English word order on Persian-first
    // headings. Correct those names for display/search while preserving the source text.
    book.forEach(d => {
      if (!d || !d.sourceText) return;
      const firstLine = d.sourceText.split('\n')[0] || '';
      const faPos = firstLine.search(/[\u0600-\u06ff]/);
      const enPos = firstLine.search(/[A-Za-z]/);
      if (faPos < 0 || enPos < 0 || enPos < faPos) return;
      const rawEnglish = firstLine.slice(enPos).replace(/[?():,]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (normalize(d.en) !== normalize(rawEnglish)) return; // already corrected
      const corrected = rawEnglish.split(/\s+/).reverse().join(' ').trim();
      if (corrected && corrected !== d.en) {
        d.synonyms = [...new Set([...(d.synonyms || []), d.en, corrected])];
        d.en = corrected;
      }
    });
    const base = Array.isArray(window.FoxiMedDrugReferenceData) ? window.FoxiMedDrugReferenceData : [];
    const extra = Array.isArray(window.FoxiMedDrugCatalog) ? window.FoxiMedDrugCatalog : [];
    const seen = new Set();
    return book.concat(base, extra).filter(d => d && d.id && !seen.has(d.id) && seen.add(d.id));
  };
  const state = { openId: null, filter: 'all', initialized: false, floatBar: null, scrollHandler: null };
  const $ = id => document.getElementById(id);
  const normalize = value => String(value || '').toLocaleLowerCase()
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u200c\u200f\u200e\s\-_.]/g, '');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const listHTML = items => Array.isArray(items) && items.length ? '<ul>' + items.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>' : '<p>اطلاعات تأییدشده‌ای در این بخش ثبت نشده است.</p>';
  const section = (title, icon, content, wide) => '<section class="drug-reference-section' + (wide ? ' wide' : '') + '"><h3><i class="fas ' + icon + '" aria-hidden="true"></i>' + esc(title) + '</h3>' + content + '</section>';
  function matches(d, term) {
    if (!term) return true;
    if (!d.__searchText) {
      d.__searchText = normalize([d.fa, d.en, d.classFa, d.classEn, ...(d.synonyms || []), ...(d.brands || []), d.sourceText || ''].join(' '));
    }
    return d.__searchText.includes(normalize(term));
  }
  function detailHTML(d) {
    if (d.sourceText) {
      const sourceSections = Array.isArray(d.sections) && d.sections.length
        ? d.sections.map(s => section(s.title || 'اطلاعات منبع', 'fa-book-medical', '<div style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9;font-size:.92rem">' + esc(s.text || '') + '</div>', true)).join('')
        : section('متن منبع', 'fa-book-medical', '<div style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9;font-size:.92rem">' + esc(d.sourceText) + '</div>', true);
      return '<div class="drug-reference-clinical-warning"><i class="fas fa-book-medical"></i> <strong>منبع:</strong> داروهای ژنریک ایران (اطلاعات نسخهٔ PDF با فرادادهٔ سال ۲۰۰۸). متن منبع برای حفظ امانت تغییر محتوایی داده نشده است؛ برای تصمیم‌گیری بالینی، آن را با منابع و پروتکل‌های جاری تطبیق دهید.</div>' + '<div class="drug-reference-detail-body">' + sourceSections + '</div>';
    }
    const brands = [...new Set([...(d.brands || []), ...(d.synonyms || []).filter(s => /[A-Za-z]/.test(s))])];
    return '<div class="drug-reference-clinical-warning"><i class="fas fa-triangle-exclamation"></i> <strong>نسخه آزمایشی:</strong> اطلاعات این رکورد بازبینی بالینی نشده است؛ برای تصمیم‌گیری درباره تجویز یا دوز به آن اتکا نکنید.</div>' +
      '<div class="drug-reference-detail-body">' +
      section('نام‌های تجاری و جایگزین','fa-tags','<p>' + esc(brands.length ? brands.join('، ') : 'نام تجاری تأییدشده‌ای ثبت نشده است.') + '</p>',true) +
      section('معرفی و کاربرد','fa-circle-info','<p>' + esc(d.summary || 'توضیحات بالینی تأییدشده هنوز ثبت نشده است.') + '</p>' + listHTML(d.uses),true) +
      section('مکانیسم اثر','fa-gears','<p>' + esc(d.mechanism || 'هنوز بازبینی نشده است.') + '</p>') +
      section('دوز و نحوه تجویز','fa-syringe','<p>' + esc(d.dose || 'اطلاعات دوز تأییدشده ثبت نشده است.') + '</p>') +
      section('هشدارها و احتیاطات','fa-triangle-exclamation',listHTML(d.warnings)) +
      section('ملاحظات پرستاری و پایش','fa-stethoscope',listHTML(d.nursing)) +
      section('بارداری و شیردهی','fa-person-breastfeeding','<p>' + esc(d.pregnancy || 'بررسی نشده است.') + '</p>') +
      section('نارسایی کلیوی و کبدی','fa-flask','<p>' + esc(d.renal || 'اطلاعات تأییدشده ثبت نشده است.') + '</p>') +
      section('تداخلات دارویی','fa-shuffle','<p>' + esc(d.interactions || 'اطلاعات تأییدشده ثبت نشده است.') + '</p>') +
      section('منابع و وضعیت بازبینی','fa-book-medical','<p>وضعیت: پیش‌نویس و بازبینی‌نشده.</p><p>منبع اختصاصی و تاریخ بازبینی ثبت نشده است.</p>',true) + '</div>';
  }
  function clearFloatBar() {
    if (state.floatBar) state.floatBar.remove();
    state.floatBar = null;
    if (state.scrollHandler) window.removeEventListener('scroll', state.scrollHandler);
    state.scrollHandler = null;
  }
  function attachFloatBar(id, title, icon) {
    clearFloatBar();
    const bar = document.createElement('div');
    bar.className = 'accordion-float-bar drug-reference-float-bar';
    bar.innerHTML = '<div class="accordion-float-left"><i class="fas ' + esc(icon || 'fa-pills') + '"></i><span>' + esc(title) + '</span></div><button type="button" class="accordion-float-close"><i class="fas fa-times"></i> بستن</button>';
    bar.querySelector('button').addEventListener('click', () => closeDrug(id));
    document.body.appendChild(bar);
    state.floatBar = bar;
    state.scrollHandler = () => {
      const head = document.querySelector('[data-drug-header="' + id.replace(/"/g, '\\"') + '"]');
      if (head && head.getBoundingClientRect().bottom < 60 && state.openId === id) bar.classList.add('visible');
      else bar.classList.remove('visible');
    };
    window.addEventListener('scroll', state.scrollHandler, { passive: true });
    state.scrollHandler();
  }
  function closeDrug(id) {
    if (state.openId !== id) return;
    state.openId = null; clearFloatBar(); renderList();
  }
  function renderList() {
    const grid = $('drugReferenceGrid'), count = $('drugReferenceCount');
    if (!grid) return;
    const term = $('drugReferenceSearch')?.value || '';
    const filterIds = {
      antibiotic: ['ceftriaxone','vancomycin','amoxicillin','azithromycin','ciprofloxacin','piperacillin-tazobactam','meropenem','metronidazole','doxycycline','clindamycin'],
      cardio: ['amiodarone','adenosine','epinephrine','norepinephrine','nitroglycerin','furosemide','metoprolol','atropine','lidocaine'],
      anticoagulant: ['heparin','enoxaparin','aspirin','warfarin','apixaban','rivaroxaban','clopidogrel'],
      analgesic: ['paracetamol','ibuprofen','morphine','fentanyl','midazolam','ketorolac','tramadol']
    };
    const all = data();
    const filtered = all.filter(d => matches(d, term) && (state.filter === 'all' || (filterIds[state.filter] || []).includes(d.id) || d.category === state.filter));
    if (count) count.textContent = filtered.length + ' دارو / نام ژنریک از ' + all.length + ' رکورد';
    if (!filtered.some(d => d.id === state.openId)) { state.openId = null; clearFloatBar(); }
    if (!filtered.length) {
      grid.innerHTML = '<div class="drug-reference-empty" style="grid-column:1/-1"><i class="fas fa-magnifying-glass"></i>دارویی با این عبارت پیدا نشد. نام فارسی، انگلیسی یا نام تجاری را امتحان کنید.</div>';
      return;
    }
    grid.innerHTML = filtered.map(d => {
      const open = d.id === state.openId;
      return '<article class="drug-reference-card ' + (open ? 'open' : '') + '" data-drug-card="' + esc(d.id) + '">' +
        '<button type="button" class="drug-reference-card-main" data-drug-toggle="' + esc(d.id) + '" data-drug-header="' + esc(d.id) + '" aria-expanded="' + open + '" aria-controls="drug-detail-' + esc(d.id) + '">' +
        '<span class="drug-reference-icon" style="background:' + esc(d.color || '#64748b') + '"><i class="fas ' + esc(d.icon || 'fa-pills') + '" aria-hidden="true"></i></span>' +
        '<span class="drug-reference-card-copy"><span class="drug-reference-fa">' + esc(d.fa || d.en) + '</span><span class="drug-reference-en" lang="en">' + esc(d.en) + '</span><span class="drug-reference-class">' + esc(d.classFa || 'دارو') + ' · ' + esc(d.classEn || 'Drug') + '</span></span>' +
        '<i class="fas fa-chevron-down drug-reference-chevron" aria-hidden="true"></i></button>' +
        (open ? '<div class="drug-reference-expanded" id="drug-detail-' + esc(d.id) + '">' + detailHTML(d) + '</div>' : '') + '</article>';
    }).join('');
    if (state.openId) {
      const d = all.find(x => x.id === state.openId);
      if (d) attachFloatBar(d.id, d.fa || d.en, d.icon);
    }
  }
  function bind() {
    const search = $('drugReferenceSearch');
    if (search && !search.dataset.bound) {
      search.dataset.bound = 'true';
      search.addEventListener('input', () => { renderList(); $('drugReferenceClear').hidden = !search.value; });
    }
    $('drugReferenceClear')?.addEventListener('click', () => { search.value = ''; $('drugReferenceClear').hidden = true; renderList(); search.focus(); });
    $('drugReferenceFilters')?.addEventListener('click', event => {
      const button = event.target.closest('[data-drug-filter]');
      if (!button) return;
      state.filter = button.dataset.drugFilter;
      $('drugReferenceFilters').querySelectorAll('.drug-reference-filter').forEach(b => b.classList.toggle('active', b === button));
      state.openId = null; clearFloatBar(); renderList();
    });
    $('drugReferenceGrid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-drug-toggle]');
      if (!button) return;
      const id = button.dataset.drugToggle;
      if (state.openId === id) { closeDrug(id); return; }
      state.openId = id; renderList();
      const card = document.querySelector('[data-drug-card="' + id.replace(/"/g, '\\"') + '"]');
      if (card) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    });
  }
  window.initDrugReference = function () { if (!state.initialized) { bind(); state.initialized = true; } renderList(); };
  window.openDrugReferenceDrug = function (id) { window.initDrugReference(); state.openId = id; renderList(); };
})();