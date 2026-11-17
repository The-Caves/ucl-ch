import test from "node:test";
import assert from "node:assert/strict";
import {makeDoubleElimination} from "../src/engine.js";
import {renderDirectorCorrectionPage} from "../src/director-correction-views.js";
const person=id=>Array.isArray(id)?id.join(" & "):"Player "+(id??"TBD");
function state(){return {events:[{id:"one",name:"Main Singles",ids:[1,2,3,4],status:"Active"}],matches:makeDoubleElimination([1,2,3,4],"one"),scorecards:[],directorAudit:[],boardStations:[]}}
test("director page supports manual scores, forfeit, rounds, matchup, swaps and reopen",()=>{
 const s=state(),id="one-W1-0";
 for(const kind of ["result","forfeit","round","matchup","swap","reopen"]){
  const h=renderDirectorCorrectionPage(s,{tournamentId:"one",matchId:id,kind,roundNumber:1,person});
  assert.match(h,/Match Corrections/);assert.match(h,/Correction type/);
  assert.match(h,/Correction History/);assert.match(h,/correctionKindSelect/);
 }
 assert.match(renderDirectorCorrectionPage(s,{tournamentId:"one",matchId:id,kind:"result",roundNumber:1,person}),/Save Audited Correction/);
 assert.match(renderDirectorCorrectionPage(s,{tournamentId:"one",matchId:id,kind:"swap",roundNumber:1,person}),/Other opening-round match/);
});
test("doubles round editor can change correct throwers",()=>{
 const s=state(),id="two-W1-0",a=[1,3],b=[2,4];
 s.events.push({id:"two",name:"Doubles",ids:[a,b,[5,6],[7,8]],status:"Active"});
 s.matches.push(...makeDoubleElimination([a,b,[5,6],[7,8]],"two"));
 s.matches.find(m=>m.id===id).status="In Progress";
 s.scorecards.push({matchId:id,a,b,aIn:2,aOn:1,bIn:1,bOn:0,throwerA:3,throwerB:2});
 const h=renderDirectorCorrectionPage(s,{tournamentId:"two",matchId:id,kind:"round",roundNumber:1,person});
 assert.match(h,/throwerA/);assert.match(h,/throwerB/);
 assert.match(h,/name="aIn"/);assert.match(h,/Saved round/);
});
test("unplayed bracket-dependent matchup cannot be edited directly",()=>{
 const s=state();
 const h=renderDirectorCorrectionPage(s,{tournamentId:"one",matchId:"one-W2-0",kind:"matchup",person});
 assert.match(h,/Only unplayed opening-round/);assert.match(h,/disabled/);
});
