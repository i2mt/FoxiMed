'use strict';
// Whole-dataset typography/content checks; no clinical validation is implied.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8'),c=vm.createContext({window:{}});
const code=read('drug-reference.js').replace(/\}\)\(\);\s*$/, 'window.readerTest={inlineText,paragraphs,sectionText,detailHTML,repairParentheses};})();');vm.runInContext(code,c);const r=c.window.readerTest;
for(let i=1;i<=10;i++)vm.runInContext(read(`drug-reference-book-${String(i).padStart(2,'0')}.js`),c);
const book=c.window.FoxiMedDrugBookData,byId=new Map(book.map(d=>[d.id,d]));
const decode=s=>s.replace(/<\/p>/g,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const words=s=>s.replace(/[()\s]/g,''),numbers=s=>s.match(/[0-9۰-۹٠-٩]+/g)||[];
let sections=0,reversedSections=0;
for(const d of book){
 assert(!/ثابت نشده|بی خطر بودن|مراجعه شود|دارو طی|روزانه|نام\//.test(d.fa),d.id+': prose in title');
 for(const s of d.sections){
  sections++;assert.equal(decode(r.inlineText(s.text)),s.text,d.id+': inline isolation changed characters');
  const expected=s.text.replace(/^[X?4]\s*(?=(?:رده بندی|نام تجاری|اشکال دارویی))/gm,'').replace(/^\?\s*(?=[A-Za-z])/gm,'• ');
  const rendered=decode(r.paragraphs(s.text));
  assert.equal(words(rendered),words(expected),d.id+': reflow lost/reordered non-parenthesis content');
  assert.deepEqual(numbers(rendered),numbers(expected),d.id+': numeric values/order changed');
  if(r.repairParentheses(s.text)!==s.text)reversedSections++;
 }
 const full=r.detailHTML(d);
 assert(full.includes('<details name="drug-reference-topic"'),d.id+': missing topics');
 assert(!/<details[^>]*\sopen(?:[\s>])/.test(full),d.id+': topic opened automatically');
 assert(!/data-drug-comprehensive|data-drug-overview/.test(full),d.id+': obsolete second stage');
 assert.equal((full.match(/drug-reference-source-footer/g)||[]).length,1);
}
const ed=JSON.parse(read('scripts/drug-reference-editorial.json'));
for(const [id,fields]of Object.entries(ed.headings))for(const [field,value]of Object.entries(fields))assert.equal(byId.get(id)[field],value,id+': missing editorial correction');
assert.equal(byId.get('hydrochloride-ciproheptadine').en,'Cyproheptadine Hydrochloride');
assert(byId.get('hydrochloride-amiodarone').sections.some(s=>s.text.includes('فیبریلاسیون بطنی')));
assert.equal(r.repairParentheses('دارو )با احتیاط( مصرف شود'),'دارو (با احتیاط) مصرف شود');
assert.equal(r.repairParentheses('شرح )(PTCA بعد'),'شرح (PTCA) بعد');
for(const text of ['اثر (PTCA) و (GPIIb/IIIa)','دوز (۰/ ۲۵ mg/kg/min) هر ۶ ساعت','نام (متن فارسی و (English)) ادامه','(100 mg/5 mL) و ۵–۱۰ mL','سرعت (۱:۱۰۰۰) و ۳٪']){
 const html=r.inlineText(text);assert.equal(decode(html),text);assert(html.includes('class="drug-reference-parenthesis"'));
}
const nested=r.inlineText('متن (فارسی (English)) ادامه');assert(nested.includes('drug-reference-parenthesis" dir="rtl"'));assert(nested.includes('drug-reference-parenthesis" dir="ltr"'));
assert(!r.inlineText('(PTCA)').match(/drug-reference-ltr[^>]*>[^<]*\)/),'Latin runs must not consume group punctuation');
console.log(`drug reader checks: PASS (${book.length} titles; ${sections} complete sections; ${reversedSections} sections with source bracket normalization; all topics initially closed)`);
