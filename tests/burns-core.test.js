'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ROOT=path.resolve(__dirname,'..');
const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(ROOT,'burns-core.js'),'utf8'),c);const r=c.window.FoxiBurnsCore;
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),keys=[...new Set([...html.matchAll(/data-region="([^"]+)"/g)].map(m=>m[1]))];
assert.equal(keys.length,32);assert.deepEqual(keys.slice().sort(),Object.keys(r.weights('adult')).sort());
const references=[[0,9.5,2.75,2.5],[1,8.5,3.25,2.5],[5,6.5,4,2.75],[10,5.5,4.25,3],[15,4.5,4.5,3.25]];
for(const [age,head,thigh,leg]of references){const w=r.weights('pediatric',age);assert.equal(w.head,head);assert.equal(w.head_b,head);for(const side of ['l','r'])for(const face of ['f','b']){assert.equal(w[side+'_thigh_'+face],thigh);assert.equal(w[side+'_leg_'+face],leg);}assert.equal(r.estimate(keys,'pediatric',age).min,100);}
let wholeBodyChecks=0;for(let age=0;age<=15;age+=.25){const n=r.estimate(keys,'pediatric',age);assert(Math.abs(n.min-100)<1e-10);assert.equal(n.min,n.max);wholeBodyChecks++;}
const adult=r.weights('adult');assert.equal(Object.values(adult).reduce((a,b)=>a+b,0),100);assert.equal(adult.head,3.5);assert.equal(adult.l_thigh_f,4.75);assert.equal(adult.l_leg_f,3.5);assert.equal(adult.l_hand,1.25);assert.equal(adult.l_foot,1.75);
for(const [parts,expected]of [[['head','head_b','neck','neck_b'],9],[['trunk_f','trunk_b','buttocks'],31],[['l_upper_arm','l_upper_arm_b','l_lower_arm','l_lower_arm_b','l_hand','l_hand_b'],9.5],[['l_thigh_f','l_thigh_b','l_leg_f','l_leg_b','l_foot','l_foot_b'],20],[['trunk_f','trunk_f'],13]])assert.equal(r.estimate(parts).min,expected);
assert.equal(r.estimate(['head'],'pediatric',null).min,4.5);assert.equal(r.estimate(['head'],'pediatric',null).max,9.5);
const correlated=r.estimate(['head','l_thigh_f','r_thigh_f'],'pediatric',null);assert.equal(correlated.min,13.5);assert.equal(correlated.max,15,'Do not sum independent age extremes');
assert.equal(r.estimate(keys,'pediatric',null).min,100);assert.equal(r.estimate(keys,'pediatric',null).max,100);assert.equal(r.weights('pediatric',3).head,7.5);
for(const age of [-1,16,NaN,Infinity])assert.throws(()=>r.weights('pediatric',age));assert.throws(()=>r.estimate(['not-a-region']));
for(const [factor,total]of [[4,8400],[2,4200]]){const v=r.fluid({tbsa:30,weight:70,factor});assert.equal(v.total,total);assert.equal(v.first8,total/2);assert.equal(v.next16,total/2);}
assert.equal(r.fluid({tbsa:19.99,weight:70,factor:2}).eligible,false);assert.equal(r.fluid({tbsa:20,weight:70,factor:2}).eligible,true);
for(const options of [{tbsa:0,weight:70,factor:4},{tbsa:101,weight:70,factor:4},{tbsa:30,weight:0,factor:4},{tbsa:30,weight:NaN,factor:4},{tbsa:30,weight:70,factor:3}])assert.throws(()=>r.fluid(options));
const t=r.remainder(8400,2,1000);assert.equal(t.remaining,7400);assert.equal(t.periodRemaining,3200);assert.equal(t.hours,6);assert.equal(r.remainder(8400,8,4200).hours,16);assert.equal(r.remainder(8400,23.9,9000).remaining,0);
for(const [elapsed,given]of [[24,0],[-1,0],[NaN,0],[2,-1]])assert.throws(()=>r.remainder(8400,elapsed,given));
const report={status:'PASS',mappedRegions:keys.length,wholeBodyAgeChecks:wholeBodyChecks+2,checks:['Independent source age-column values','All mapped surfaces total 100%; posterior neck/hands/feet included','No duplicate trunk counting','Anatomical worked examples','Unknown-child range uses correlated age totals','Optional age interpolation','Separate 2/4 mL fluid arithmetic and ABA scope','Elapsed-time boundaries and nonnegative remaining volume']};
fs.writeFileSync(path.join(ROOT,'reports/burns-core-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
