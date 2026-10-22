/* Quiet, mode-aware guidance. Readiness means complete inputs, not dose approval. */
(function(){
 'use strict';let queued=false;
 const byId=id=>document.getElementById(id);
 function requirements(){
  const drug=drugDatabase[AppState.selectedDrug],weighted=activeDoseUnit(drug)?.includes('/kg');
  const fields=[{id:'doctorOrder',label:AppState.reverseMode?'سرعت پمپ':'دوز درخواستی'}];
  if(AppState.useCustomDrugAmount)fields.unshift({id:'customAmountInput',label:'مقدار کل دارو'});
  if(AppState.customVolume)fields.push({id:'customVolume',label:'حجم نهایی محلول'});
  if(weighted)fields.push({id:'patientWeight',label:'وزن واقعی بیمار'});
  return fields.map(f=>({...f,node:byId(f.id)})).filter(f=>f.node).map(f=>({...f,valid:Number.isFinite(PersianNumbers.parseNumber(f.node.value))&&PersianNumbers.parseNumber(f.node.value)>0&&(f.id!=='patientWeight'||PersianNumbers.parseNumber(f.node.value)<=1000)}));
 }
 function refresh(){
  queued=false;const button=byId('calculateBtn'),root=byId('calculatorTab');if(!button||!root)return;
  const fields=requirements(),missing=fields.filter(f=>!f.valid);
  root.querySelectorAll('.fm-required-missing').forEach(n=>n.classList.remove('fm-required-missing'));
  missing.forEach(f=>f.node.classList.add('fm-required-missing'));
  let ready=!missing.length;
  if(ready){try{readCalculation(AppState.reverseMode?'reverse':'forward');}catch{ready=false;}}
  button.classList.toggle('fm-calculate-ready',ready);button.classList.toggle('fm-calculate-waiting',!ready);
  const label=button.querySelector('span');if(label)label.textContent=(AppState.reverseMode?'محاسبهٔ دوز':'محاسبهٔ سرعت پمپ')+(ready?' — آماده':'');
  const status=byId('calculatorReadiness');if(status)status.textContent=ready?'اطلاعات کامل است؛ نتیجه را با دستور و واحدها بررسی کنید.':missing.length?'برای ادامه: '+missing.map(f=>f.label).join('، '):'واحدها و آماده‌سازی را بررسی کنید.';
 }
 function queue(){if(!queued){queued=true;requestAnimationFrame(refresh);}}
 function setup(){
  const button=byId('calculateBtn');if(!button)return;
  const note=document.createElement('p');note.id='calculatorReadiness';note.className='fm-calculator-readiness';button.after(note);
  document.addEventListener('input',e=>{if(e.target.closest('#calculatorTab'))queue();});
  document.addEventListener('change',e=>{if(e.target.closest('#calculatorTab'))queue();});
  document.addEventListener('click',e=>{if(e.target.closest('#calculatorTab'))queue();});
  window.addEventListener('foximed:calculator-changed',queue);
  button.addEventListener('click',e=>{const missing=requirements().filter(f=>!f.valid);if(!missing.length)return;e.preventDefault();e.stopImmediatePropagation();refresh();missing[0].node.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});missing[0].node.focus({preventScroll:true});showToast('یک قدم باقی است',missing[0].label+' را وارد کنید.','info');},true);
  refresh();
 }
 window.FoxiCalculatorGuidance={refresh:queue};document.addEventListener('DOMContentLoaded',setup);
})();
