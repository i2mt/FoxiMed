'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8'),c=vm.createContext({window:{}});
vm.runInContext(read('drug-reference.js').replace(/\}\)\(\);\s*$/,'window.readerTest={detailHTML,clinicalProse};})();'),c);
for(let i=1;i<=10;i++)vm.runInContext(read(`drug-reference-book-${String(i).padStart(2,'0')}.js`),c);
vm.runInContext(read('drug-reference-presentation.js'),c);
const book=c.window.FoxiMedDrugBookData,p=c.window.FoxiMedReferencePresentation,byId=new Map(book.map(d=>[d.id,d]));
const chars=s=>[...s.normalize('NFKC').replace(/[\s\u200e\u200f]/g,'')].sort().join('');
const letters=s=>[...s].filter(c=>/\p{L}/u.test(c)).join('');
let tables=0,rows=0,sections=0,fractions=0;
for(const [id,overrides]of Object.entries(p.sections))for(const override of overrides){
 const d=byId.get(id);assert(d.sections.some(s=>s.text===override.original),id+': stale fraction source');
 assert.equal(letters(override.text),letters(override.original),id+': words changed during fraction recovery');
 fractions+=(override.text.match(/[¼½¾⅓⅔⅙⅝]/g)||[]).length;sections++;
}
for(const [id,layouts]of Object.entries(p.timings)){
 const d=byId.get(id),effective=d.sections.map(s=>(p.sections[id]||[]).find(o=>o.original===s.text)?.text||s.text).join('\n');
 const html=c.window.readerTest.detailHTML(d);
 for(const table of layouts){
  assert(effective.includes(table.sourceBlock),id+': stale timing source');
  assert(d.sourcePdfPages.includes(table.sourcePdfPage),id+': wrong source page');
  const cells=table.rows.flatMap(row=>['duration','peak','onset','route'].map(k=>row[k])).join('');
  assert.equal(chars(table.sourceBlock.split('\n').slice(1).join('')),chars(cells),id+': timing text lost or added');
  for(const row of table.rows){assert.equal(typeof row.route,'string');if(!row.route)assert(html.includes('در منبع مشخص نشده'),id+': missing route must remain unspecified');for(const key of ['onset','peak','duration'])assert.equal(typeof row[key],'string');}
  tables++;rows+=table.rows.length;
 }
 assert.equal((html.match(/class="drug-reference-timing-card"/g)||[]).length,layouts.reduce((n,t)=>n+t.rows.length,0),id+': missing route cards');
 assert(!html.includes('مدت اثر اوج اثر شروع اثر'),id+': flattened table retained');
 assert(!html.includes('class="drug-reference-status"'),id+': repeated review notice');
 assert(html.includes('drug-reference-source-footer'),id+': source link removed');
}
assert.equal(tables,398);assert.equal(fractions,94);assert.equal(sections,65);
const atropine=p.timings['sulfate-atropin'][0].rows;
assert(atropine.some(r=>r.route==='خوراکی'&&r.onset.includes('½')),'Oral atropine half-hour source fraction');
assert(atropine.some(r=>r.route.includes('چشم')&&r.peak.includes('½')),'Eye atropine half-hour source fraction');
assert(!c.window.readerTest.clinicalProse('Updated unrelated source','acarbose').includes('drug-reference-timing-card'),'Stale layouts must not be applied');
const report={status:'PASS',records:book.length,timingTables:tables,routeCards:rows,fractionSections:sections,recoveredFractions:fractions,checks:['Exact source anchors','Timing character integrity','Fraction word-order integrity','All tables rendered','Repeated top notes absent','Source footer retained','Stale presentation fallback']};
fs.writeFileSync(path.join(root,'reports/drug-reference-presentation-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
