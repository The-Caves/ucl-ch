import test from "node:test";
import assert from "node:assert/strict";
import {makeDoubleElimination} from "../src/engine.js";
import {initializeBoardFloor,boardStations,boardMatch,availableMatches,assignMatchToBoard,assignNextMatch,addStation,releaseBoard,submitStationRound} from "../src/board-control.js";
function initial(){const parentId="event-1";return {eventGroups:[{id:parentId,name:"Venue"}],events:[{id:"singles",parentEventId:parentId,ids:[1,2,3,4]},{id:"doubles",parentEventId:parentId,ids:[[1,3],[2,4],[5,6],[7,8]]}],matches:[...makeDoubleElimination([1,2,3,4],"singles"),...makeDoubleElimination([[1,3],[2,4],[5,6],[7,8]],"doubles")],scorecards:[],boardStations:[]}}
test("boards belong to a shared parent event, not an individual tournament",()=>{
 const s=initial();initializeBoardFloor(s);
 const a=add(s),b=add(s);
 assert.notEqual(a.id,b.id);assert.equal(boardStations(s,"event-1").length,2);
 assert.equal(boardStations(s,"wrong").length,0);
});
function add(s){return addStation(s,"event-1")}
test("a station can assign a ready match; players and boards cannot be double-booked",()=>{
 const s=initial(),a=add(s),b=add(s),available=availableMatches(s,"event-1");
 const m=assignMatchToBoard(s,a.id,available[0].id);
 assert.equal(m.status,"In Progress");assert.equal(boardMatch(s,a.id).id,m.id);
 assert.throws(()=>assignMatchToBoard(s,b.id,m.id),/not ready|already assigned/);
 assert.throws(()=>assignMatchToBoard(s,a.id,available[1].id),/Finish or release/);
 releaseBoard(s,a.id);assert.equal(boardMatch(s,a.id),null);
 assert.equal(s.matches.find(x=>x.id===m.id).status,"Scheduled");
});
test("each saved round updates cancellation scoring and PPR immediately",()=>{
 const s=initial(),board=add(s),match=assignMatchToBoard(s,board.id,availableMatches(s,"event-1")[0].id);
 const r=submitStationRound(s,{stationId:board.id,matchId:match.id,expectedRound:0,aIn:2,aOn:1,bIn:1,bOn:1});
 assert.equal(r.scoreA,3);assert.equal(r.scoreB,0);assert.equal(r.statsA.ppr,7);
 assert.equal(s.scorecards.filter(x=>x.matchId===match.id).length,1);
 assert.throws(()=>submitStationRound(s,{stationId:board.id,matchId:match.id,expectedRound:0,aIn:2,aOn:1,bIn:1,bOn:1}),/Round changed/);
 assert.throws(()=>releaseBoard(s,board.id),/Cannot release/);
});
test("game reaching 21 advances bracket and frees board exactly once",()=>{
 const s=initial(),board=add(s),match=assignMatchToBoard(s,board.id,availableMatches(s,"event-1")[0].id);
 let summary;for(let i=0;i<7;i++)summary=submitStationRound(s,{stationId:board.id,matchId:match.id,expectedRound:i,aIn:1,aOn:0,bIn:0,bOn:0});
 assert.equal(summary.completed,true);assert.equal(summary.scoreA,21);assert.equal(s.matches.find(x=>x.id===match.id).status,"Final");
 assert.equal(boardMatch(s,board.id),null);
 assert.equal(s.boardStations[0].lastMatchId,match.id);
 assert.throws(()=>submitStationRound(s,{stationId:board.id,matchId:match.id,expectedRound:7,aIn:1,aOn:0,bIn:0,bOn:0}),/no longer assigned/);
});
test("doubles rounds require named throwers and record their individual contributions",()=>{
 const s=initial(),board=add(s);
 // Isolate doubles tournament to avoid selecting a singles match first.
 s.events=s.events.filter(e=>e.id==="doubles");s.matches=s.matches.filter(m=>m.eventId==="doubles");
 const match=assignNextMatch(s,board.id);
 assert.throws(()=>submitStationRound(s,{stationId:board.id,matchId:match.id,expectedRound:0,aIn:1,aOn:1,bIn:1,bOn:1}),/Select the actual thrower/);
 const saved=submitStationRound(s,{stationId:board.id,matchId:match.id,expectedRound:0,aIn:1,aOn:1,bIn:1,bOn:1,throwerA:1,throwerB:2});
 assert.equal(saved.row.throwerA,1);assert.equal(saved.row.throwerB,2);
});
