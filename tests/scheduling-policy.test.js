import test from "node:test";
import assert from "node:assert/strict";
import {makeDoubleElimination,recordResult} from "../src/engine.js";
import {scheduleCandidates,schedulingWave,needsLosersCatchup} from "../src/scheduling-policy.js";
function board(n){return makeDoubleElimination(Array.from({length:n},(_,i)=>i+1),"t"+n)}
test("correct wave order interleaves winners and losers",()=>{
 const matches=[{side:"W",round:1},{side:"L",round:1},{side:"W",round:2},{side:"L",round:2},{side:"L",round:3},{side:"W",round:3},{side:"L",round:4}];
 assert.deepEqual(matches.map(schedulingWave),[0,1,2,3,4,5,6]);
});
test("32-person tournament holds upper winners rounds while losers catch up",()=>{
 let m=board(32);
 for(const game of m.filter(x=>x.side==="W"&&x.round===1))m=recordResult(m,game.id,21,10);
 for(const game of m.filter(x=>x.side==="W"&&x.round===2))m=recordResult(m,game.id,21,10);
 let x=m.find(x=>x.side==="W"&&x.round===3);
 assert.equal(needsLosersCatchup(m,x),true);
 let queue=scheduleCandidates(m,new Set(["t32"]));
 assert.equal(queue.ready.some(y=>y.id===x.id),false);
 assert.equal(queue.held.some(y=>y.id===x.id),true);
 for(const game of m.filter(x=>x.side==="L"&&x.round===1))m=recordResult(m,game.id,21,11);
 for(const game of m.filter(x=>x.side==="L"&&x.round===2))m=recordResult(m,game.id,21,11);
 assert.equal(needsLosersCatchup(m,m.find(x=>x.id===x.id)),false);
 queue=scheduleCandidates(m,new Set(["t32"]));
 assert.ok(queue.ready.some(y=>y.side==="W"&&y.round===3));
});
test("complete 4, 8, 16, 32, 64 and 128 player double-elimination brackets without deadlock under policy",()=>{
 for(const size of [4,8,16,32,64,128]){
  let games=board(size),done=0;
  for(let step=0;step<300;step++){
   const {ready}=scheduleCandidates(games,new Set(["t"+size]));
   if(!ready.length)break;
   games=recordResult(games,ready[0].id,21,14);done++;
  }
  assert.ok(games.some(x=>x.side==="F"&&x.round===1&&x.status==="Final"),"final missing n="+size);
  assert.equal(games.filter(x=>x.status==="Scheduled"&&x.a!=null&&x.b!=null).length,0,"unfinished n="+size);
  assert.ok(done>=size-1,"too few matches n="+size);
 }
});
test("an in-progress player cannot be scheduled in a second match even across brackets",()=>{
 const list=[
  {id:"A",eventId:"a",side:"W",round:1,slot:0,status:"In Progress",a:[1,2],b:[3,4]},
  {id:"B",eventId:"b",side:"W",round:1,slot:0,status:"Scheduled",a:2,b:5},
  {id:"C",eventId:"b",side:"W",round:1,slot:1,status:"Scheduled",a:6,b:7}
 ];
 const queue=scheduleCandidates(list,new Set(["a","b"]));
 assert.deepEqual(queue.ready.map(x=>x.id),["C"]);
});
