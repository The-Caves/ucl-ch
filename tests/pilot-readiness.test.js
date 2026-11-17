import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("pilot readiness workflow has deterministic regression tests and a manual run",()=>{
 const y=load(".github/workflows/pilot-readiness.yml");
 assert.match(y,/workflow_dispatch:/);
 assert.match(y,/schedule:/);
 assert.match(y,/Run unit tests|Existing unit and integration tests/);
 assert.match(y,/node --check scripts\/staging-smoke\.mjs/);
 assert.match(y,/run: npm test/);
});
test("live staging checks are gated by opt-in and protected environment",()=>{
 const y=load(".github/workflows/pilot-readiness.yml");
 assert.match(y,/vars\.UCL_STAGING_READY == 'true'/);
 assert.match(y,/environment: staging/);
 assert.match(y,/UCL_STAGING_PROJECT_REF: \$\{\{ secrets\.UCL_STAGING_PROJECT_REF \}\}/);
 assert.match(y,/UCL_STAGING_PLAYER_PASSWORD: \$\{\{ secrets\.UCL_STAGING_PLAYER_PASSWORD \}\}/);
 assert.doesNotMatch(y,/SERVICE_ROLE|SUPABASE_SECRET_KEY|prod_password/i);
});
test("staging smoke is read-only and requires project identity",()=>{
 const src=load("scripts/staging-smoke.mjs");
 assert.match(src,/base\.hostname !== ref \+ "\.supabase\.co"/);
 assert.match(src,/UCL_STAGING_PROJECT_REF/);
 assert.match(src,/get_my_access/);
 assert.match(src,/\/auth\/v1\/token\?grant_type=password/);
 assert.match(src,/Anonymous clients cannot read private organizations/);
 assert.doesNotMatch(src,/process\.env\.(?:SUPABASE_SERVICE_ROLE_KEY|UCL_PRODUCTION_[A-Z_]+)/);
 assert.doesNotMatch(src,/\/rest\/v1\/matches.*method:\s*"POST"/s);
});
test("organization demo plan does not confuse local prototype with production",()=>{
 const doc=load("docs/PILOT_DEMO_READINESS.md");
 assert.match(doc,/browser-local visual prototype/);
 assert.match(doc,/trusted scoring endpoints/);
 assert.match(doc,/500.*2,000.*5,000/s);
 assert.match(doc,/10–15 minute/);
 assert.match(doc,/UCL_STAGING_READY=true/);
});
