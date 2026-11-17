/**
 * Read-only smoke tests against a *staging* Supabase project after provisioning.
 * Deliberately no service_role / secret key, no fixture mutations, no token logs.
 * Do NOT connect this runner to production.
 *
 * Required GitHub Environment secrets: UCL_STAGING_URL,
 * UCL_STAGING_PUBLISHABLE_KEY, UCL_STAGING_PLAYER_EMAIL, UCL_STAGING_PLAYER_PASSWORD.
 * Optional director test: UCL_STAGING_DIRECTOR_EMAIL and _PASSWORD.
 */
import assert from "node:assert/strict";

const required = [
  "UCL_STAGING_URL",
  "UCL_STAGING_PROJECT_REF",
  "UCL_STAGING_PUBLISHABLE_KEY",
  "UCL_STAGING_PLAYER_EMAIL",
  "UCL_STAGING_PLAYER_PASSWORD",
];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  throw Error("Staging setup incomplete. Missing environment variables: " + missing.join(", "));
}
const base = new URL(process.env.UCL_STAGING_URL);
const ref = String(process.env.UCL_STAGING_PROJECT_REF);
if (!/^[a-z0-9]{8,64}$/.test(ref) || base.protocol !== "https:" || base.hostname !== ref + ".supabase.co" || base.pathname !== "/" || base.search || base.hash) {
  throw Error("Staging URL must be exactly https://<configured-staging-project-ref>.supabase.co/");
}
const apiKey = process.env.UCL_STAGING_PUBLISHABLE_KEY;
const log = (label) => process.stdout.write("PASS: " + label + "\n");
const endpoint = path => new URL(path, base).toString();
async function jsonRequest(path, {method="GET", bearer=null, body} = {}) {
  const response = await fetch(endpoint(path), {
    method,
    headers: {
      apikey: apiKey,
      ...(bearer ? {Authorization: "Bearer " + bearer} : {}),
      ...(body === undefined ? {} : {"Content-Type": "application/json"}),
    },
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    signal: AbortSignal.timeout(12000),
  });
  // No response bodies are written to Actions logs (may contain PII).
  let data = null;
  try { data = await response.json(); } catch {}
  return {status: response.status, ok: response.ok, data};
}
function success(response, label) {
  assert(response.ok, label + " responded HTTP " + response.status);
  return response.data;
}
async function logIn(email, password) {
  const response = await jsonRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: {email, password},
  });
  const data = success(response, "Staging password sign-in");
  assert(data?.access_token, "Staging credentials did not produce an access token");
  assert(data?.user?.id, "Staging token has no user ID");
  return {token: data.access_token, userId: data.user.id};
}
async function checkAccount(kind, email, password) {
  const {token, userId} = await logIn(email, password);
  log(kind + " can sign in to real Supabase Auth");

  const verified = success(await jsonRequest("/auth/v1/user", {bearer: token}),
    kind + " verified identity");
  assert.equal(verified.id, userId);
  log(kind + " auth token verified");

  const profile = success(await jsonRequest(
    "/rest/v1/profiles?select=id,display_name,discoverable&id=eq." +
    encodeURIComponent(userId), {bearer: token}), kind + " profile lookup");
  assert(Array.isArray(profile) && profile.length === 1 && profile[0].id === userId,
    "Own RLS profile was not visible");
  log(kind + " can read only own profile row through RLS");

  const access = success(await jsonRequest("/rest/v1/rpc/get_my_access", {
    method: "POST", bearer: token, body: {},
  }), kind + " access RPC");
  assert.equal(access.user_id, userId);
  assert.equal(typeof access.platform_admin, "boolean");
  assert(Array.isArray(access.organizations), "Membership array unavailable");
  assert.equal(access.platform_admin, false,
    "Dedicated staging test account must NOT be a platform admin");

  if (kind === "player") {
    assert(!access.organizations.some(m => ["owner", "director", "scorekeeper"].includes(m.role)),
      "Regular player unexpectedly has organization privileges");
  } else {
    assert(access.organizations.some(m =>
      ["owner", "director"].includes(m.role) && m.status === "active"),
      "Staging director has no active owner/director membership");
  }
  log(kind + " capabilities come from the server, not browser state");
}
async function checkAnonymous() {
  const publicData = success(await jsonRequest(
    "/rest/v1/profiles?select=id,discoverable&limit=20"),
    "Anonymous public profile query");
  assert(Array.isArray(publicData), "Profile directory did not return a list");
  assert(publicData.every(row => row.discoverable === true),
    "Anonymous user could view a hidden profile");
  log("Anonymous profile directory excludes non-discoverable users");

  const hiddenProfileId = process.env.UCL_STAGING_PRIVATE_PROFILE_ID;
  if (hiddenProfileId) {
    assert(/^[0-9a-fA-F-]{36}$/.test(hiddenProfileId), "Invalid private profile fixture ID");
    const hidden = success(await jsonRequest("/rest/v1/profiles?select=id&id=eq." + hiddenProfileId), "Anonymous hidden-profile lookup");
    assert(Array.isArray(hidden) && hidden.length === 0, "Anonymous users can read a private profile");
    log("Anonymous request cannot discover private profile fixture");
  }
  const privateOrgs = await jsonRequest("/rest/v1/organizations?select=id&limit=1");
  assert([401,403].includes(privateOrgs.status),
    "Anonymous clients may access organizations without authentication");
  log("Anonymous clients cannot read private organizations");
}

await checkAccount("player", process.env.UCL_STAGING_PLAYER_EMAIL,
  process.env.UCL_STAGING_PLAYER_PASSWORD);
const directorEmail = process.env.UCL_STAGING_DIRECTOR_EMAIL;
const directorPassword = process.env.UCL_STAGING_DIRECTOR_PASSWORD;
if (directorEmail || directorPassword) {
  assert(directorEmail && directorPassword,
    "Set both UCL_STAGING_DIRECTOR_EMAIL and UCL_STAGING_DIRECTOR_PASSWORD");
  await checkAccount("director", directorEmail, directorPassword);
} else {
  process.stdout.write("SKIP: director role smoke (staging director credentials not configured)\n");
}
await checkAnonymous();
process.stdout.write("PASS: staging Auth/RLS read-only smoke completed\n");
