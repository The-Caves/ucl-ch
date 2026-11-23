import test from "node:test";
import assert from "node:assert/strict";
import {makeDoubleElimination} from "../src/engine.js";
import {addStation,assignNextMatch} from "../src/board-control.js";
import {renderBoardCommand,renderBoardTablet} from "../src/board-views.js";
const person=id=>Array.isArray(id)?id.join(" & "):"Player "+id;
function fixture(){return {eventGroups:[{id:"e",name:"Triangle Night"}],events:[{id:"t",name:"Singles Open",parentEventId:"e",ids:[1,2,3,4]}],matches:makeDoubleElimination([1,2,3,4],"t"),scorecards:[],boardStations:[]}}
test("director board center shows controls and ready match count",()=>{
 const s=fixture(),station=addStation(s,"e"),html=renderBoardCommand(s,"e",person);
 assert.match(html,/Board Command Center/);assert.match(html,/Assign Next/);assert.match(html,/Tablet Scoring/);
 assert.match(html,new RegExp(station.id));assert.match(html,/floorEventSelect/);
});
test("tablet allows per-round entry and shows assigned match & scores",()=>{
 const s=fixture(),station=addStation(s,"e");assignNextMatch(s,station.id);
 const html=renderBoardTablet(s,station.id,person);
 assert.match(html,/boardRoundForm/);assert.match(html,/Save Round 1/);assert.match(html,/Bags in hole/);assert.match(html,/Bags on board/);
 assert.match(html,/expectedRound/);assert.match(html,/Board Center/);
});
test("unassigned tablet shows an honest waiting state",()=>{
 const s=fixture(),station=addStation(s,"e"),html=renderBoardTablet(s,station.id,person);
 assert.match(html,/Board available/);assert.doesNotMatch(html,/boardRoundForm/);
});

test("board cards show real battery reports without fabricating missing tablet data",()=>{
 const state=fixture(),station=addStation(state,"e");
 const at=Date.now();
 const low=renderBoardCommand(state,"e",person,{[station.id]:{status:"available",percent:18,charging:false,at}});
 assert.match(low,/board-battery-low/);
 assert.match(low,/18%/);
 assert.match(low,/Low battery/);
 const unsupported=renderBoardCommand(state,"e",person,{[station.id]:{status:"unavailable",at}});
 assert.match(unsupported,/Battery unavailable/);
 const absent=renderBoardCommand(state,"e",person);
 assert.match(absent,/Tablet not checked in/);
 assert.doesNotMatch(absent,/100%/);
});
