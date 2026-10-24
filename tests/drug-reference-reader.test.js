'use strict';
// Whole-dataset typography/content checks; no clinical validation is implied.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8'),c=vm.createContext({window:{}});
const code=read('drug-reference.js').replace(/\}\)\(\);\s*$/, 'window.readerTest={inlineText,paragraphs,sectionText,detailHTML,repairParentheses,readableTitles,numericText,clinicalProse,timingHTML,timingValue,digitText};})();');vm.runInContext(code,c);const r=c.window.readerTest;
for(let i=1;i<=10;i++)vm.runInContext(read(`drug-reference-book-${String(i).padStart(2,'0')}.js`),c);
const book=c.window.FoxiMedDrugBookData,byId=new Map(book.map(d=>[d.id,d]));
const decode=s=>s.replace(/<\/p>/g,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
// Recover the exact source token from each formatted quantity before checking content.
const sourceHTML=s=>s.replace(/<section[^>]*data-source-system="([^"]*)"[^>]*>[\s\S]*?<\/section>/g,(_,original)=>original).replace(/<bdi[^>]*data-source-number="([^"]*)"[^>]*>[\s\S]*?<\/bdi>/g,(_,original)=>original);
const sourceText=s=>r.digitText(decode(sourceHTML(s)));
const words=s=>s.replace(/[()\s]/g,''),numbers=s=>s.match(/[0-9۰-۹٠-٩]+/g)||[];
let sections=0,reversedSections=0;
for(const d of book){
 assert(!/ثابت نشده|بی خطر بودن|مراجعه شود|دارو طی|روزانه|نام\//.test(d.fa),d.id+': prose in title');
 for(const s of d.sections){
  sections++;assert.equal(sourceText(r.inlineText(s.text)),r.digitText(s.text),d.id+': inline isolation changed characters');
  const expected=s.text.replace(/^[X?4]\s*(?=(?:رده بندی|نام تجاری|اشکال دارویی))/gm,'').replace(/^\?\s*(?=[A-Za-z])/gm,'• ');
  const rendered=sourceText(r.paragraphs(s.text));
  assert.equal(words(rendered),words(r.digitText(expected)),d.id+': reflow lost/reordered non-parenthesis content');
  assert.deepEqual(numbers(rendered),numbers(r.digitText(expected)),d.id+': numeric values/order changed');
  if(r.repairParentheses(s.text)!==s.text)reversedSections++;
 }
 const full=r.detailHTML(d);
 assert(!/class="drug-reference-status"/.test(full),d.id+': distracting top review notice returned');
 assert(full.includes('<details name="drug-reference-topic"'),d.id+': missing topics');
 assert(!/<details[^>]*\sopen(?:[\s>])/.test(full),d.id+': topic opened automatically');
 assert(!/data-drug-comprehensive|data-drug-overview/.test(full),d.id+': obsolete second stage');
 assert.equal((full.match(/drug-reference-source-footer/g)||[]).length,1);
 // Every retained PDF topic follows the original monograph sequence.
 let previous=-1;
 for(const source of d.sections){
  const title=r.readableTitles[source.title]||source.title;
  const marker='<summary><span>'+title.replace(/&/g,'&amp;')+'</span>';
  const pos=full.indexOf(marker,previous+1);
  if(pos<0){assert(!r.sectionText(source).trim()||/شناسه|اشکال دارویی/.test(source.title),d.id+': missing source topic '+source.title);continue;}
  assert(pos>previous,d.id+': source topic reordered '+source.title);previous=pos;
 }

}
const seed=r.detailHTML({summary:'معرفی دارو',brands:['Brand'],classFa:'رده',mechanism:['اثر'],uses:['کاربرد'],dose:['دوز'],nursing:['مراقبت'],warnings:['هشدار']});
assert(seed.indexOf('نام‌های تجاری')<seed.indexOf('ردهٔ دارویی'),'brand names must precede classification');
assert(seed.indexOf('<summary><span>مکانیسم اثر')<seed.indexOf('<summary><span>دوز و تجویز'),'seed pharmacology must precede dosing');
const ed=JSON.parse(read('scripts/drug-reference-editorial.json'));
for(const [id,fields]of Object.entries(ed.headings))for(const [field,value]of Object.entries(fields))assert.equal(byId.get(id)[field],value,id+': missing editorial correction');
assert.equal(byId.get('hydrochloride-ciproheptadine').en,'Cyproheptadine Hydrochloride');
assert(byId.get('hydrochloride-amiodarone').sections.some(s=>s.text.includes('فیبریلاسیون بطنی')));
assert.equal(r.repairParentheses('دارو )با احتیاط( مصرف شود'),'دارو (با احتیاط) مصرف شود');
assert.equal(r.repairParentheses('شرح )(PTCA بعد'),'شرح (PTCA) بعد');
for(const text of ['اثر (PTCA) و (GPIIb/IIIa)','دوز (۰/ ۲۵ mg/kg/min) هر ۶ ساعت','نام (متن فارسی و (English)) ادامه','(100 mg/5 mL) و ۵–۱۰ mL','سرعت (۱:۱۰۰۰) و ۳٪']){
 const html=r.inlineText(text);assert.equal(sourceText(html),r.digitText(text));assert(html.includes('class="drug-reference-parenthesis"'));
}
const nested=r.inlineText('متن (فارسی (English)) ادامه');assert(nested.includes('drug-reference-parenthesis" dir="rtl"'));assert(nested.includes('drug-reference-parenthesis" dir="ltr"'));
assert(!r.inlineText('(PTCA)').match(/drug-reference-ltr[^>]*>[^<]*\)/),'Latin runs must not consume group punctuation');
console.log(`drug reader checks: PASS (${book.length} titles; ${sections} complete sections; ${reversedSections} sections with source bracket normalization; all topics initially closed)`);

for(const [input,expected,context]of [
 ['۴-۲','2–4','مدت اثر ساعت'],['۲۴ تا ۷۲','24–72','ساعت'],['۱۲تا۶','6–12','سن کودک سال'],['۱۲−۶','6–12','سن کودک سال'],
 ['۰/ ۲۵ mg/kg/min','0/25 mg/kg/min','دوز'],['۱:۲','1:2','نسبت'],['۱:۱۰۰۰','1:1000','نسبت'],
 ['½–۲ h','½–2 h','اثر'],['۲−۰/۵ mg','0/5–2 mg','دوز'],['۱/۲−۱','1/2–1','دوز'],
 ['-5–-2 mg','-5–-2 mg',''],['۴-۲ mg','4–2 mg','x = 4 - 2'],['٪ ۲۵','25%',''],
 ['10 mg/5 mL','10 mg/5 mL',''],['1⁄2–2 h','1⁄2–2 h','']
])assert.equal(r.numericText(input,context),expected,input);
console.log('Numeric ranges, signs, ratios, true fractions, slash notation and equation guards: PASS');
