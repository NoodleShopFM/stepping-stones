/* Upper-tail reward probabilities, using offline tables for <=630 attempts. */
(() => {
"use strict";
const SPECS={
 hammers:{mean:427/64,variance:2169671/4096,rewards:[0,2,6,14,34,74,224],weights:[128,64,32,16,8,6,2]},
 coins:{mean:3225/8,variance:38239375/64,rewards:[0,200,700,1400,2100,3100,5100],weights:[128,64,32,16,8,6,2]}
};
const cache=new Map();
const clamp=x=>Math.max(0,Math.min(1,x));
function erf(x){
 const sign=x<0?-1:1;x=Math.abs(x);const t=1/(1+.3275911*x);
 return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x));
}
const normal=z=>.5*(1+erf(z/Math.SQRT2));
function normalTail(z){return clamp(.5*(1-erf(z/Math.SQRT2)))}
function logGamma(z){
 const p=[.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
 if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
 z-=1;let x=p[0];for(let i=1;i<p.length;i++)x+=p[i]/(z+i);
 const t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
function betaFraction(a,b,x){
 const tiny=1e-300,eps=2e-14;let c=1,d=1-(a+b)*x/(a+1);
 if(Math.abs(d)<tiny)d=tiny;d=1/d;let h=d;
 for(let m=1;m<=250;m++){
  const m2=2*m;
  let aa=m*(b-m)*x/((a+m2-1)*(a+m2));
  d=1+aa*d;if(Math.abs(d)<tiny)d=tiny;c=1+aa/c;if(Math.abs(c)<tiny)c=tiny;d=1/d;h*=d*c;
  aa=-(a+m)*(a+b+m)*x/((a+m2)*(a+m2+1));
  d=1+aa*d;if(Math.abs(d)<tiny)d=tiny;c=1+aa/c;if(Math.abs(c)<tiny)c=tiny;d=1/d;const delta=d*c;h*=delta;
  if(Math.abs(delta-1)<eps)break;
 }
 return h;
}
function betaI(a,b,x){
 if(x<=0)return 0;if(x>=1)return 1;
 const bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));
 return clamp(x<(a+1)/(a+b+2)?bt*betaFraction(a,b,x)/a:1-bt*betaFraction(b,a,1-x)/b);
}
function binomialTail(n,k,p){
 if(k<=0)return 1;if(k>n)return 0;
 return betaI(k,n-k+1,p);
}
async function table(metric,n){
 const key=metric+"-index";
 if(!cache.has(key))cache.set(key,fetch(`data/rewards/${metric}_index.json`).then(r=>{if(!r.ok)throw Error("Reward index unavailable");return r.json()}).catch(e=>{cache.delete(key);throw e}));
 const index=await cache.get(key),record=index.records[n],chunk=index.chunks[record.chunk],file=`data/rewards/${chunk.file}`;
 if(!cache.has(file))cache.set(file,fetch(file).then(r=>{if(!r.ok)throw Error("Reward table unavailable");return r.arrayBuffer()}).catch(e=>{cache.delete(file);throw e}));
 const bytes=await cache.get(file);
 if(bytes.byteLength!==chunk.bytes)throw Error("Reward table size mismatch");
 return {index,record,view:new DataView(bytes)};
}
function approximateReward(metric,n,observed){
 const spec=SPECS[metric],mean=n*spec.mean,sd=Math.sqrt(n*spec.variance);
 const third=spec.rewards.reduce((v,x,i)=>v+spec.weights[i]/256*(x-spec.mean)**3,0);
 const skew=third/(spec.variance**1.5);
 const z=(observed-.5-mean)/sd;
 const density=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
 return clamp(normalTail(z)-density*skew/(6*Math.sqrt(n))*(1-z*z));
}
async function tail(metric,n,observed){
 if(!Number.isSafeInteger(n)||n<0||!Number.isSafeInteger(observed)||observed<0)throw RangeError("Invalid reward inputs");
 if(n===0||observed===0)return {probability:1,approximate:false};
 if(metric==="basic"||metric==="set")return {probability:binomialTail(n,observed,metric==="basic"?1/64:1/256),approximate:false};
 if(!SPECS[metric])throw RangeError("Unknown reward type");
 if(n>630)return {probability:approximateReward(metric,n,observed),approximate:true};
 const {index,record,view}=await table(metric,n);
 const unit=index.unit;
 if(observed%unit!==0)throw RangeError("Reward total not divisible by unit");
 const scaled=observed/unit;
 if(scaled<record.min)return {probability:1,approximate:false,bounded:true};
 if(scaled>=record.min+record.count)return {probability:approximateReward(metric,n,observed),approximate:true,bounded:true};
 const p=view.getFloat32(record.offset+(scaled-record.min)*4,true);
 return {probability:clamp(p),approximate:false};
}
function formatPercent(probability){
 if(!Number.isFinite(probability))return "—";
 if(probability<=0)return "0%";
 const percent=clamp(probability)*100;
 return Number(percent.toPrecision(3)).toString()+"%";
}
globalThis.StonesRewards={tail,formatPercent,binomialTail};
if(typeof module!=="undefined"&&module.exports)module.exports={tail,formatPercent,binomialTail};
})();
