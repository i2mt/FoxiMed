/* Lund–Browder chart arithmetic, separate from fluid planning. */
(function(window){
 'use strict';
 // ScotSTAR / Scottish Ambulance Service CG032, Appendix 1 (2023).
 // Hand surface 1.25%: DHA burns guideline Appendix 2 (2024).
 const ages=[0,1,5,10,15],growth=[[9.5,2.75,2.5],[8.5,3.25,2.5],[6.5,4,2.75],[5.5,4.25,3],[4.5,4.5,3.25]],adult=[3.5,4.75,3.5];
 const fixed={neck:1,neck_b:1,trunk_f:13,trunk_b:13,buttocks:5,perineum:1};
 for(const side of ['l','r'])for(const back of ['', '_b']){
  fixed[side+'_upper_arm'+back]=2;fixed[side+'_lower_arm'+back]=1.5;
  fixed[side+'_hand'+back]=1.25;fixed[side+'_foot'+back]=1.75;
 }
 function weights(mode,age=null){
  let abc=adult;
  if(mode==='pediatric'){
   if(!Number.isFinite(age)||age<0||age>15)throw Error('child-age');
   const hi=ages.findIndex(n=>n>=age),lo=Math.max(0,hi-1),span=ages[hi]-ages[lo],t=span?(age-ages[lo])/span:0;
   abc=growth[lo].map((v,i)=>v+(growth[hi][i]-v)*t);
  }else if(mode!=='adult')throw Error('age-mode');
  const values={...fixed,head:abc[0],head_b:abc[0]};
  for(const side of ['l','r'])for(const face of ['f','b']){values[side+'_thigh_'+face]=abc[1];values[side+'_leg_'+face]=abc[2];}
  return values;
 }
 function estimate(selected,mode='adult',age=null){
  const keys=[...new Set(selected)],candidates=mode==='pediatric'&&age===null?ages:[age];
  const totals=candidates.map(a=>{const w=weights(mode,a);return keys.reduce((sum,key)=>{if(!(key in w))throw Error('unknown-region');return sum+w[key];},0);});
  return {min:Math.min(...totals),max:Math.max(...totals),count:keys.length,ageKnown:mode==='adult'||age!==null};
 }
 function fluid({tbsa,weight,factor}){
  if(!Number.isFinite(tbsa)||tbsa<=0||tbsa>100||!Number.isFinite(weight)||weight<=0||weight>1000||![2,4].includes(factor))throw Error('fluid-input');
  if(factor===2&&tbsa<20)return {eligible:false};
  const total=factor*weight*tbsa;return {eligible:true,total,first8:total/2,next16:total/2};
 }
 function remainder(total,elapsed,given){
  if(!Number.isFinite(total)||total<=0||!Number.isFinite(elapsed)||elapsed<0||elapsed>=24||!Number.isFinite(given)||given<0)throw Error('timing-input');
  return {remaining:Math.max(0,total-given),periodRemaining:Math.max(0,(elapsed<8?total/2:total)-given),hours:(elapsed<8?8:24)-elapsed};
 }
 window.FoxiBurnsCore=Object.freeze({weights,estimate,fluid,remainder});
})(window);
