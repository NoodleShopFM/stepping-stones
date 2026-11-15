#!/usr/bin/env node
/** Run: node --test tests/game-core.test.cjs */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const game=require("../src/game-core.js");
const good=()=>0.1, bad=()=>0.9;
test("all cumulative milestones and maximum payout",()=>{
  assert.deepEqual(game.rewardForSteps(0),{hammers:0,coins:0,basic:0,set:0});
  assert.deepEqual(game.rewardForSteps(5),{hammers:74,coins:3100,basic:0,set:0});
  assert.deepEqual(game.rewardForSteps(6),{hammers:74,coins:3100,basic:1,set:0});
  assert.deepEqual(game.rewardForSteps(7),{hammers:224,coins:5100,basic:1,set:0});
  assert.deepEqual(game.rewardForSteps(8),{hammers:224,coins:5100,basic:1,set:1});
});
test("first stone costs exactly one token, including failed step zero",()=>{
  const s=game.freshState();
  assert.equal(game.choose(s,0,"top",bad).ok,false);
  game.addTokens(s,8);
  game.choose(s,0,"bottom",bad);
  assert.equal(s.spent,1);assert.equal(s.wallet,7);assert.equal(s.completed,1);
  assert.equal(s.steps,0);assert.equal(s.bank.hammers,0);
  assert.equal(game.choose(s,0,"bottom",bad).ok,false);
  assert.equal(s.completed,1);
});
test("continue in-progress attempt without extra charge",()=>{
  const s=game.freshState();game.addTokens(s,8);
  game.choose(s,0,"top",good);
  assert.equal(s.spent,1);assert.equal(s.completed,0);
  game.choose(s,1,"bottom",bad);
  assert.equal(s.spent,1);assert.equal(s.completed,1);assert.equal(s.steps,1);
  assert.equal(s.bank.coins,200);
  assert.equal(game.restart(s),true);
});
test("full win, no duplicate payout, last-token completion",()=>{
  const s=game.freshState();game.addTokens(s,8);
  for(let r=0;r<7;r++){game.choose(s,0,"top",bad);game.restart(s);}
  for(let i=0;i<8;i++)game.choose(s,i,"top",good);
  assert.equal(s.wallet,0);assert.equal(s.completed,8);
  assert.deepEqual(s.bank,{hammers:224,coins:5100,basic:1,set:1});
  assert.equal(s.current.status,"won");
  assert.equal(game.restart(s),false);
  game.addTokens(s,8);assert.equal(game.restart(s),true);
  assert.equal(s.completed,8);
});
test("auto x20 rejects underfunded and in-progress games",()=>{
  const s=game.freshState();game.addTokens(s,8);
  assert.equal(game.autoTwenty(s,bad).ok,false);
  assert.equal(s.wallet,8);
  game.addTokens(s,42);
  game.choose(s,0,"top",good);
  assert.equal(game.autoTwenty(s,bad).ok,false);
  assert.equal(s.wallet,49);
});
test("auto x20 accounts exactly 20 tokens and cumulative winnings",()=>{
  const s=game.freshState();game.addTokens(s,42);
  const result=game.autoTwenty(s,good);
  assert.equal(result.ok,true);assert.equal(result.wins,20);
  assert.equal(s.wallet,22);assert.equal(s.spent,20);
  assert.equal(s.completed,20);assert.equal(s.steps,160);
  assert.equal(s.bank.hammers,4480);assert.equal(s.bank.coins,102000);
  assert.equal(s.bank.basic,20);assert.equal(s.bank.set,20);
  assert.equal(s.outcomeCounts[8],20);
});
test("infinite mode preserves wallet; finite pack exits it",()=>{
  const s=game.freshState();game.addTokens(s,8);
  assert.equal(game.toggleInfinite(s),true);
  game.autoTwenty(s,bad);
  assert.equal(s.wallet,8);assert.equal(s.spent,20);
  assert.equal(game.addTokens(s,42),true);
  assert.equal(s.unlimited,false);assert.equal(s.wallet,50);
});
test("reload restores derived bank and in-progress position",()=>{
  const s=game.freshState();game.addTokens(s,8);
  game.choose(s,0,"top",good);game.choose(s,1,"bottom",good);
  let restored=game.restoreState(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.current.status,"active");assert.equal(restored.current.step,2);
  game.choose(restored,2,"top",bad);
  restored=game.restoreState(JSON.parse(JSON.stringify(restored)));
  assert.equal(restored.completed,1);assert.equal(restored.steps,2);
  assert.equal(restored.bank.hammers,6);assert.equal(restored.bank.coins,700);
  assert.equal(restored.wallet,7);
});
test("invalid state is rejected; reset creates clean state",()=>{
  const invalid=game.restoreState({version:1});
  const fresh=game.freshState();
  assert.deepEqual({...invalid,current:{...invalid.current,tiles:[]}}, {...fresh,current:{...fresh.current,tiles:[]}});
  assert.deepEqual(game.freshState().outcomeCounts,Array(9).fill(0));
});
