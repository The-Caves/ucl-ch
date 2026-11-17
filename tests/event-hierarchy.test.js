import test from "node:test";
import assert from "node:assert/strict";
import {initializeEventHierarchy,childTournaments,parentForTournament,matchesForParent,eventStatus,playerEventSummaries,createDirectorEvent,addDirectorTournament,TRIANGLE_EVENT_ID} from "../src/event-hierarchy.js";
import {makeDoubleElimination} from "../src/engine.js";
function fixture(){const events=[
 {id:"ucl-singles-live",name:"Singles",city:"Raleigh, NC",venue:"Triangle Bag Co.",status:"Active",ids:[1,2,3,4]},
 {id:"demo-live-preview",name:"Preview",city:"Raleigh, NC",venue:"Board",status:"Live",ids:[1,2]},
 {id:"old-completed",name:"Done",city:"Charlotte, NC",venue:"Hall",status:"Completed",ids:[1,2,3,4]}
 ];return {events,matches:makeDoubleElimination([1,2,3,4],"ucl-singles-live"),scorecards:[],eventGroups:[]}}
test("migration creates parent event with three child brackets without rewriting existing results",()=>{
 const state=fixture(),before=JSON.stringify(state.matches);
 assert.equal(initializeEventHierarchy(state),true);
 const children=childTournaments(state,TRIANGLE_EVENT_ID);
 assert.equal(children.length,3);
 assert.equal(JSON.stringify(state.matches.filter(x=>x.eventId==="ucl-singles-live")),before);
 assert.equal(parentForTournament(state,"ucl-triangle-doubles").id,TRIANGLE_EVENT_ID);
 assert.ok(matchesForParent(state,TRIANGLE_EVENT_ID).some(m=>m.eventId==="ucl-triangle-doubles"));
 assert.equal(eventStatus(children),"Active");
 const count=state.matches.length,n=state.eventGroups.length;
 assert.equal(initializeEventHierarchy(state),false);
 assert.equal(state.matches.length,count);assert.equal(state.eventGroups.length,n);
});
test("migration protects legacy competitions when multi-bracket sample is not present",()=>{
 const state={events:[{id:"legacy",name:"Legacy Tournament",city:"Cary, NC",venue:"Hall",status:"Completed",ids:[1,2]}],matches:[],scorecards:[]};
 initializeEventHierarchy(state);
 assert.equal(state.eventGroups.length,1);
 assert.equal(state.events[0].parentEventId,state.eventGroups[0].id);
 assert.equal(childTournaments(state,state.eventGroups[0].id).length,1);
});
test("director can create event with multiple separately routed brackets",()=>{
 const state=fixture();initializeEventHierarchy(state);
 const parent=createDirectorEvent(state,{name:"Saturday Open",venue:"Hall",city:"Raleigh, NC"});
 const singles=addDirectorTournament(state,{parentId:parent.id,name:"Advanced Singles",format:"Singles",size:4});
 const doubles=addDirectorTournament(state,{parentId:parent.id,name:"Advanced Doubles",format:"Doubles",size:4});
 assert.equal(childTournaments(state,parent.id).length,2);
 assert.ok(state.matches.some(m=>m.eventId===singles.id));
 assert.ok(state.matches.some(m=>m.eventId===doubles.id));
 assert.equal(matchesForParent(state,parent.id).length,14);
 assert.equal(eventStatus(childTournaments(state,parent.id)),"Active");
});
test("player event summaries include all active child tournaments for player",()=>{
 const state=fixture();initializeEventHierarchy(state);
 const summaries=playerEventSummaries(state,1);
 const live=summaries.find(s=>s.parent.id===TRIANGLE_EVENT_ID);
 assert.ok(live);assert.equal(live.tournaments.length,3);
 assert.equal(summaries.some(s=>s.parent.name==="Done"),true);
});
