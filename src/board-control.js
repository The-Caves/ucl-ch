import {numberedMatches,recordResult} from "./engine.js";
import {roundPoints,scorecard} from "./scorecard.js";
import {includesPlayer} from "./player-statistics.js";
import {childTournaments} from "./event-hierarchy.js";
import {scheduleCandidates} from "./scheduling-policy.js";

// Browser-local simulation only. The production backend must own these mutations.
export const BOARD_FLOOR_VERSION=1;
export function boardStations(state,parentId){return (state.boardStations||[]).filter(s=>s.parentEventId===parentId).sort((a,b)=>a.number-b.number)}
export function boardForMatch(state,matchId){return (state.boardStations||[]).find(s=>s.matchId===matchId)||null}
export function boardMatch(state,stationId){const s=(state.boardStations||[]).find(b=>b.id===stationId);return s&&s.matchId?state.matches.find(m=>m.id===s.matchId)||null:null}
export function initializeBoardFloor(state){
 state.boardStations??=[];
 if(state.boardFloorVersion===BOARD_FLOOR_VERSION)return false;
 const triangle=state.eventGroups?.find(g=>g.id==="ucl-triangle-showcase-event");
 if(triangle){
  const group=new Set(childTournaments(state,triangle.id).map(t=>t.id));
  for(let number=1;number<=8;number++){
   const id="station-"+triangle.id+"-"+number;
   const current=state.boardStations.find(s=>s.id===id);
   if(current)continue;
   const match=state.matches.find(m=>group.has(m.eventId)&&m.status==="In Progress"&&Number(m.court)===number);
   state.boardStations.push({id,parentEventId:triangle.id,number,label:"Board "+number,matchId:match?.id||null,lastMatchId:null,version:0,active:true});
  }
 }
 state.boardFloorVersion=BOARD_FLOOR_VERSION;
 return true;
}
export function addStation(state,parentId){
 if(!state.eventGroups?.some(g=>g.id===parentId))throw Error("Choose an existing event");
 state.boardStations??=[];
 const stations=boardStations(state,parentId);
 if(stations.length>=128)throw Error("Maximum 128 boards per event");
 const number=Array.from({length:128},(_,i)=>i+1).find(n=>!stations.some(s=>s.number===n));
 const station={id:"board-"+parentId+"-"+number,parentEventId:parentId,number,label:"Board "+number,matchId:null,lastMatchId:null,version:0,active:true};
 state.boardStations.push(station);return station;
}
const sameId=(a,b)=>String(a)===String(b);
const playersOnTeam=team=>Array.isArray(team)?team.map(String):team==null?[]:[String(team)];
export function availableMatches(state,parentId){
 const childIds=new Set(childTournaments(state,parentId).map(t=>t.id));
 // Evaluate against ALL active matches: players can participate in multiple child brackets.
 return scheduleCandidates(state.matches,childIds).ready;
}
export function assignMatchToBoard(state,stationId,matchId){
 const station=state.boardStations?.find(s=>s.id===stationId);
 if(!station||station.active===false)throw Error("Board is unavailable");
 if(station.matchId)throw Error("Finish or release the current match first");
 const eligible=availableMatches(state,station.parentEventId).find(m=>m.id===matchId);
 if(!eligible)throw Error("Match is not ready, or a player is already in an active match");
 if(boardForMatch(state,matchId))throw Error("Match is already assigned to another board");
 const match=state.matches.find(m=>m.id===matchId);
 match.status="In Progress";match.court=station.number;
 station.matchId=match.id;station.version=(station.version||0)+1;return match;
}
export function assignNextMatch(state,stationId){
 const station=state.boardStations?.find(s=>s.id===stationId);
 if(!station)throw Error("Board not found");
 const next=availableMatches(state,station.parentEventId)[0];
 if(!next)throw Error("No ready matches are available");
 return assignMatchToBoard(state,stationId,next.id);
}
export function releaseBoard(state,stationId){
 const station=state.boardStations?.find(s=>s.id===stationId);
 if(!station)throw Error("Board not found");
 if(station.matchId){
  const match=state.matches.find(m=>m.id===station.matchId);
  const rounds=state.scorecards.filter(r=>r.matchId===station.matchId);
  if(match&&match.status==="In Progress"&&rounds.length>0)throw Error("Cannot release a match after scoring starts; director correction required");
  if(match&&match.status==="In Progress"){match.status="Scheduled";match.court=null}
 }
 station.matchId=null;station.version=(station.version||0)+1;
}
export function submitStationRound(state,{stationId,matchId,expectedRound,aIn,aOn,bIn,bOn,throwerA=null,throwerB=null}){
 const station=state.boardStations?.find(s=>s.id===stationId);
 if(!station||!sameId(station.matchId,matchId))throw Error("This board is no longer assigned to that match");
 const match=state.matches.find(m=>m.id===matchId);
 if(!match||match.status!=="In Progress")throw Error("Match is not in progress");
 const rows=state.scorecards.filter(r=>r.matchId===matchId);
 if(!Number.isInteger(Number(expectedRound))||Number(expectedRound)!==rows.length)throw Error("Round changed on another device. Reload the scoreboard before submitting");
 roundPoints(aIn,aOn);roundPoints(bIn,bOn);
 const doubles=Array.isArray(match.a)||Array.isArray(match.b);
 if(doubles&&(!includesPlayer(match.a,throwerA)||!includesPlayer(match.b,throwerB)))throw Error("Select the actual thrower from each doubles team");
 const row={id:matchId+"-boardround-"+(rows.length+1),matchId,a:match.a,b:match.b,
   aIn:Number(aIn),aOn:Number(aOn),bIn:Number(bIn),bOn:Number(bOn),
   ...(doubles?{throwerA:Number(throwerA),throwerB:Number(throwerB)}:{}),roundIndex:rows.length+1,timestamp:new Date().toISOString(),source:"board-demo"};
 const summary=scorecard([...rows,row],match.a,match.b);
 if(rows.length&&scorecard(rows,match.a,match.b).finished)throw Error("Match has already finished");
 state.scorecards.push(row);
 let completed=false;
 if(summary.finished){
  state.matches=recordResult(state.matches,match.id,summary.scoreA,summary.scoreB);
  station.lastMatchId=match.id;station.matchId=null;completed=true;
 }
 station.version=(station.version||0)+1;
 return {row,scoreA:summary.scoreA,scoreB:summary.scoreB,rounds:summary.rounds,completed,statsA:summary.statsA,statsB:summary.statsB};
}
