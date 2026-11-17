import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Director Tools includes correction page and audited submit path",()=>{
 const app=read("src/app.js");
 assert.match(app,/page==="directorcorrections"\?directorCorrectionsPage\(\)/);
 assert.match(app,/#directorCorrectionForm/);
 assert.match(read("src/director-correction-views.js"),/id="directorCorrectionForm"/);
 assert.match(app,/directorCorrectMatch\(state,cmd\)/);
 assert.match(app,/Open Match Corrections/);
 assert.match(app,/directorcorrect/);
});
test("both standalone and event board queues use the balanced scheduling policy",()=>{
 const engine=read("src/engine.js"),board=read("src/board-control.js");
 assert.match(engine,/scheduleCandidates\(numbered,scope\)/);
 assert.match(board,/scheduleCandidates\(state\.matches,childIds\)/);
});
test("GitHub Pages deploys all correction and scheduling modules",()=>{
 const flow=read(".github/workflows/pages.yml");
 for(const f of ["src/director-corrections.js","src/director-correction-views.js","src/scheduling-policy.js"])
  assert.ok(flow.includes(f),f+" not included in GitHub Pages build");
});
test("roadmap and director correction documentation remain discoverable",()=>{
 const readme=read("README.md");
 assert.match(readme,/PROJECT_ROADMAP.md/);
 assert.match(readme,/DIRECTOR_CORRECTIONS_AND_SCHEDULING.md/);
 const doc=read("docs/DIRECTOR_CORRECTIONS_AND_SCHEDULING.md");
 assert.match(doc,/supervised bracket rebuild/i);
 assert.match(doc,/64 or 128/);
});
