import {recordResult,winner,loser} from "./engine.js";
import {roundPoints,scorecard} from "./scorecard.js";
import {sameTeam,includesPlayer,teamKey} from "./player-statistics.js";

// A browser-local director prototype. The production API MUST verify director membership,
// perform optimistic version checks, and write audits/rounds in a single DB transaction.
const clone=value=>JSON.parse(JSON.stringify(value));
const teamIds=t=>Array.isArray(t)?t.map(String):t==null?[]:[String(t)];
const validScore=(a,b)=>Number.isInteger(a)&&Number.isInteger(b)&&((a===21&&b>=0&&b<21)||(b===21&&a>=0&&a<21));
const isStarted=m=>["In Progress","Final"].includes(m.status);
function descendants(matches,matchId){
 const result=[],seen=new Set(),queue=[matchId];
 for(let i=0;i<queue.length;i++){
  for(const m of matches){
   if(seen.has(m.id)||m.id===matchId)continue;
   if(m.sourceA?.id===queue[i]||m.sourceB?.id===queue[i]){seen.add(m.id);result.push(m);queue.push(m.id)}
  }
 }
 return result;
}
function ensureDownstreamClear(snapshot,matchId){
 const down=descendants(snapshot.matches,matchId);
 for(const m of down){
  if(isStarted(m)||snapshot.scorecards.some(row=>row.matchId===m.id))
   throw Error("Downstream match "+m.id+" already started or finished. Pause the bracket and use a supervised bracket rebuild.");
 }
 return down.map(x=>x.id);
}
function reconcileDescendants(snapshot,matchId){
 const dependent=descendants(snapshot.matches,matchId),byId=new Map(snapshot.matches.map(m=>[m.id,m]));
 for(const m of dependent){
  for(const side of ["A","B"]){
   const src=m["source"+side];if(!src)continue;
   const parent=byId.get(src.id);
   m[side.toLowerCase()]=parent?.status==="Final"?(src.outcome==="winner"?winner(parent):loser(parent)):null;
  }
  m.status="Scheduled";m.scoreA=0;m.scoreB=0;m.court=null;
  if(m.side==="F"&&m.round===2){
   const first=byId.get(m.sourceA?.id);
   if(first?.status==="Final"&&winner(first)===first.a){
    m.status="Not needed";m.a=null;m.b=null;
   }
  }
 }
 return dependent.map(x=>x.id);
}
function releaseStation(snapshot,matchId){
 const station=snapshot.boardStations.find(s=>s.matchId===matchId);
 if(station){station.lastMatchId=matchId;station.matchId=null;station.version=(station.version||0)+1}
}
function clearAssignedStation(snapshot,matchId){
 const station=snapshot.boardStations.find(s=>s.matchId===matchId);
 if(station){station.matchId=null;station.version=(station.version||0)+1}
}
function validateTeam(team,expectedShape,roster){
 if(expectedShape!==Array.isArray(team))throw Error("Match format and team shape do not match");
 if(!teamIds(team).length||teamIds(team).some(id=>!roster.has(id)))throw Error("Competitor is not registered in this tournament");
 if(teamIds(team).length!==new Set(teamIds(team)).size)throw Error("Duplicate competitor inside the same team");
}
function assertReason(actor,reason){
 if(!String(actor||"").trim())throw Error("Director identity is required");
 if(String(reason||"").trim().length<6)throw Error("Provide a reason of at least six characters for the audit");
}
function summaryForRounds(snapshot,match){
 const rows=snapshot.scorecards.filter(x=>x.matchId===match.id);
 return scorecard(rows,match.a,match.b,{maxRounds:Number(snapshot.events.find(t=>t.id===match.eventId)?.roundLimit||0)});
}
function applyResult(snapshot,match,{scoreA,scoreB,forfeit=false}){
 const a=Number(scoreA),b=Number(scoreB);
 const limit=Number(snapshot.events.find(t=>t.id===match.eventId)?.roundLimit||0);
 if(limit?!(Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<=21&&b<=21&&a!==b):!validScore(a,b))throw Error(limit?"Round-capped results require two valid non-tied scores":"Completed matches require a winner at 21 and loser below 21");
 if(match.a==null||match.b==null)throw Error("Both teams must be assigned before entering results");
 const oldWinner=match.status==="Final"?teamKey(winner(match)):null;
 const nextWinner=teamKey(a>b?match.a:match.b);
 const flipped=oldWinner!=null&&oldWinner!==nextWinner;
 if(flipped)ensureDownstreamClear(snapshot,match.id);
 // Manual adjudication supersedes old bag entries, preserving their before-image in the audit log.
 snapshot.scorecards=snapshot.scorecards.filter(r=>r.matchId!==match.id);
 if(match.status==="Final"){
  match.scoreA=a;match.scoreB=b;
  if(flipped)reconcileDescendants(snapshot,match.id);
 }else{
  snapshot.matches=recordResult(snapshot.matches,match.id,a,b);
  match=snapshot.matches.find(m=>m.id===match.id);
 }
 match.resultType=forfeit?"Forfeit":"Director entry";
 releaseStation(snapshot,match.id);
 return {nextStatus:match.status,affected:flipped?descendants(snapshot.matches,match.id).map(m=>m.id):[]};
}
function applyRound(snapshot,match,command){
 const existing=snapshot.scorecards.filter(r=>r.matchId===match.id);
 const index=Number(command.roundNumber)-1;
 if(!Number.isInteger(index)||index<0||index>=existing.length)throw Error("Choose an existing round");
 if(!["Final","In Progress"].includes(match.status))throw Error("Round corrections require an active or completed scored game");
 const old=existing[index],fields=["aIn","aOn","bIn","bOn"];
 const values=Object.fromEntries(fields.map(k=>[k,Number(command[k]??old[k])]));
 roundPoints(values.aIn,values.aOn);roundPoints(values.bIn,values.bOn);
 const doubles=Array.isArray(match.a)||Array.isArray(match.b);
 let throwerA=null,throwerB=null;
 if(doubles){
  throwerA=command.throwerA??old.throwerA;throwerB=command.throwerB??old.throwerB;
  if(!includesPlayer(match.a,throwerA)||!includesPlayer(match.b,throwerB))throw Error("Correct each doubles thrower to a participant on that team");
 }
 const row={...old,...values,...(doubles?{throwerA:Number(throwerA),throwerB:Number(throwerB)}:{})};
 const edited=existing.map((r,i)=>i===index?row:r);
 const sc=scorecard(edited,match.a,match.b,{maxRounds:Number(snapshot.events.find(t=>t.id===match.eventId)?.roundLimit||0)});
 if(sc.history.length!==edited.length)throw Error("This correction would finish the game before later recorded rounds. Reopen and reconcile the later rounds first");
 const wasFinal=match.status==="Final";
 if(wasFinal&&!sc.finished)throw Error("Corrected rounds no longer reach 21. Reopen the match to revise its full record");
 const oldWinner=wasFinal?teamKey(winner(match)):null;
 const nextWinner=sc.finished?teamKey(sc.scoreA>sc.scoreB?match.a:match.b):null;
 const flipped=wasFinal&&nextWinner!==oldWinner;
 if(flipped)ensureDownstreamClear(snapshot,match.id);
 snapshot.scorecards=snapshot.scorecards.map(r=>r===old?row:r);
 if(wasFinal){match.scoreA=sc.scoreA;match.scoreB=sc.scoreB;if(flipped)reconcileDescendants(snapshot,match.id)}
 else if(sc.finished){
  snapshot.matches=recordResult(snapshot.matches,match.id,sc.scoreA,sc.scoreB);
  releaseStation(snapshot,match.id);
 }else{match.scoreA=sc.scoreA;match.scoreB=sc.scoreB}
 const updated=snapshot.matches.find(m=>m.id===match.id);
 updated.resultType="Scored rounds";
 return {nextStatus:updated.status,rounds:edited.length,affected:flipped?descendants(snapshot.matches,match.id).map(m=>m.id):[]};
}
function applyMatchup(snapshot,match,command){
 if(match.status!=="Scheduled"||snapshot.scorecards.some(r=>r.matchId===match.id))
  throw Error("Correct matchups only before scoring. Reopen the match first if it was played");
 if(match.sourceA||match.sourceB)throw Error("This matchup is fed by earlier results; correct the originating match instead");
 ensureDownstreamClear(snapshot,match.id);
 const tournament=snapshot.events.find(t=>t.id===match.eventId);
 if(!tournament)throw Error("Tournament not found");
 const roster=new Set((tournament.ids||[]).flatMap(teamIds));
 const isDoubles=Array.isArray(tournament.ids?.[0]);
 const parse=raw=>isDoubles?String(raw).split(",").map(Number):Number(raw);
 const a=parse(command.teamA),b=parse(command.teamB);
 validateTeam(a,isDoubles,roster);validateTeam(b,isDoubles,roster);
 if(teamIds(a).some(id=>teamIds(b).includes(id)))throw Error("The same player cannot compete on both sides");
 if(isDoubles){
  const teams=new Set(tournament.ids.map(teamKey));
  if(!teams.has(teamKey(a))||!teams.has(teamKey(b)))throw Error("Choose teams registered in this doubles bracket");
 }
 const other= snapshot.matches.filter(m=>m.eventId===match.eventId&&m.side==="W"&&m.round===1&&m.id!==match.id);
 if(other.some(m=>[...teamIds(m.a),...teamIds(m.b)].some(id=>[...teamIds(a),...teamIds(b)].includes(id))))
  throw Error("A competitor is already assigned to another opening-round matchup");
 match.a=a;match.b=b;
 reconcileDescendants(snapshot,match.id);
 return {nextStatus:match.status,affected:descendants(snapshot.matches,match.id).map(x=>x.id)};
}
function applyReopen(snapshot,match){
 if(!["Final","In Progress"].includes(match.status))throw Error("Only started or completed matches may be reopened");
 ensureDownstreamClear(snapshot,match.id);
 snapshot.scorecards=snapshot.scorecards.filter(r=>r.matchId!==match.id);
 match.status="Scheduled";match.scoreA=0;match.scoreB=0;match.court=null;delete match.resultType;
 clearAssignedStation(snapshot,match.id);
 const affected=reconcileDescendants(snapshot,match.id);
 return {nextStatus:"Scheduled",affected};
}

function applySwap(snapshot,match,command){
 const other=snapshot.matches.find(m=>m.id===command.otherMatchId);
 if(!other||other.id===match.id||other.eventId!==match.eventId)throw Error("Choose a second match in the same tournament");
 for(const m of [match,other]){
  if(m.side!=="W"||m.round!==1||m.status!=="Scheduled"||m.sourceA||m.sourceB||snapshot.scorecards.some(r=>r.matchId===m.id))throw Error("Team swaps only apply to unplayed opening-round matches");
  if(snapshot.boardStations.some(st=>st.matchId===m.id))throw Error("Release the assigned board before swapping teams");
  ensureDownstreamClear(snapshot,m.id);
 }
 const s1=String(command.sideA||""),s2=String(command.sideB||"");
 if(!["A","B"].includes(s1)||!["A","B"].includes(s2))throw Error("Select a side on both matches");
 const k1=s1.toLowerCase(),k2=s2.toLowerCase();
 const team=clone(match[k1]);match[k1]=clone(other[k2]);other[k2]=team;
 const roster=new Set((snapshot.events.find(e=>e.id===match.eventId)?.ids||[]).flatMap(teamIds));
 const doubles=Array.isArray(snapshot.events.find(e=>e.id===match.eventId)?.ids?.[0]);
 for(const m of [match,other]){
  validateTeam(m.a,doubles,roster);validateTeam(m.b,doubles,roster);
  if(teamIds(m.a).some(id=>teamIds(m.b).includes(id)))throw Error("A player cannot be on both sides");
 }
 reconcileDescendants(snapshot,match.id);
 reconcileDescendants(snapshot,other.id);
 return {nextStatus:"Scheduled",affected:[other.id,...descendants(snapshot.matches,match.id).map(m=>m.id),...descendants(snapshot.matches,other.id).map(m=>m.id)]};
}

export function directorCorrectMatch(state,command){
 const {type,matchId,actor,reason}=command;
 assertReason(actor,reason);
 if(state.director!==true)throw Error("Enable demo director access before making corrections");
 if(!["result","forfeit","round","matchup","swap","reopen"].includes(type))throw Error("Unknown correction operation");
 const draft={matches:clone(state.matches),scorecards:clone(state.scorecards||[]),boardStations:clone(state.boardStations||[]),events:state.events||[]};
 let match=draft.matches.find(m=>m.id===matchId);
 if(!match)throw Error("Match not found");
 const snapshotMatches=clone(draft.matches);
 const before={match:clone(match),rounds:clone(draft.scorecards.filter(r=>r.matchId===match.id)),station:clone(draft.boardStations.find(s=>s.matchId===match.id)||null)};
 let result;
 if(type==="result"||type==="forfeit"){
  if(type==="forfeit"){
   const side=String(command.winnerSide);
   if(!["A","B"].includes(side))throw Error("Select the forfeit winner");
   result=applyResult(draft,match,{scoreA:side==="A"?21:0,scoreB:side==="B"?21:0,forfeit:true});
  }else result=applyResult(draft,match,command);
 }else if(type==="round")result=applyRound(draft,match,command);
 else if(type==="matchup")result=applyMatchup(draft,match,command);
 else if(type==="swap")result=applySwap(draft,match,command);
 else result=applyReopen(draft,match);
 match=draft.matches.find(m=>m.id===matchId);
 const after={match:clone(match),rounds:clone(draft.scorecards.filter(r=>r.matchId===matchId)),station:clone(draft.boardStations.find(s=>s.matchId===matchId)||null)};
 const changedMatches=draft.matches.filter((m,i)=>JSON.stringify(m)!==JSON.stringify(snapshotMatches[i]));
 const changes=changedMatches.map(m=>({id:m.id,before:snapshotMatches.find(x=>x.id===m.id),after:clone(m)}));
 state.matches=draft.matches;state.scorecards=draft.scorecards;state.boardStations=draft.boardStations;
 state.directorAudit??=[];
 const entry={id:"director-audit-"+(state.directorAudit.length+1),matchId,action:type,actor:String(actor),reason:String(reason).trim(),timestamp:new Date().toISOString(),before,after,changes,affected:result.affected||[]};
 state.directorAudit.push(entry);
 return {...result,audit:entry};
}
export function directorAuditFor(state,matchId){return (state.directorAudit||[]).filter(entry=>entry.matchId===matchId).slice().reverse()}
