import test from "node:test";
import assert from "node:assert/strict";
import {BOARD_BATTERY_KEY,BATTERY_STALE_MS,batterySummary,readBoardBattery,startBoardBatteryReporter} from "../src/board-battery.js";

function fakeStore(){
 const data=new Map();
 return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),data};
}
const later=()=>new Promise(resolve=>setImmediate(resolve));

test("director sees low/critical/charging battery, and stale/unsupported states separately",()=>{
 const at=1_700_000_000_000;
 assert.equal(batterySummary({status:"available",percent:9,at},at).status,"critical");
 assert.equal(batterySummary({status:"available",percent:18,at},at).status,"low");
 assert.equal(batterySummary({status:"available",percent:64,charging:true,at},at).label,"64% · Charging");
 assert.equal(batterySummary({status:"unavailable",at},at).status,"unavailable");
 assert.equal(batterySummary({status:"available",percent:18,at},at+BATTERY_STALE_MS+1).status,"stale");
 assert.equal(batterySummary(null,at).status,"unknown");
 assert.notEqual(batterySummary(null,at).label,"100%");
});
test("unsupported browsers report unavailable, never invent a battery percentage",()=>{
 const store=fakeStore(),now=()=>1_700_000_000_000;
 const stop=startBoardBatteryReporter({stationId:"board-1",storage:store,navigatorLike:{},now});
 assert.deepEqual(readBoardBattery(store)["board-1"],{status:"unavailable",percent:null,charging:null,at:now()});
 stop();
});
test("supported battery sends actual level/charging updates and stops listeners cleanly",async()=>{
 const store=fakeStore(),listeners=new Map();let ticks=null,cleared=null;
 const battery={level:.19,charging:false,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type)}};
 const stop=startBoardBatteryReporter({stationId:"board-3",storage:store,
  navigatorLike:{getBattery:async()=>battery},now:()=>1_700_000_000_000,
  setIntervalFn:fn=>{ticks=fn;return 31},clearIntervalFn:id=>{cleared=id}});
 await later();
 assert.equal(readBoardBattery(store)["board-3"].percent,19);
 battery.charging=true;battery.level=.22;listeners.get("levelchange")();
 assert.equal(batterySummary(readBoardBattery(store)["board-3"],1_700_000_000_000).label,"22% · Charging");
 battery.level=.5;ticks();
 assert.equal(readBoardBattery(store)["board-3"].percent,50);
 stop();assert.equal(listeners.size,0);assert.equal(cleared,31);
 battery.level=.01;ticks();
 assert.equal(readBoardBattery(store)["board-3"].percent,50);
});
test("battery permission denial and corrupted local cache never disrupt scoring",async()=>{
 const store=fakeStore();store.setItem(BOARD_BATTERY_KEY,"{corrupt");
 assert.deepEqual(readBoardBattery(store),{});
 startBoardBatteryReporter({stationId:"board-5",storage:store,navigatorLike:{getBattery:()=>Promise.reject(Error("denied"))},now:()=>1_700_000_000_000});
 await later();assert.equal(readBoardBattery(store)["board-5"].status,"unavailable");
});
