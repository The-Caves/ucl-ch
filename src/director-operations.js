import {boardStations,boardForMatch,releaseBoard,assignMatchToBoard,availableMatches} from "./board-control.js";
import {childTournaments} from "./event-hierarchy.js";

// Director operations for the browser-local demo. Production must authenticate + transact.
function audit(state,type,details,actor="Demo Director"){
 state.operationsAudit??=[];
 state.operationsAudit.push({id:"ops-"+(state.operationsAudit.length+1),type,actor,at:new Date().toISOString(),...details});
}
function guard(state){if(state.director!==true)throw Error("Director demo access is required")}
export function toggleTournamentHold(state,tournamentId,actor){
 guard(state);
 const t=state.events.find(x=>x.id===tournamentId);if(!t)throw Error("Tournament not found");
 t.frozen=!t.frozen;audit(state,"tournament-hold",{tournamentId,frozen:t.frozen},actor);return t.frozen;
}
export function toggleMatchHold(state,matchId,actor){
 guard(state);const m=state.matches.find(x=>x.id===matchId);if(!m)throw Error("Match not found");
 m.frozen=!m.frozen;audit(state,"match-hold",{matchId,frozen:m.frozen},actor);return m.frozen;
}
export function flexBoard(state,{stationId,matchId,actor}){
 guard(state);
 const station=state.boardStations?.find(x=>x.id===stationId);
 if(!station||station.active===false)throw Error("Board unavailable");
 const target=state.matches.find(x=>x.id===matchId);
 if(!target)throw Error("Target match not found");
 const tournament=state.events.find(x=>x.id===target.eventId);
 if(!tournament||tournament.parentEventId!==station.parentEventId)throw Error("Match must belong to the same hosted event");
 if(tournament.frozen||target.frozen)throw Error("Match or tournament is frozen");
 const from=boardForMatch(state,target.id);
 if(from?.id===station.id)return target;
 const stationOccupied=Boolean(station.matchId);
 if(stationOccupied&&state.scorecards.some(r=>r.matchId===station.matchId))throw Error("Current board has saved rounds. Move its running match to a free board first");
 if(from&&target.status!=="In Progress")throw Error("Transferred match must be in progress");
 // Check readiness BEFORE releasing any assignment, ensuring failure has no side effects.
 if(!from&&!availableMatches(state,station.parentEventId).some(x=>x.id===target.id))throw Error("Target match is not ready");
 if(stationOccupied)releaseBoard(state,station.id);
 if(from){
  from.matchId=null;from.version=(from.version||0)+1;
  station.matchId=target.id;station.version=(station.version||0)+1;
  target.court=station.number;
  audit(state,"board-transfer",{matchId:target.id,fromBoard:from.id,toBoard:station.id},actor);
  return target;
 }
 const assigned=assignMatchToBoard(state,station.id,target.id);
 audit(state,"board-flex",{fromMatch:station.lastMatchId||null,toMatch:target.id,board:station.id},actor);
 return assigned;
}
export function freeBoards(state,parentId){return boardStations(state,parentId).filter(b=>!b.matchId)}
export function transferOptions(state,parentId){
 const tournaments=new Set(childTournaments(state,parentId).map(t=>t.id));
 const ready=availableMatches(state,parentId);
 const assigned=state.matches.filter(m=>tournaments.has(m.eventId)&&m.status==="In Progress"&&!m.frozen&&!state.events.find(t=>t.id===m.eventId)?.frozen);
 return [...ready,...assigned.filter(m=>!ready.some(r=>r.id===m.id))];
}
