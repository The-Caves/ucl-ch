import test from "node:test";
import assert from "node:assert/strict";
import {renderTournamentStudio,renderBoardFlex} from "../src/director-epic-views.js";
import {createConfiguredTournament,addSignup,setEventDoorFee} from "../src/tournament-formats.js";
import {makeDoubleElimination} from "../src/engine.js";
import {addStation} from "../src/board-control.js";
const roster=[1,2,3,4,5].map(id=>({id,name:"Player "+id,city:"Raleigh"}));
const s=()=>({director:true,eventGroups:[{id:"parent",name:"Raleigh Night",date:"2026-11-17",venue:"Hall"}],events:[],matches:[],scorecards:[],boardStations:[]});
test("tournament studio supports format, seeding, rounders, payment and registration controls",()=>{
 const state=s(),t=createConfiguredTournament(state,{parentId:"parent",name:"Open Swap",format:"swap-doubles",rounders:4});
 addSignup(state,t.id,1,roster);setEventDoorFee(state,"parent",{amount:5,scope:"day"});
 const html=renderTournamentStudio(state,{parentId:"parent",tournamentId:t.id,roster,doorDate:"2026-11-18"});
 for(const id of ["studioTournamentForm","studioDoorFeeForm","studioDoorDay","studioSignupForm","studioMetricsForm","studioTournamentSelect"])assert.match(html,new RegExp(id));
 assert.match(html,/Swap Rounders/);assert.match(html,/entrypaid:/);assert.match(html,/doorpaid:/);
 assert.match(html,/Player 1 #1/);assert.match(html,/Open Swap/);
});
test("fixed-team studio requires roster assignments before launch",()=>{
 const state=s(),t=createConfiguredTournament(state,{parentId:"parent",name:"Fixed",format:"fixed-doubles"});
 addSignup(state,t.id,1,roster);addSignup(state,t.id,2,roster);
 const html=renderTournamentStudio(state,{parentId:"parent",tournamentId:t.id,roster});
 assert.match(html,/studioTeamForm/);assert.match(html,/Add Team/);
});
test("board flex lists eligible matches from child tournament with explicit warning",()=>{
 const state=s();const t={id:"child",parentEventId:"parent",name:"Singles",ids:[1,2,3,4],status:"Active"};
 state.events.push(t);state.matches.push(...makeDoubleElimination([1,2,3,4],t.id));
 const board=addStation(state,"parent");const html=renderBoardFlex(state,{stationId:board.id,person:id=>"Player "+id});
 assert.match(html,/Reassign Board 1/);assert.match(html,/studioFlexForm/);assert.match(html,/Singles/);assert.match(html,/Move the running game/);
});
