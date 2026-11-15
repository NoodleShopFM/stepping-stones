(function defineStonesCore(){
  "use strict";
  const STEPS=8, PACKS=[8,42,150,630], VERSION=3;
  const PAYOUT=[
    {hammers:0,coins:0,basic:0,set:0},
    {hammers:2,coins:200,basic:0,set:0},
    {hammers:6,coins:700,basic:0,set:0},
    {hammers:14,coins:1400,basic:0,set:0},
    {hammers:34,coins:2100,basic:0,set:0},
    {hammers:74,coins:3100,basic:0,set:0},
    {hammers:74,coins:3100,basic:1,set:0},
    {hammers:224,coins:5100,basic:1,set:0},
    {hammers:224,coins:5100,basic:1,set:1}
  ];
  function emptyRewards(){return {hammers:0,coins:0,basic:0,set:0};}
  function randomTiles(rng=Math.random){return Array.from({length:16},()=>Math.min(2,Math.floor(rng()*3)));}
  function currentAttempt(rng=Math.random){return {status:"ready",step:0,choices:[],earned:emptyRewards(),tiles:randomTiles(rng)};}
  function freshState(){return {version:VERSION,wallet:0,unlimited:false,spent:0,completed:0,steps:0,bank:emptyRewards(),outcomeCounts:Array(9).fill(0),current:currentAttempt()};}
  function validCount(x){return Number.isSafeInteger(x)&&x>=0;}
  function rewardForSteps(steps){
    if(!Number.isInteger(steps)||steps<0||steps>8)throw new RangeError("Steps must be 0 through 8");
    return {...PAYOUT[steps]};
  }
  function plus(a,b){
    for(const key of ["hammers","coins","basic","set"])a[key]+=b[key];
    return a;
  }
  function canStart(state){return state.unlimited||state.wallet>0;}
  function addTokens(state,count){
    if(!PACKS.includes(count)||state.current.status==="active")return false;
    if(!Number.isSafeInteger(state.wallet+count))return false;
    state.wallet+=count;
    state.unlimited=false;
    return true;
  }
  function toggleInfinite(state){
    if(state.current.status==="active")return false;
    state.unlimited=!state.unlimited;
    return true;
  }
  function restart(state){
    if(!["won","lost"].includes(state.current.status)||!canStart(state))return false;
    state.current=currentAttempt();
    return true;
  }
  function settle(state){
    const step=state.current.step;
    const reward=rewardForSteps(step);
    state.completed++;
    state.steps+=step;
    state.outcomeCounts[step]++;
    plus(state.bank,reward);
    state.current.earned=reward;
  }
  function choose(state,step,side,rng=Math.random){
    const current=state.current;
    if(!["ready","active"].includes(current.status)||step!==current.step||!["top","bottom"].includes(side))return {ok:false,reason:"Not the current stone"};
    if(current.status==="ready"){
      if(!canStart(state))return {ok:false,reason:"No tokens left"};
      if(!state.unlimited)state.wallet--;
      state.spent++;
      current.status="active";
    }
    const safe=rng()<0.5;
    current.choices.push({side,safe});
    if(safe){
      current.step++;
      if(current.step===STEPS)current.status="won";
    }else current.status="lost";
    const ended=current.status==="won"||current.status==="lost";
    if(ended)settle(state);
    return {ok:true,safe,ended,steps:current.step,gained:ended?{...current.earned}:null};
  }
  function simulate(rng=Math.random){
    const choices=[];
    for(let step=0;step<STEPS;step++){
      const side=rng()<0.5?"top":"bottom",safe=rng()<0.5;
      choices.push({side,safe});
      if(!safe)break;
    }
    const steps=choices.filter(c=>c.safe).length;
    return {steps,choices,won:steps===8,reward:rewardForSteps(steps),tiles:randomTiles(rng)};
  }
  function autoTwenty(state,rng=Math.random){
    if(state.current.status==="active")return {ok:false,reason:"Finish the current attempt first"};
    if(!state.unlimited&&state.wallet<20)return {ok:false,reason:"Need 20 tokens"};
    if(!state.unlimited)state.wallet-=20;
    state.spent+=20;
    const summary={ok:true,runs:[],steps:0,wins:0,reward:emptyRewards(),counts:Array(9).fill(0)};
    for(let n=0;n<20;n++){
      const run=simulate(rng);
      summary.runs.push(run);
      summary.steps+=run.steps;
      summary.wins+=Number(run.won);
      summary.counts[run.steps]++;
      plus(summary.reward,run.reward);
      state.outcomeCounts[run.steps]++;
    }
    state.completed+=20;
    state.steps+=summary.steps;
    plus(state.bank,summary.reward);
    state.current=currentAttempt();
    return summary;
  }
  function validTiles(tiles){return Array.isArray(tiles)&&tiles.length===16&&tiles.every(v=>Number.isInteger(v)&&v>=0&&v<=2);}
  function restoreState(raw){
    if(!raw||raw.version!==VERSION||!Array.isArray(raw.outcomeCounts)||raw.outcomeCounts.length!==9)return freshState();
    if(!raw.outcomeCounts.every(validCount)||!validCount(raw.wallet)||!validCount(raw.spent))return freshState();
    const s=freshState();
    s.outcomeCounts=[...raw.outcomeCounts];
    s.wallet=raw.wallet;
    s.spent=raw.spent;
    s.unlimited=raw.unlimited===true;
    for(let i=0;i<=8;i++){
      const count=s.outcomeCounts[i];
      s.completed+=count;
      s.steps+=i*count;
      for(const key of Object.keys(s.bank))s.bank[key]+=count*PAYOUT[i][key];
    }
    if(!Number.isSafeInteger(s.completed)||!Number.isSafeInteger(s.steps)||Object.values(s.bank).some(v=>!Number.isSafeInteger(v)))return freshState();
    const choices=raw.current?.choices;
    if(Array.isArray(choices)&&choices.length<=8&&choices.every(c=>(c.side==="top"||c.side==="bottom")&&typeof c.safe==="boolean")){
      let valid=true,failed=false,steps=0;
      for(const c of choices){
        if(failed)valid=false;
        if(c.safe)steps++;else failed=true;
      }
      if(valid&&choices.length){
        s.current={status:failed?"lost":steps===8?"won":"active",step:steps,choices:choices.map(c=>({side:c.side,safe:c.safe})),earned:failed||steps===8?rewardForSteps(steps):emptyRewards(),tiles:validTiles(raw.current.tiles)?[...raw.current.tiles]:randomTiles()};
      }
    }
    if(s.spent<s.completed+Number(s.current.status==="active"))return freshState();
    if(s.current.status==="ready"&&validTiles(raw.current?.tiles))s.current.tiles=[...raw.current.tiles];
    return s;
  }
  const api={STEPS,PACKS,PAYOUT,randomTiles,freshState,rewardForSteps,canStart,addTokens,toggleInfinite,restart,choose,simulate,autoTwenty,restoreState};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(typeof globalThis!=="undefined")globalThis.StonesCore=api;
  return api;
})();
