#!/usr/bin/env node
const {test}=require("node:test");
const assert=require("node:assert/strict");
const game=require("../src/game-core.js");
test("every bridge has 16 independent tile variant slots",()=>{
 const s=game.freshState();
 assert.equal(s.current.tiles.length,16);
 assert.ok(s.current.tiles.every(v=>Number.isInteger(v)&&v>=0&&v<=2));
 assert.deepEqual(game.randomTiles(()=>0),Array(16).fill(0));
 assert.deepEqual(game.randomTiles(()=>0.5),Array(16).fill(1));
 assert.deepEqual(game.randomTiles(()=>0.999),Array(16).fill(2));
});
test("tile art stays fixed across gameplay and refresh, then resets",()=>{
 const s=game.freshState();
 game.addTokens(s,8);
 const tiles=[...s.current.tiles];
 game.choose(s,0,"top",()=>0.1);
 assert.deepEqual(s.current.tiles,tiles);
 const restored=game.restoreState(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.current.tiles,tiles);
 game.choose(restored,1,"bottom",()=>0.9);
 assert.deepEqual(restored.current.tiles,tiles);
 assert.equal(game.restart(restored),true);
 assert.equal(restored.current.tiles.length,16);
});
test("auto-run produces fresh 16-tile bridges for each run",()=>{
 const s=game.freshState();game.addTokens(s,42);
 const batch=game.autoTwenty(s,()=>0.1);
 assert.equal(batch.runs.length,20);
 for(const run of batch.runs)assert.equal(run.tiles.length,16);
});
