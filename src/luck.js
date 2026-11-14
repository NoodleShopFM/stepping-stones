/* Static step-total distributions: no convolution runs in the browser. */
(() => {
"use strict";
const MU=255/256, VAR=126719/65536;
const P=[128,64,32,16,8,4,2,1,1].map(v=>v/256);
const M3=P.reduce((a,p,k)=>a+p*(k-MU)**3,0);
const M4=P.reduce((a,p,k)=>a+p*(k-MU)**4,0);
const SKEW=M3/VAR**1.5, EXCESS=M4/VAR**2-3;
const clamp=x=>Math.max(0,Math.min(1,x));
function erf(x){
 const sign=x<0?-1:1;x=Math.abs(x);const t=1/(1+0.3275911*x);
 return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x));
}
const phi=z=>Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
const normal=z=>.5*(1+erf(z/Math.SQRT2));
function cdfApprox(n,s){
 const z=(s+.5-n*MU)/Math.sqrt(n*VAR);
 const density=phi(z);
 return clamp(normal(z)+density*SKEW/(6*Math.sqrt(n))*(1-z*z)
 -density*(EXCESS/(24*n)*(z**3-3*z)+SKEW*SKEW/(72*n)*(z**5-10*z**3+15*z)));
}
function approx(n,s){
 const cdf=cdfApprox(n,s),before=cdfApprox(n,s-1);
 return {pmf:Math.max(0,cdf-before),cdf,mid:clamp((cdf+before)/2),approximate:true};
}
let indexPromise=null;
const cache=new Map();
async function getIndex(){
 if(!indexPromise)indexPromise=fetch("data/index.json").then(r=>{if(!r.ok)throw Error("Could not load probability index");return r.json()}).catch(e=>{indexPromise=null;throw e});
 return indexPromise;
}
async function load(n){
 if(n>630)return null;
 const index=await getIndex(),record=index.records[n];
 if(!record)throw Error("Missing distribution for "+n);
 const chunk=index.chunks[record.chunk];
 if(!cache.has(chunk.file)){
   const pending=fetch("data/"+chunk.file).then(r=>{if(!r.ok)throw Error("Could not load "+chunk.file);return r.arrayBuffer()}).catch(e=>{cache.delete(chunk.file);throw e});
   cache.set(chunk.file,pending);
 }
 const buffer=await cache.get(chunk.file);
 if(buffer.byteLength!==chunk.bytes)throw Error("Unexpected probability table size");
 return {record,view:new DataView(buffer)};
}
function at(data,s){
 const {record,view}=data;
 if(s<record.min)return {pmf:0,cdf:0,mid:0,approximate:false};
 if(s>=record.min+record.count)return {pmf:0,cdf:1,mid:1,approximate:false};
 const offset=record.offset+(s-record.min)*12;
 const pmf=view.getFloat32(offset,true),cdf=view.getFloat32(offset+4,true);
 return {pmf,cdf,mid:clamp(cdf-pmf/2),approximate:false};
}
function distribution(n,data){
 const mean=n*MU,sd=Math.sqrt(n*VAR);
 const lo=Math.max(0,Math.floor(mean-3.6*sd)),hi=Math.min(n*8,Math.ceil(mean+3.6*sd));
 const values=[];
 for(let s=lo;s<=hi;s++)values.push({s,...(data?at(data,s):approx(n,s))});
 return {mean,sd,values};
}
function luckLabel(mid){
 if(mid<.05)return "Terrible luck";
 if(mid<.25)return "Unlucky";
 if(mid<=.75)return "Average luck";
 if(mid<=.95)return "Lucky!";
 return "Extremely lucky!";
}
async function calculate(n,observed){
 if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(observed)||observed<0||observed>n*8)throw RangeError("Invalid step totals");
 const data=await load(n);
 const observation=data?at(data,observed):approx(n,observed);
 return {...distribution(n,data),n,observed,...observation,label:luckLabel(observation.mid)};
}
globalThis.StonesLuck={calculate,approx,cdfApprox,luckLabel};
if(typeof module!=="undefined"&&module.exports)module.exports={calculate,approx,cdfApprox,luckLabel};
})();
