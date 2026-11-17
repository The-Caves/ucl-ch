import test from "node:test";
import assert from "node:assert/strict";
import {seedPositions,seedEntrants,placeBracketSeeds,pairTeams,makeRounders,rounderStandings,createConfiguredTournament,addSignup,addFixedTeam,launchTournament,setEntryPaid,setEventDoorFee,markDoorPaid,advanceSwapToBracket,SOLO_PARTNER_ID} from "../src/tournament-formats.js";
const demo=()=>({director:true,eventGroups:[{id:"event",date:"2026-11-17"}],events:[],matches:[],scorecards:[]});
const roster=Array.from({length:25},(_,i)=>({id:i+1,name:"Player "+(i+1)}));
const make=(state,config,participants)=>{const t=createConfiguredTournament(state,{parentId:"event",name:"Example",...config});for(const id of participants)addSignup(state,t.id,id,roster);return t};
test("seed slots put best seed opposite weakest with automatic byes",()=>{
 assert.deepEqual(seedPositions(8),[1,8,4,5,2,7,3,6]);
 assert.deepEqual(placeBracketSeeds([1,2,3,4,5]),[1,null,4,5,2,null,3,null]);
 const ordered=seedEntrants([1,2,3],{mode:"event-points",rankings:{1:{points:50},2:{points:20},3:{points:40}}});
 assert.deepEqual(ordered,[1,3,2]);
 assert.throws(()=>seedEntrants([1,2],{mode:"national-ranking"}),/Missing/);
});
test("all pairing strategies cover every competitor once and assign a solo placeholder for odd fields",()=>{
 for(const mode of ["top-bottom","top-middle","top-bottom-random","blind-draw"]){
  const teams=pairTeams([1,2,3,4,5],mode,99);
  assert.equal(teams.length,3);
  assert.deepEqual(teams.flat().filter(x=>x!==SOLO_PARTNER_ID).sort((a,b)=>a-b),[1,2,3,4,5]);
 }
 assert.deepEqual(pairTeams(Array.from({length:20},(_,i)=>i+1),"top-bottom").slice(0,3),[[1,20],[2,19],[3,18]]);
 assert.deepEqual(pairTeams(Array.from({length:20},(_,i)=>i+1),"top-middle").slice(0,3),[[1,11],[2,12],[3,13]]);
});
test("registration, payment flags, event/day door fees and fixed teams",()=>{
 const s=demo(),t=make(s,{format:"fixed-doubles",feeAmount:15},[1,2,3,4,5]);
 assert.equal(t.registration.length,5);assert.equal(t.registration[0].paid,false);
 setEntryPaid(s,t.id,1);assert.equal(t.registration[0].paid,true);
 addFixedTeam(s,t.id,1,2);addFixedTeam(s,t.id,3,4);
 assert.throws(()=>addFixedTeam(s,t.id,1,5),/already belongs/);
 const door=setEventDoorFee(s,"event",{amount:7,scope:"day"});
 assert.equal(door.scope,"day");
 const key=markDoorPaid(s,"event",1,{date:"2026-11-17"});assert.equal(key,"1:2026-11-17");
 const result=launchTournament(s,t.id);assert.equal(result.stage,"bracket");
 assert.equal(t.ids.some(a=>a.includes(SOLO_PARTNER_ID)),true);
 assert.throws(()=>addSignup(s,t.id,6,roster),/closed/);
});
test("rounders create independent scored games, not premature playoff advancement",()=>{
 const s=demo(),t=make(s,{format:"swap-doubles",rounders:3,partnerMode:"top-bottom"},[1,2,3,4,5,6,7,8]);
 const result=launchTournament(s,t.id);
 assert.equal(result.stage,"rounders");
 assert.ok(s.matches.every(m=>m.rounder));
 assert.ok(s.matches.every(m=>m.side==="R"));
 assert.throws(()=>advanceSwapToBracket(s,t.id),/Complete/);
});
test("blind draw and singles launch into configured single/double elimination",()=>{
 for(const [format,elim] of [["singles","single"],["singles","double"],["blind-draw","single"],["blind-draw","double"]]){
  const s=demo(),t=make(s,{format,elimination:elim},Array.from({length:9},(_,i)=>i+1));
  const launched=launchTournament(s,t.id);
  assert.equal(launched.stage,"bracket");
  assert.equal(t.status,"Active");
  assert.ok(s.matches.some(m=>m.eventId===t.id));
 }
});


test("circle swap rounders avoid repeat partners during available rotation",()=>{
 const matches=makeRounders(Array.from({length:20},(_,i)=>i+1),"swap-doubles",6,"repeat",27);
 const seen=new Set();
 for(let r=1;r<=6;r++){
  const games=matches.filter(m=>m.round===r);
  const current=new Set();
  for(const m of games)for(const pair of [m.a,m.b]){
   const key=[...pair].sort((a,b)=>a-b).join("-");
   assert.equal(seen.has(key),false,"Repeated teammate pair "+key);
   seen.add(key);
   for(const p of pair)if(p!==SOLO_PARTNER_ID){assert.equal(current.has(p),false,"Player double-booked in round");current.add(p)}
  }
 }
});
test("odd number of doubles swap players uses solo placeholder and never a phantom scorekeeper",()=>{
 const games=makeRounders([1,2,3,4,5],"swap-doubles",5,"odd",39);
 assert.equal(games.every(m=>[m.a,m.b].every(Array.isArray)),true);
 for(const m of games){
  assert.equal([...m.a,...m.b].filter(x=>x===SOLO_PARTNER_ID).length<=1,true);
 }
});
