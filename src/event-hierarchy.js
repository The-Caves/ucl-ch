import {makeDoubleElimination} from "./engine.js";
import {includesPlayer} from "./player-statistics.js";

export const EVENT_HIERARCHY_VERSION=1;
export const TRIANGLE_EVENT_ID="ucl-triangle-showcase-event";
export function childTournaments(state,parentId){
 return state.events.filter(t=>t.parentEventId===parentId);
}
export function parentForTournament(state,tournamentId){
 const t=state.events.find(x=>x.id===tournamentId);
 return t?state.eventGroups?.find(e=>e.id===t.parentEventId)||null:null;
}
export function matchesForParent(state,parentId){
 const ids=new Set(childTournaments(state,parentId).map(t=>t.id));
 return state.matches.filter(m=>ids.has(m.eventId));
}
export function eventStatus(children){
 if(children.some(t=>["Active","Live"].includes(t.status)))return "Active";
 if(children.some(t=>t.status==="Upcoming"))return "Upcoming";
 return children.length&&children.every(t=>t.status==="Completed")?"Completed":"Upcoming";
}
export function playerEventSummaries(state,playerId){
 const groups=state.eventGroups||[];
 return groups.map(parent=>{
  const tournaments=childTournaments(state,parent.id).filter(t=>(t.ids||[]).some(team=>includesPlayer(team,playerId))||(t.registeredIds||[]).some(team=>includesPlayer(team,playerId))||state.matches.some(m=>m.eventId===t.id&&(includesPlayer(m.a,playerId)||includesPlayer(m.b,playerId))));
  if(!tournaments.length)return null;
  return {parent,tournaments,status:eventStatus(tournaments)};
 }).filter(Boolean);
}
export function initializeEventHierarchy(state){
 state.events??=[];state.matches??=[];state.scorecards??=[];state.eventGroups??=[];
 if(state.eventHierarchyVersion===EVENT_HIERARCHY_VERSION)return false;
 // One documented three-bracket event offers a useful local spectator/organizer demonstration.
 if(state.events.some(t=>t.id==="ucl-singles-live")&&!state.events.some(t=>t.id==="demo-live-preview")){
  const preview={id:"demo-live-preview",name:"Venue Warm-Up Singles",venue:"Triangle Bag Co.",city:"Raleigh, NC",status:"Active",format:"Singles",ids:[1,2,3,4],fictional:true};
  const matches=makeDoubleElimination(preview.ids,preview.id);
  matches[0].status="In Progress";matches[0].court=3;
  state.events.push(preview);state.matches.push(...matches);
  state.scorecards.push({matchId:matches[0].id,a:1,b:2,aIn:2,aOn:1,bIn:1,bOn:2});
 }
 const ids=["ucl-singles-live","demo-live-preview"];
 if(ids.every(id=>state.events.some(t=>t.id===id))&&!state.events.some(t=>t.id==="ucl-triangle-doubles")){
  const tournament={id:"ucl-triangle-doubles",name:"Triangle Evening Doubles",venue:"Triangle Bag Co.",city:"Raleigh, NC",status:"Active",format:"Doubles",ids:[[1,3],[2,4],[5,6],[7,8]],fictional:true};
  const bracket=makeDoubleElimination(tournament.ids,tournament.id);
  const first=bracket[0];first.status="In Progress";first.court=7;
  state.events.push(tournament);state.matches.push(...bracket);
  state.scorecards.push({matchId:first.id,a:first.a,b:first.b,aIn:2,aOn:1,bIn:1,bOn:2,throwerA:1,throwerB:2});
 }
 const demoIds=["ucl-singles-live","demo-live-preview","ucl-triangle-doubles"];
 const combined=state.events.filter(t=>demoIds.includes(t.id));
 if(combined.length>=2){
  const parent={id:TRIANGLE_EVENT_ID,name:"Triangle Cornhole Night",venue:"Triangle Bag Co.",city:"Raleigh, NC",date:"2026-11-17",director:"UCL Demo Director",fictional:true};
  if(!state.eventGroups.some(e=>e.id===parent.id))state.eventGroups.push(parent);
  for(const t of combined){t.parentEventId=parent.id;if(t.id==="demo-live-preview")t.venue="Triangle Bag Co."}
 }
 for(const t of state.events){
  if(t.parentEventId&&state.eventGroups.some(g=>g.id===t.parentEventId))continue;
  const id="hub-event-"+t.id;
  if(!state.eventGroups.some(g=>g.id===id))state.eventGroups.push({id,name:t.name,venue:t.venue,city:t.city,date:t.date||null,director:"UCL Demo Director",fictional:!!t.fictional});
  t.parentEventId=id;
 }
 state.eventHierarchyVersion=EVENT_HIERARCHY_VERSION;
 return true;
}
export function createDirectorEvent(state,{name,venue,city,date}){
 if(!name?.trim()||!venue?.trim()||!city?.trim())throw Error("Event name, venue and location are required");
 const id="local-parent-"+String(Date.now())+"-"+state.eventGroups.length;
 const parent={id,name:name.trim(),venue:venue.trim(),city:city.trim(),date:date||null,director:"Demo Director",fictional:true};
 state.eventGroups.push(parent);return parent;
}
export function addDirectorTournament(state,{parentId,name,format="Singles",size=8}){
 const parent=state.eventGroups.find(e=>e.id===parentId);
 if(!parent)throw Error("Choose an existing event");
 if(!name?.trim())throw Error("Tournament name is required");
 if(!["Singles","Doubles"].includes(format))throw Error("Unsupported tournament format");
 size=Number(size);if(![4,8].includes(size)||format==="Doubles"&&size!==4)throw Error("Select four doubles teams or four/eight singles players");
 const id="local-bracket-"+Date.now()+"-"+state.events.length;
 const ids=format==="Doubles"?[[1,2],[3,4],[5,6],[7,8]]:Array.from({length:size},(_,i)=>i+1);
 const t={id,parentEventId:parent.id,name:name.trim(),venue:parent.venue,city:parent.city,date:parent.date,status:"Active",format,ids,fictional:true};
 state.events.push(t);state.matches.push(...makeDoubleElimination(ids,id));return t;
}
