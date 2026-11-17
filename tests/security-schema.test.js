import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync(new URL("../supabase/migrations/202611170001_account_foundation.sql",import.meta.url),"utf8");
const app=readFileSync(new URL("../src/app.js",import.meta.url),"utf8");

test("user profile references Supabase Auth and excludes passwords and email",()=>{
 assert.match(sql,/id uuid primary key references auth\.users\(id\) on delete cascade/);
 const profileSection=sql.split("create table if not exists public.profiles (")[1]?.split(");")[0];
 assert.ok(profileSection);
 assert.doesNotMatch(profileSection,/\bpassword\b|\bemail\b|\brole\b|\bsecret\b/i);
 assert.match(sql,/on_ucl_auth_user_created/);
});
test("auth, profiles, private admin and organization membership tables enforce RLS",()=>{
 for(const table of ["public.profiles","public.organizations","public.organization_memberships","app_private.platform_admins","app_private.authorization_audit"])
  assert.ok(sql.includes("alter table "+table+" enable row level security;"),"RLS missing "+table);
 assert.match(sql,/revoke all on schema app_private from public/);
 assert.match(sql,/revoke all on app_private\.platform_admins, app_private\.authorization_audit/);
});
test("only whitelisted profile fields can be updated by authenticated users",()=>{
 assert.match(sql,/grant update \(display_name, username, city, state, avatar_url, discoverable\)/);
 assert.match(sql,/users_update_only_own_profile/);
 assert.match(sql,/id = \(select auth\.uid\(\)\)/);
 assert.match(sql,/create policy "public_profiles_discoverable"/);
});
test("users cannot insert their own director or platform admin membership",()=>{
 assert.match(sql,/app_private.platform_admins/);
 assert.match(sql,/membership.*role|role in \('owner','director','scorekeeper'\)/s);
 assert.match(sql,/No client-side INSERT\/UPDATE\/DELETE policies/);
 assert.match(sql,/revoke all on public\.profiles, public\.organizations, public\.organization_memberships/);
 assert.match(sql,/only.*trusted|BOOTSTRAP ADMIN/i);
});
test("privileged definer functions have fixed search paths and access is scoped",()=>{
 for(const fn of ["public.is_platform_admin","public.is_org_member","public.is_org_manager"])
  assert.ok(sql.includes("function "+fn),"Missing function "+fn);
 assert.ok((sql.match(/security definer set search_path = ''/g)||[]).length>=4);
 assert.match(sql,/m\.status = 'active'/);
 assert.match(sql,/where a\.user_id = \(select auth\.uid\(\)\)/);
});
test("authorization audit is append-only for service_role grants",()=>{
 assert.match(sql,/grant select, insert on app_private\.authorization_audit to service_role/);
 assert.doesNotMatch(sql,/grant [^\n]*update[^\n]*authorization_audit to service_role/i);
});
test("legacy local login is deliberately not mistaken for production Auth",()=>{
 assert.match(app,/const accountKey="ucl-demo-users"/);
 assert.match(app,/Demo director mode is not secure authentication/);
 const readme=readFileSync(new URL("../README.md",import.meta.url),"utf8");
 assert.match(readme,/browser-local/i);
});
test("production account migration and procedures are documented in the repo",()=>{
 const doc=readFileSync(new URL("../docs/PRODUCTION_AUTH_SECURITY.md",import.meta.url),"utf8");
 assert.match(doc,/staging and production Supabase projects/);
 assert.match(doc,/app_private.platform_admins/);
 assert.match(doc,/NO-GO/);
});
