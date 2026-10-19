/* FoxiMed Drug Reference UI — intentionally separate from drugDatabase.js */
(function () {
  'use strict';
  const data = () => Array.isArray(window.FoxiMedDrugReferenceData) ? window.FoxiMedDrugReferenceData : [];
  const state = { selectedId: null, filter: 'all', initialized: false };
  const $ = (id) => document.getElementById(id);
  const normalize = (value) => String(value || '').toLocaleLowerCase()
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u200c\u200f\u200e\s\-_.]/g, '');
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const listHTML = (items) => Array.isArray(items) && items.length
    ? '<ul>' + items.map(item => '<li>' + escapeHTML(item) + '</li>').join('') + '</ul>'
    : '<p>اطلاعات تأییدشده‌ای در این بخش ثبت نشده است.</p>';
  const section = (title, icon, content, wide = false) =>
    '<section class="drug-reference-section' + (wide ? ' wide' : '') + '"><h3><i class="fas ' + icon + '" aria-hidden="true"></i>' + escapeHTML(title) + '</h3>' + content + '</section>';
  function matches(drug, term) {
    if (!term) return true;
    const searchable = [drug.fa, drug.en, drug.classFa, drug.classEn, ...(drug.synonyms || [])].map(normalize).join(' ');
    return searchable.includes(normalize(term));
  }
  function renderList() {
    const grid = $('drugReferenceGrid');
    const count = $('drugReferenceCount');
    if (!grid) return;
    const term = $('drugReferenceSearch')?.value || '';
    const filtered = data().filter(d => matches(d, term) && (state.filter === 'all' || (d.classEn || '').toLowerCase().includes(state.filter) || (d.classFa || '').includes(state.filter)));
    if (count) count.textContent = filtered.length + ' دارو از ' + data().length + ' رکورد نمایشی';
    if (!filtered.length) {
      grid.innerHTML = '<div class="drug-reference-empty" style="grid-column:1/-1"><i class="fas fa-magnifying-glass"></i>دارویی با این عبارت پیدا نشد. نام فارسی، انگلیسی یا نام جایگزین را امتحان کنید.</div>';
      return;
    }
    grid.innerHTML = filtered.map(d => `
      <article class="drug-reference-card" data-drug-card="${escapeHTML(d.id)}">
        <button type="button" class="drug-reference-card-main" data-drug-preview="${escapeHTML(d.id)}" aria-label="پیش‌نمایش ${escapeHTML(d.fa)}">
          <span class="drug-reference-icon" style="background:${escapeHTML(d.color || '#64748b')}"><i class="fas ${escapeHTML(d.icon || 'fa-pills')}" aria-hidden="true"></i></span>
          <span class="drug-reference-card-copy">
            <span class="drug-reference-fa">${escapeHTML(d.fa)}</span>
            <span class="drug-reference-en" lang="en">${escapeHTML(d.en)}</span>
            <span class="drug-reference-class">${escapeHTML(d.classFa)} · ${escapeHTML(d.classEn)}</span>
          </span>
        </button>
        <div class="drug-reference-card-footer">
          <span class="drug-reference-status"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i>بازبینی نشده</span>
          <button type="button" class="drug-reference-preview-btn" data-drug-preview="${escapeHTML(d.id)}">پیش‌نمایش</button>
        </div>
      </article>`).join('');
  }
  function renderPreview(id) {
    const drug = data().find(d => d.id === id);
    const panel = $('drugReferencePreview');
    if (!drug || !panel) return;
    state.selectedId = id;
    panel.innerHTML = `
      <div class="drug-reference-preview-top">
        <span class="drug-reference-icon" style="background:${escapeHTML(drug.color || '#64748b')}"><i class="fas ${escapeHTML(drug.icon || 'fa-pills')}" aria-hidden="true"></i></span>
        <div style="min-width:0;flex:1">
          <h3>${escapeHTML(drug.fa)}</h3><span class="drug-reference-en" lang="en">${escapeHTML(drug.en)}</span>
          <div class="drug-reference-source-status"><i class="fas fa-triangle-exclamation"></i> پیش‌نویس؛ اطلاعات بالینی این رکورد هنوز بازبینی نشده است.</div>
        </div>
      </div>
      <p>${escapeHTML(drug.summary)}</p>
      <div class="drug-reference-preview-actions">
        <button type="button" class="drug-reference-full-btn" data-drug-full="${escapeHTML(drug.id)}"><i class="fas fa-book-open"></i> اطلاعات کامل دارو</button>
        <button type="button" class="drug-reference-secondary-btn" data-drug-close-preview>بستن پیش‌نمایش</button>
      </div>`;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function renderDetail(id) {
    const drug = data().find(d => d.id === id);
    if (!drug) return;
    state.selectedId = id;
    $('drugReferenceListView').hidden = true;
    const detail = $('drugReferenceDetail');
    detail.hidden = false;
    detail.innerHTML = `
      <div class="drug-reference-detail-head">
        <button type="button" class="drug-reference-back" data-drug-back><i class="fas fa-arrow-right"></i> بازگشت به فهرست داروها</button>
        <div class="drug-reference-detail-title">
          <span class="drug-reference-icon" style="background:${escapeHTML(drug.color || '#64748b')}"><i class="fas ${escapeHTML(drug.icon || 'fa-pills')}" aria-hidden="true"></i></span>
          <div style="min-width:0"><h2>${escapeHTML(drug.fa)}</h2><span class="drug-reference-en" lang="en">${escapeHTML(drug.en)}</span><div class="drug-reference-source-status">رده: ${escapeHTML(drug.classFa)} · ${escapeHTML(drug.classEn)}</div></div>
        </div>
      </div>
      <div class="drug-reference-clinical-warning"><i class="fas fa-triangle-exclamation"></i> <strong>نسخه آزمایشی:</strong> این رکورد پیش‌نویس است و بازبینی بالینی/منبع اختصاصی ندارد. برای تصمیم‌گیری درباره تجویز، دوز، بارداری یا تجویز تزریقی به این محتوا اتکا نکنید.</div>
      <div class="drug-reference-detail-body">
        ${section('معرفی و کاربرد', 'fa-circle-info', '<p>' + escapeHTML(drug.summary) + '</p>' + listHTML(drug.uses), true)}
        ${section('مکانیسم اثر', 'fa-gears', '<p>' + escapeHTML(drug.mechanism || '') + '</p>')}
        ${section('دوز و نحوه تجویز', 'fa-syringe', '<p>' + escapeHTML(drug.dose || 'اطلاعات تأییدشده‌ای در این بخش ثبت نشده است.') + '</p>')}
        ${section('هشدارها و احتیاطات', 'fa-triangle-exclamation', listHTML(drug.warnings))}
        ${section('ملاحظات پرستاری و پایش', 'fa-stethoscope', listHTML(drug.nursing))}
        ${section('بارداری و شیردهی', 'fa-person-breastfeeding', '<p>' + escapeHTML(drug.pregnancy || 'بررسی نشده') + '</p>')}
        ${section('نارسایی کلیوی و کبدی', 'fa-flask', '<p>' + escapeHTML(drug.renal || 'اطلاعات تأییدشده‌ای ثبت نشده است.') + '</p>')}
        ${section('تداخلات دارویی', 'fa-shuffle', '<p>' + escapeHTML(drug.interactions || 'اطلاعات تأییدشده‌ای ثبت نشده است.') + '</p>')}
        ${section('منابع و وضعیت بازبینی', 'fa-book-medical', '<p>وضعیت: پیش‌نویس و بازبینی‌نشده.</p><p>منبع اختصاصی برای این رکورد هنوز ثبت و تأیید نشده است.</p><p>تاریخ آخرین بازبینی: ثبت نشده</p>', true)}
      </div>`;
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function showList() {
    $('drugReferenceDetail').hidden = true;
    $('drugReferenceListView').hidden = false;
    if (state.selectedId) renderPreview(state.selectedId);
    $('drugReferenceSearch')?.focus({ preventScroll: true });
  }
  function bind() {
    const search = $('drugReferenceSearch');
    if (search && !search.dataset.bound) {
      search.dataset.bound = 'true';
      search.addEventListener('input', () => {
        renderList();
        $('drugReferenceClear').hidden = !search.value;
      });
    }
    $('drugReferenceClear')?.addEventListener('click', () => {
      search.value = '';
      $('drugReferenceClear').hidden = true;
      renderList();
      search.focus();
    });
    $('drugReferenceFilters')?.addEventListener('click', event => {
      const button = event.target.closest('[data-drug-filter]');
      if (!button) return;
      state.filter = button.dataset.drugFilter;
      $('drugReferenceFilters').querySelectorAll('.drug-reference-filter').forEach(b => b.classList.toggle('active', b === button));
      renderList();
    });
    $('drugReferenceGrid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-drug-preview]');
      if (button) renderPreview(button.dataset.drugPreview);
    });
    $('drugReferencePreview')?.addEventListener('click', event => {
      const full = event.target.closest('[data-drug-full]');
      if (full) renderDetail(full.dataset.drugFull);
      if (event.target.closest('[data-drug-close-preview]')) $('drugReferencePreview').hidden = true;
    });
    $('drugReferenceDetail')?.addEventListener('click', event => {
      if (event.target.closest('[data-drug-back]')) showList();
    });
  }
  window.initDrugReference = function () {
    if (!state.initialized) {
      bind();
      renderList();
      state.initialized = true;
    } else {
      renderList();
    }
  };
  window.openDrugReferenceDrug = function (id) {
    window.initDrugReference();
    renderPreview(id);
  };
})();