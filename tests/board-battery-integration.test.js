import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("tablet opens a battery observer only while displaying a board",()=>{
 const app=read("src/app.js");
 assert.match(app,/startBoardBatteryReporter\(/);
 assert.match(app,/page!=="boardtablet"&&batteryReporterStop/);
 assert.match(app,/renderBoardCommand\(state,id,person,readBoardBattery\(localStorage\)\)/);
 assert.match(app,/if\(e\.key===BOARD_BATTERY_KEY\)/);
});
test("GitHub Pages copies the optional device monitoring module",()=>{
 const flow=read(".github/workflows/pages.yml");
 assert.match(flow,/src\/board-battery\.js/);
 const index=read("index.html");
 assert.match(index,/20261123a/);
});
test("device health design explains iPad Safari limitation and backend security",()=>{
 const doc=read("docs/BOARD_DEVICE_HEALTH.md");
 assert.match(doc,/Safari/i);
 assert.match(doc,/(Android Chrome|Chrome on Android)/i);
 assert.match(doc,/server/i);
 assert.match(doc,/battery percentage/i);
 assert.match(doc,/no (?:push )?alerts/i);
 assert.match(doc,/stale/i);
});
