'use strict';
// Execute production input/calculation functions with no main drip control in the DOM.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'script.js'),'utf8'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const field=value=>({value:String(value),style:{},focus(){},scrollIntoView(){}}),nodes={};
const context={window:{},DOM:{doctorOrder:field(''),customVolume:field(''),customAmountInput:field(''),patientWeight:field('')},AppState:{},document:{getElementById(id){assert.notEqual(id,'calculatorDripFactor','Pump calculation must not query a drip selector');return nodes[id]||(nodes[id]=field(''));},querySelector(){return{dataset:{vol:'50'}};}},showToast(){},haptic(){},setTimeout(){}};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(ROOT,'drugDatabase.js'),'utf8')+'\nthis.db=drugDatabase;',context);vm.runInContext(fs.readFileSync(path.join(ROOT,'calculation-core.js'),'utf8')+'\nthis.FoxiCalcCore=window.FoxiCalcCore;',context);
const n=source.indexOf('const PersianNumbers =');vm.runInContext(source.slice(n,source.indexOf('\n};',n)+3),context);
vm.runInContext(source.slice(source.indexOf('function getEffectiveTotalDrug()'),source.indexOf('function syncCalculatorMethodButtons()')),context);
vm.runInContext(source.slice(source.indexOf('function activeDoseUnit('),source.indexOf('function runCalculation(')),context);
vm.runInContext(source.slice(source.indexOf('function getDripFactor('),source.indexOf('// ============================================\n// TAB BAR HEIGHT')),context);
vm.runInContext(source.slice(source.indexOf('function calculateManualInfusion()'),source.indexOf('\n}',source.indexOf('function calculateManualInfusion()'))+2),context);
let cases=0;const factors={g:1e6,mg:1e3,mcg:1,units:1};
const close=(actual,expected,label)=>assert(Math.abs(actual-expected)<=Math.abs(expected)*1e-11+1e-12,label+': '+actual+' != '+expected);
for(const [id,drug]of Object.entries(context.db))for(let index=0;index<drug.ampouleOptions.length;index++)for(const weighted of [false,true]){
 if(weighted&&!drug.weightBased?.active)continue;
 for(const method of ['syringe','infusion'])for(const count of [1,3])for(const volume of [10,50,100,250,17.5,888.8])for(const weight of weighted?[45,70,100]:[70])for(const custom of [false,true]){
  const a=drug.ampouleOptions[index],unit=weighted?drug.weightBased.unit:drug.weightBased?.nonWeightUnit||drug.standardUnit;
  const total=custom?.4:count*a.strength,dose=3.75,period=unit.includes('/min')?60:1,kg=weighted?weight:1,unitRatio=factors[unit.split('/')[0]]/factors[a.unit];
  Object.assign(context.AppState,{selectedDrug:id,currentAmpouleIndex:index,infusionMethod:method,ampouleCount:count,useWeight:weighted,useCustomDrugAmount:custom,customVolume:volume===17.5,solutionVolume:volume});
  Object.assign(context.DOM.doctorOrder,{value:String(dose)});context.DOM.patientWeight.value=String(weight);context.DOM.customAmountInput.value=String(total);context.DOM.customVolume.value=String(volume);
  const forward=context.readCalculation('forward'),expected=dose*period*kg*unitRatio*volume/total;
  close(forward.pumpRate,expected,id+' forward '+method);close(forward.concentration,total/volume,'concentration');close(forward.duration,volume/expected,'duration');assert.equal(forward.dripFactor,null);
  context.DOM.doctorOrder.value='5.25';const reverse=context.readCalculation('reverse'),expectedDose=5.25*total/volume/unitRatio/period/kg;
  close(reverse.dose,expectedDose,id+' reverse '+method);assert.equal(reverse.pumpRate,5.25);assert.equal(reverse.dripFactor,null);cases+=2;
 }
}
const examples=[];
for(const [id,total,volume,dose,weighted,weight,expected]of [['heparin',10000,50,1000,false,70,5],['norepinephrine',4,50,.1,true,70,5.25],['fentanyl',1000,50,10,false,70,.5]]){
 Object.assign(context.AppState,{selectedDrug:id,currentAmpouleIndex:0,ampouleCount:1,infusionMethod:'syringe',useWeight:weighted,useCustomDrugAmount:true,customVolume:false,solutionVolume:volume});context.DOM.doctorOrder.value=String(dose);context.DOM.customAmountInput.value=String(total);context.DOM.patientWeight.value=String(weight);
 close(context.readCalculation('forward').pumpRate,expected,'worked example '+id);examples.push({drug:id,totalDrug:total,drugUnit:context.db[id].ampouleOptions[0].unit,finalVolume_mL:volume,dose,doseUnit:context.readCalculation('forward').doseUnit,weight_kg:weighted?weight:null,expected_mL_h:expected});
}
let manualCases=0;
for(const [amount,drugUnit,dose,doseUnit,weight,expected]of [[1,'g',10,'mcg/min',70,.03],[200,'mg',5,'mcg/kg/min',70,5.25],[10000,'units',1000,'units/hr',70,5]]){
 for(const [id,v]of Object.entries({manualDrugAmount:amount,manualDrugUnit:drugUnit,manualDesiredDose:dose,manualDoseUnit:doseUnit,manualPatientWeight:weight}))context.document.getElementById(id).value=String(v);
 let baseline;
 for(const factor of ['',10,15,20,60]){context.document.getElementById('manualDripFactor').value=String(factor);context.calculateManualInfusion();const rate=Number(nodes.manualPumpRate.textContent);close(rate,expected,'manual pump rate independent of factor '+factor);if(factor===''){assert.equal(nodes.manualDripRow.style.display,'none');baseline=rate;}else assert.equal(rate,baseline);manualCases++;}
}
assert(!html.includes('id="calculatorDripFactor"'));assert(!html.includes('id="dripRateRow"'));
const report={status:'PASS',version:'5.4.1',mainCalculationCases:cases,manualFactorIndependenceCases:manualCases,drugs:Object.keys(context.db).length,scope:'Production readCalculation and manual calculator; independent expected values; no main drip DOM element',examples,clinicalScope:'Synthetic arithmetic checks, not dosing recommendations'};
fs.writeFileSync(path.join(ROOT,'reports/pump-without-drip-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
