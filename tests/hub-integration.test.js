import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("dashboard links to the dedicated Players area rather than embedding CSR rankings",()=>{
 const app=src("src/app.js");
 assert.match(app,/myTournamentRows\(\)\+playersDashboardPortal\(\)/);
 assert.match(app,/page==="players"\?playersDashboard\(\)/);
 assert.match(app,/state\.playerFollows\[accountId\]/);
});
test("parent event scores are reachable from any tournament bracket",()=>{
 const app=src("src/app.js");
 assert.match(app,/parentForTournament\(state,e\.id\)/);
 assert.match(app,/All Event Scores/);
 assert.match(app,/action==="tournamenttab"\)\{if\(value==="scores"\)/);
 assert.match(app,/page==="eventgroup"\?eventGroupPage\(\)/);
});
test("bracket has dedicated full viewport canvas and preserved scroll controls",()=>{
 const css=src("src/styles.css");
 assert.match(css,/body\.bracket-mode \.wrap/);
 assert.match(css,/body\.bracket-mode \.bracketcanvas/);
 assert.match(css,/overflow:auto!important/);
 const app=src("src/app.js");
 assert.match(app,/document\.body\.classList\.toggle\("bracket-mode"/);
 assert.match(app,/id="bracketViewport"/);
 assert.match(app,/id="bracketZoomSlider"/);
});
test("Pages workflow includes every new imported browser module",()=>{
 const flow=src(".github/workflows/pages.yml");
 for(const path of ["src/event-hierarchy.js","src/hub-views.js"])assert.ok(flow.includes(path),path+" must deploy");
});
