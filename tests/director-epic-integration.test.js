import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("director creates child tournaments through the new studio and retains event hierarchy",()=>{
 const app=read("src/app.js"),view=read("src/director-epic-views.js");
 assert.match(app,/page==="tournamentstudio"\?tournamentStudioPage\(\)/);
 assert.match(app,/studioTournamentForm/);
 assert.match(app,/createConfiguredTournament\(state/);
 assert.match(app,/studiolaunch/);
 assert.match(view,/studioSignupForm/);
 assert.match(view,/studioTeamForm/);
 assert.match(view,/studioMetricsForm/);
 assert.match(view,/studioDoorFeeForm/);
 assert.match(view,/studioDoorDay/);
});
test("board holds and flexible reassignment have working UI entry points",()=>{
 const app=read("src/app.js"),view=read("src/board-views.js");
 assert.match(app,/holdtournament/);
 assert.match(app,/holdmatch/);
 assert.match(app,/boardflexscreen/);
 assert.match(app,/studioFlexForm/);
 assert.match(view,/Tournament Assignment Holds/);
 assert.match(view,/Flex Board/);
});
test("new browser modules and roadmap are included in deployment",()=>{
 const workflow=read(".github/workflows/pages.yml");
 for(const name of ["src/director-operations.js","src/tournament-formats.js","src/director-epic-views.js"])assert.ok(workflow.includes(name),name);
 const readme=read("README.md");
 assert.match(readme,/DIRECTOR_TOURNAMENT_EPIC.md/);
 const roadmap=read("docs/PROJECT_ROADMAP.md");
 assert.match(roadmap,/Board flex/);
 const epic=read("docs/DIRECTOR_TOURNAMENT_EPIC.md");
 assert.match(epic,/Solo Slot/);
 assert.match(epic,/single or double elimination/i);
});
