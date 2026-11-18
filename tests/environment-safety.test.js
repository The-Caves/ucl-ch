import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("all local env credentials are ignored, examples are allowed",()=>{
 const lines=read(".gitignore").split(/\r?\n/);
 for(const required of [".env",".env.*","!.env.example"])assert(lines.includes(required),required);
});
test("environment template provides only empty browser-safe keys",()=>{
 const template=read(".env.example");
 assert.match(template,/^UCL_SUPABASE_URL=\s*$/m);
 assert.match(template,/^UCL_SUPABASE_PUBLISHABLE_KEY=\s*$/m);
 assert.doesNotMatch(template,/^(?:.*(?:SECRET|PASSWORD|TOKEN|SERVICE_ROLE|DATABASE_URL).*=)/im);
});
test("docs distinguish browser publishable keys from server credentials and staging",()=>{
 const doc=read("docs/ENVIRONMENT_AND_SECRETS.md");
 for(const phrase of ["new Supabase project","publishable","secret","staging","GitHub","localStorage"])
  assert(doc.includes(phrase),phrase);
 assert.match(doc,/adding `\.env` does \*\*not\*\* currently connect/);
});
