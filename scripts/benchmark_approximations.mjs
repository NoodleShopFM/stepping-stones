#!/usr/bin/env node
/** Compare approximations against independent Float64 DP distributions.
 * Run: node scripts/benchmark_approximations.mjs
 * Errors are reported in percentage points within |z| <= 3.
 */
const probs=Array.from({length:9},(_,k)=>k<8?2**(-k-1):1/256);
const mu=255/256, variance=126719/65536;
const skew=probs.reduce((v,p,k)=>v+p*(k-mu)**3,0)/(variance**1.5);
const excess=probs.reduce((v,p,k)=>v+p*(k-mu)**4,0)/variance**2-3;
function erf(x){
 const sign=x<0?-1:1;x=Math.abs(x);const t=1/(1+0.3275911*x);
 return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x));
}
const phi=z=>Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
const normal=z=>0.5*(1+erf(z/Math.SQRT2));
function approximate(n,k,order) {
 const z=(k+0.5-n*mu)/Math.sqrt(n*variance);
 let result=normal(z);
 if(order>=1)result+=phi(z)*(skew/(6*Math.sqrt(n)))*(1-z*z);
 if(order>=2)result-=phi(z)*(excess/(24*n)*(z**3-3*z)+skew**2/(72*n)*(z**5-10*z**3+15*z));
 return Math.max(0,Math.min(1,result));
}
let prev=Float64Array.from([1]);
for(let n=1;n<=630;n++) {
 const next=new Float64Array(prev.length+8);
 for(let s=0;s<prev.length;s++)for(let k=0;k<9;k++)next[s+k]+=prev[s]*probs[k];
 prev=next;
 if(![8,42,150,630].includes(n))continue;
 let cumulative=0;
 const errors=[0,0,0];
 for(let s=0;s<next.length;s++){
  cumulative+=next[s];
  const z=(s-n*mu)/Math.sqrt(n*variance);
  if(Math.abs(z)>3)continue;
  for(let order=0;order<=2;order++)
   errors[order]=Math.max(errors[order],Math.abs(approximate(n,s,order)-cumulative));
 }
 console.log(`n=${n}: normal=${(errors[0]*100).toFixed(5)}pp, Edgeworth 1=${(errors[1]*100).toFixed(5)}pp, Edgeworth 2=${(errors[2]*100).toFixed(5)}pp`);
}
