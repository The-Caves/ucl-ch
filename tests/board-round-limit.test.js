import test from "node:test";
import assert from "node:assert/strict";
import {makeDoubleElimination} from "../src/engine.js";
import {addStation,availableMatches,assignMatchToBoard,submitStationRound} from "../src/board-control.js";
import {SOLO_PARTNER_ID} from "../src/tournament-formats.js";
function fixture(roundLimit=2){
 const e={id:"t",parentEventId:"parent",format:"singles",roundLimit,status:"Active",ids:[1,2,3,4]};
 return {director:true,eventGroups:[{id:"parent"}],events:[e],matches:makeDoubleElimination([1,2,3,4],"t"),scorecards:[],boardStations:[]};
}
test("a game can finish below 21 at director-defined round cap, freeing its board",()=>{
 const s=fixture(2),b=addStation(s,"parent");
 const m=assignMatchToBoard(s,b.id,availableMatches(s,"parent")[0].id);
 submitStationRound(s,{stationId:b.id,matchId:m.id,expectedRound:0,aIn:1,aOn:0,bIn:0,bOn:0});
 const result=submitStationRound(s,{stationId:b.id,matchId:m.id,expectedRound:1,aIn:0,aOn:1,bIn:0,bOn:0});
 assert.equal(result.completed,true);
 assert.equal(result.scoreA,4);
 assert.equal(result.scoreB,0);
 assert.equal(s.boardStations[0].matchId,null);
 assert.equal(s.matches.find(x=>x.id===m.id).status,"Final");
});
test("tie after cap requires recorded tiebreak, then finalizes without tie",()=>{
 const s=fixture(2),b=addStation(s,"parent");
 const m=assignMatchToBoard(s,b.id,availableMatches(s,"parent")[0].id);
 submitStationRound(s,{stationId:b.id,matchId:m.id,expectedRound:0,aIn:1,aOn:0,bIn:0,bOn:0});
 const tied=submitStationRound(s,{stationId:b.id,matchId:m.id,expectedRound:1,aIn:0,aOn:0,bIn:1,bOn:0});
 assert.equal(tied.completed,false);
 assert.equal(tied.scoreA,tied.scoreB);
 const overtime=submitStationRound(s,{stationId:b.id,matchId:m.id,expectedRound:2,aIn:1,aOn:0,bIn:0,bOn:0});
 assert.equal(overtime.completed,true);
 assert.equal(s.scorecards.filter(r=>r.matchId===m.id).length,3);
 assert.notEqual(overtime.scoreA,overtime.scoreB);
});
test("a Solo Slot never qualifies as an individual scoring thrower",()=>{
 const s={director:true,eventGroups:[{id:"parent"}],events:[{id:"d",parentEventId:"parent",format:"blind-draw",ids:[[1,SOLO_PARTNER_ID],[2,3],[4,5]]}],matches:makeDoubleElimination([[1,SOLO_PARTNER_ID],[2,3],[4,5]],"d"),scorecards:[],boardStations:[]};
 const board=addStation(s,"parent");const game=availableMatches(s,"parent").find(m=>(m.a||[]).includes(SOLO_PARTNER_ID)||(m.b||[]).includes(SOLO_PARTNER_ID));
 assert.ok(game);
 const match=assignMatchToBoard(s,board.id,game.id);
 const ghostA=(match.a||[]).includes(SOLO_PARTNER_ID);
 const fake={stationId:board.id,matchId:game.id,expectedRound:0,aIn:1,aOn:0,bIn:0,bOn:0,throwerA:ghostA?SOLO_PARTNER_ID:match.a[0],throwerB:ghostA?match.b[0]:SOLO_PARTNER_ID};
 assert.throws(()=>submitStationRound(s,fake),/actual thrower/);
 const saved=submitStationRound(s,{...fake,throwerA:match.a.find(x=>x>0),throwerB:match.b.find(x=>x>0)});
 assert.equal(saved.row.throwerA>0,true);assert.equal(saved.row.throwerB>0,true);
});
