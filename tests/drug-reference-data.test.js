'use strict';
// Structural validation does not establish the clinical accuracy of source text.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const context = vm.createContext({window:{}});
const run = name => vm.runInContext(read(name),context,{filename:name});
run('drug-reference-index.js');
run('drug-reference-data.js'); run('drug-reference-catalog.js');
const index = context.window.FoxiMedDrugBookIndex;
const indexIds = new Set();
for (const d of index) {
  assert.equal(typeof d.id,'string'); assert(d.id.length && !indexIds.has(d.id),d.id); indexIds.add(d.id);
  assert(d.en || d.fa, d.id + ': missing name');
  assert(!('sourceText' in d),d.id + ': heavy text leaked into initial index');
  assert(/^drug-reference-book-\d{2}\.js$/.test(d.chunk));
  assert(fs.existsSync(path.join(root,d.chunk)));
  for (const key of ['synonyms','brands']) assert(Array.isArray(d[key]) && d[key].every(x=>typeof x==='string'),d.id+': '+key);
}
const details = new Map();
for (let i=1;i<=10;i++) {
  const file=`drug-reference-book-${String(i).padStart(2,'0')}.js`;
  context.window.FoxiMedDrugBookData=[];run(file);
  for (const d of context.window.FoxiMedDrugBookData) {
    assert(!details.has(d.id),d.id+': duplicate ID'); details.set(d.id,d);
    assert.equal(index.find(x=>x.id===d.id)?.chunk,file,d.id+': broken chunk relationship');
    assert.equal(d.sourceYear,2008);assert.equal(d.sourceQuality,'extraction-unreviewed');
    assert(typeof d.sourceText==='string' && d.sourceText.trim(),d.id+': missing source text');
    assert(d.sourcePdfPages.length && d.sourcePdfPages.every(n=>Number.isInteger(n)&&n>=23&&n<=998),d.id+': invalid numeric page');
    assert(Array.isArray(d.sections)&&d.sections.length,d.id+': missing sections');
    for(const s of d.sections)assert(typeof s.title==='string'&&typeof s.text==='string'&&s.text.trim(),d.id+': malformed section');
    assert(!/<PARSED TEXT FOR PAGE:|@@@@|کتابنامه/.test(d.sourceText),d.id+': non-monograph extraction debris');
    assert(!/[\u0600-\u06ff]R[\u0600-\u06ff]|�/.test(d.fa),d.id+': corrupt heading');
  }
}
assert.equal(details.size,index.length);
const original=JSON.parse(read('scripts/drug-reference-original-ids.json'));
for(const d of original)assert(details.has(d.id),d.id+': original ID lost');
for(const group of [context.window.FoxiMedDrugReferenceData,context.window.FoxiMedDrugCatalog]) {
  const ids=new Set();for(const d of group){assert(d.id&&!ids.has(d.id));ids.add(d.id);assert(d.en||d.fa);}
}
const abc=details.get('abciximab');
assert(!abc.sourceText.includes('A.C.A'),'combined monographs must be split');
assert(abc.sourceText.includes('پلاکت'),'lam-alef decoding regressed');
assert(index.some(d=>d.id==='a-c-a'));
assert(!details.get('acetaminophen-paracetamol').synonyms.some(s=>/^(aspirin|anacin)$/i.test(s)),'ambiguous brand aliases must remain quarantined');
assert(!/<script[^>]+drug-reference-book-\d/.test(read('index.html')),'book payload must not load eagerly');
assert(!/\.\/drug-reference-book-\d{2}\.js\?v=1/.test(read('service-worker.js')),'book must not be precached on install');
const audit=JSON.parse(read('reports/drug-data-audit.json'));
assert.equal(audit.book_records,index.length);assert.equal(audit.preserved_ids,original.length);assert.equal(audit.clinically_validated_records,0);
console.log(`drug reference data checks: PASS (${details.size} PDF entries; ${original.length} original IDs preserved)`);
