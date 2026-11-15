/* Reward totals relative to the theoretical mean per completed attempt. */
(() => {
  "use strict";
  const MEANS=Object.freeze({
    hammers:427/64,
    coins:3225/8,
    basic:1/64,
    set:1/256
  });
  const formatter=new Intl.NumberFormat("en-US",{maximumSignificantDigits:3});
  function percentOfExpected(metric,completed,observed){
    if(!Object.hasOwn(MEANS,metric))throw new RangeError("Unknown reward type");
    if(!Number.isSafeInteger(completed)||completed<0||!Number.isSafeInteger(observed)||observed<0)
      throw new RangeError("Invalid reward total or attempt count");
    if(completed===0)return null;
    return observed/(completed*MEANS[metric])*100;
  }
  function formatPercent(value){
    if(value===null)return "—";
    if(!Number.isFinite(value)||value<0)return "—";
    return formatter.format(value)+"%";
  }
  const api={MEANS,percentOfExpected,formatPercent};
  globalThis.StonesEfficiency=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
