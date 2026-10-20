'use strict';
// Exercise the actual renderer against every PDF section, without changing the
// production API. This verifies text/numeric preservation, not clinical accuracy.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const c=vm.createContext({window:{}});
const code=read('drug-reference.js').replace(/\}\)\(\);\s*$/, 'window.readerTest={inlineText,paragraphs,sectionText,overviewHTML,detailHTML};})();');
vm.runInContext(code,c);const r=c.window.readerTest;
for(let i=1;i<=10;i++)vm.runInContext(read(`drug-reference-book-${String(i).padStart(2,'0')}.js`),c);
const book=c.window.FoxiMedDrugBookData;
const decode=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const compact=s=>s.replace(/\s+/g,'');
let sections=0;
for(const d of book){
  assert(!/ثابت نشده|بی خطر بودن|مراجعه شود|دارو طی|روزانه|نام\//.test(d.fa),`${d.id}: prose in title`);
  for(const s of d.sections){
    sections++;
    assert.equal(decode(r.inlineText(s.text)),s.text,d.id+': inline renderer changed source characters');
    const expected=s.text.replace(/^[X?4]\s*(?=(?:رده بندی|نام تجاری|اشکال دارویی))/gm,'').replace(/^\?\s*(?=[A-Za-z])/gm,'• ');
    assert.equal(compact(decode(r.paragraphs(s.text))),compact(expected),d.id+': reflow changed content');
  }
  const overview=r.overviewHTML(d);
  assert(!overview.includes('dir="auto"'),d.id+': auto direction leaked into clinical reader');
  const full=r.detailHTML(d);
  assert(full.includes('<details name="drug-reference-topic"'),d.id+': missing topic controls');
}
const byId=new Map(book.map(d=>[d.id,d]));
const editorial=JSON.parse(read('scripts/drug-reference-editorial.json'));
for(const [id,fields] of Object.entries(editorial.headings))for(const [field,value] of Object.entries(fields))assert.equal(byId.get(id)[field],value,id+': editorial correction missing');
assert(byId.get('multivitamin').sourceText.includes('۰/ ۶ ml'));
assert(byId.get('multivitamin').sections.some(s=>s.title==='اندیکاسیون، راه مصرف و دوز'));
assert(r.overviewHTML(byId.get('multivitamin')).includes('کاربرد، راه مصرف و دوز'));
assert(!byId.get('r-iron-plus-multivitamin').sourceText.startsWith('کودکان :روزانه'));

assert.equal(byId.get('aminoglutethimide').fa,'آمینوگلوتتماید');
assert(!byId.get('nitrazepam').fa.includes('شیردهی'));
assert(byId.get('hydrochloride-amiodarone').sections.some(s=>s.text.includes('فیبریلاسیون بطنی')));
assert(!byId.get('hydrochloride-amiodarone').sections.some(s=>/فیبرپلاسیون|فیبر یلاسیون یبطنی/.test(s.text)));
assert.equal(byId.get('heporin-sodium').en,'Heparin Sodium');
assert.equal(byId.get('hydrochloride-amamtadine').en,'Amantadine Hydrochloride');
for(const text of ['دوز ۰/ ۲۵ mg/kg/min هر ۶ ساعت','۵–۱۰ mL و ۱۰۰ mg/5 mL','CNS: گیجی و QT طولانی','۲-۴ ساعت، ۱:۱۰۰۰، ۳٪']){
 const html=r.paragraphs(text);assert.equal(compact(decode(html)),compact(text));assert(html.includes('<bdi dir="ltr"'));
}
console.log(`drug reader checks: PASS (${book.length} titles; ${sections} complete sections preserve characters and numeric values)`);
