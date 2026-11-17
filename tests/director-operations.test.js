import test from "node:test";
import assert from "node:assert/strict";
import {makeDoubleElimination} from "../src/engine.js";
import {availableMatches,addStation,assignMatchToBoard,submitStationRound} from "../src/board-control.js";
import {toggleMatchHold,toggleTournamentHold,flexBoard,transferOptions} from "../src/director-operations.js";
function s(){return {director:true,eventGroups:[{id:"event"}],events:[{id:"a",parentEventId:"event",name:"Singles A",ids:[1,2,3,4]},{id:"b",parentEventId:"event",name:"Singles B",ids:[5,6,7,8]}],boardStations:[],matches:[...makeDoubleElimination([1,2,3,4],"a"),...makeDoubleElimination([5,6,7,8],"b")],scorecards:[]}}
test("tournament and match freezes block assignment, not existing scored rounds",()=>{
 const state=s(),station=addStation(state,"event");
 const first=availableMatches(state,"event")[0];
 toggleMatchHold(state,first.id);
 assert.equal(availableMatches(state,"event").some(x=>x.id===first.id),false);
 assert.throws(()=>assignMatchToBoard(state,station.id,first.id),/not ready/);
 toggleMatchHold(state,first.id);
 const m=assignMatchToBoard(state,station.id,first.id);
 toggleTournamentHold(state,m.eventId);
 const row=submitStationRound(state,{stationId:station.id,matchId:m.id,expectedRound:0,aIn:1,aOn:1,bIn:0,bOn:0});
 assert.equal(row.scoreA,4);
 assert.equal(availableMatches(state,"event").every(x=>x.eventId!=="a"),true);
});
test("director can flex an empty board to a ready match in a different child bracket",()=>{
 const state=s(),board=addStation(state,"event");
 const target=availableMatches(state,"event").find(m=>m.eventId==="b");
 flexBoard(state,{stationId:board.id,matchId:target.id,actor:"Director"});
 assert.equal(state.boardStations[0].matchId,target.id);
 assert.equal(state.matches.find(m=>m.id===target.id).status,"In Progress");
 assert.equal(state.operationsAudit[0].type,"board-flex");
});
test("director can move a scored match to an empty board without losing its rounds",()=>{
 const state=s(),a=addStation(state,"event"),b=addStation(state,"event");
 const match=assignMatchToBoard(state,a.id,availableMatches(state,"event")[0].id);
 submitStationRound(state,{stationId:a.id,matchId:match.id,expectedRound:0,aIn:1,aOn:0,bIn:0,bOn:0});
 flexBoard(state,{stationId:b.id,matchId:match.id,actor:"Director"});
 assert.equal(a.matchId,null);
 assert.equal(b.matchId,match.id);
 assert.equal(state.scorecards.length,1);
 assert.equal(state.matches.find(x=>x.id===match.id).court,b.number);
});
test("board with saved scoring cannot silently discard active match to host another bracket",()=>{
 const state=s(),a=addStation(state,"event");
 const current=assignMatchToBoard(state,a.id,availableMatches(state,"event")[0].id);
 submitStationRound(state,{stationId:a.id,matchId:current.id,expectedRound:0,aIn:1,aOn:0,bIn:0,bOn:0});
 const target=availableMatches(state,"event").find(x=>x.eventId==="b");
 const before=JSON.stringify(state);
 assert.throws(()=>flexBoard(state,{stationId:a.id,matchId:target.id}),/saved rounds/);
 assert.equal(JSON.stringify(state),before);
});
