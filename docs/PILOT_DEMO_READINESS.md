# UCL Private Pilot and Organization Demo Readiness

Updated 2026-11-17. This is the immediate **next milestone** for the UCL Cornhole Hub. Treat the working GitHub Pages experience as a browser-local visual prototype until a shared staging database and authorized scoring API are connected.

## Key decision
**The database and its authenticated, transactional API together are the blocker**, not simply purchasing a Supabase account. The current repo already has a staged Supabase Auth/profile/organization migration and production account-service scaffold, but no hosted Supabase project, live event/match/round schema, protected scoring transactions, or real cross-device synchronization.

The product has two deliverables:
- **Clickable pitch**: current fictional browser-local prototype, useful for explaining features; must be labeled simulation and cannot claim separate devices sync. This can support an early discussion with the organization right now.
- **Credible private pilot**: two or more genuinely separate devices, real role-based sign-in, shared persisted event data, secure round save, immediate public spectator score and bracket refresh, and repeatable tests. This is our preferred next demo target.

## Priority implementation order

### Gate A — Staging environment and persistent data
- [ ] User provisions a **staging Supabase project** under a UCL-owned account. Keep production separate. No personal secrets or service-role keys in GitHub code.
- [ ] Review/apply the existing account migration, verify email delivery, and create dedicated staging player/director accounts. Bootstrap admin privileges only from a trusted operator context.
- [ ] Build the event database schema: organizations, events, child tournaments, signups, teams, player/partner mapping, brackets, matches, boards, round ledger and scoring audits. All identifiers persistent UUIDs; tenant keys and event keys explicit.
- [ ] Seed a **fictional demo organization** with independent events in two locations, singles, doubles, swap rounders, a few player accounts, at least six physical/virtual boards and an active scheduled match.
- [ ] Define safe, repeatable fixture reset; never erase actual user or tournament records while resetting a demonstration.

### Gate B — Trustworthy match scoring
- [ ] Implement trusted scoring endpoints with event/board scope, request idempotency, match version checks, validation, append-only round audit and atomic bracket progression.
- [ ] Director can assign a match to a board, save rounds from a separate tablet, correct an erroneous round, freeze/unfreeze and safely flex boards; other open clients see the committed result.
- [ ] Preserve current engine rules: 21-point cancellation scoring, round caps and tie overtime, doubles actual thrower PPR, Solo Slot, bracket catch-up rules and byes.
- [ ] Public spectator view reads a sanitized, published event-wide snapshot (all child brackets), searchable player-to-active-match mapping and final results. A viewer need not sign in.
- [ ] Display timestamps and delayed/offline states. Never display an unacknowledged local round as official.

### Gate C — Continuous testing (automation staged in repo)
- [x] Existing local Node unit and app-integration tests run on pull requests.
- [x] GitHub Actions workflow now available with manual trigger and **daily schedule** to run local regressions.
- [x] Opt-in **staging read-only smoke** for real Supabase player auth, identity, own profile, server-derived role and public/private profile RLS; no writes and no service-role key.
- [ ] Provision the staging Supabase project and protected GitHub Environment secrets, then enable the repo variable **UCL_STAGING_READY=true**. Until then the staging smoke is skipped, not passed.
- [ ] Add real SQL-based RLS integration tests for cross-organization denial, membership revocation, account discoverability, admin-only functions and the eventual event schema.
- [ ] Add **write-enabled staging fixture tests** only after transactional scoring is built, using isolated disposable event IDs and cleanup: exact-once concurrent round saves, stale match conflicts, automatic bracket advancement and correcting doubles attribution.
- [ ] Add Playwright multi-browser journeys: director laptop → tablet board → spectator mobile, with visibility of the same committed round.
- [ ] Load-test 500/2,000/5,000 distributed and 5,000 concentrated spectators separately before making nationwide capacity claims.

### Gate D — Organization-facing demo
A 10–15 minute guided demonstration should make these stories effortless:
1. **Public visitor** opens Today / Live, searches a player by name, finds their current event, board, matchup and score, and sees the shared event-wide live scoreboard.
2. **Director** signs in, creates/selects a hosted event with three child tournaments (singles, doubles, swap), registers a player, marks entry/door fee as manually tracked and assigns a ready match to Board 2.
3. **Board tablet** opens Board 2 from a second physical device, saves a round, and the spectator phone updates without a page reload where live subscriptions are supported.
4. **Player profile** shows newly credited bag PPR and recent match stats, without creating a fictitious bag for a manual forfeit.
5. **Director correction** records a reason and fixes an incorrect round or doubles thrower with a visible audit record. Demonstrate safe bracket advancement, board reassignment and a tournament freeze.
6. **Platform admin** can show organization-scoped director access, user account management and how UCL could support other host organizations. Keep permissions genuinely server-enforced.

Use fictional names, data and venues unless the organization authorizes their materials. Keep paid markers as manual indicators, and never suggest that funds were processed.

## Suggested acceptance matrix for a demo-ready private pilot

| Area | Minimum passing condition | State today |
| --- | --- | --- |
| Accounts | Real player/director sign-in; no client self-promotion | Migration scaffold only |
| Persistence | Separate browsers see same event and rounds after refresh | Not implemented |
| Board scoring | Round save exactly once, validates bag counts/thrower, advances safely | Browser-local only |
| Spectator access | Anonymous viewer sees confirmed live events and player scores | Browser-local only |
| Corrections | Authenticated director audit and cross-device consistency | Browser-local only |
| Recovery | Reload/reconnect resumes correct board and official score | Not implemented |
| Security | RLS tested against staging user and cross-tenant attempts | Schema/static tests only |
| Automated verification | Unit CI + read-only staging auth check once configured | Local CI ready; staging gated |
| Load | Venue pilot and 5k-viewer scenarios measured | Not tested |

A **private organization demo** is a shorter milestone than a commercial public launch. Security and no lost acknowledged scores are non-negotiable even for the private pilot, but comprehensive payment processing, native apps and nationwide capacity do not have to be finished first.

## Automated test runner configuration

Workflow: .github/workflows/pilot-readiness.yml
Runner: scripts/staging-smoke.mjs
- Triggers: manual GitHub Actions launch, plus daily at 11:15 UTC (06:15 EST / 07:15 EDT).
- Local regressions run without Supabase credentials.
- Staging job runs only if repository **Actions variable** UCL_STAGING_READY is exactly true; staging-only secrets belong in a protected GitHub **Environment** named staging.
- Required staging environment secrets: UCL_STAGING_URL, UCL_STAGING_PROJECT_REF, UCL_STAGING_PUBLISHABLE_KEY, UCL_STAGING_PLAYER_EMAIL, UCL_STAGING_PLAYER_PASSWORD.
- Optional staging environment secrets: UCL_STAGING_DIRECTOR_EMAIL and UCL_STAGING_DIRECTOR_PASSWORD (must be set together); UCL_STAGING_PRIVATE_PROFILE_ID (other, hidden fixture).
- Staging runner enforces an HTTPS URL whose hostname equals the explicitly configured staging project reference. Use a *dedicated test user*, never a real player's account.
- The runner is **read-only**: sign-in requests do issue Auth tokens, but it does not mutate players, events or scoring data. No administrator or service-role credentials required. Failures surface in GitHub Actions for review; no autonomous changes to the database.
- For a real "test agent" that exercises scoring, add a disposable fixture organization and a second **write-enabled** suite with precise server-side cleanup and privileged approval. Do not run destructive fixtures on production.
- Turn on staging only after the account migration and fixture identities are truly set up; if not, the staging job will be skipped or visibly fail rather than claiming the database passed.

### How to run
In GitHub: **Actions → UCL Pilot Readiness Checks → Run workflow**. For automatically scheduled runs, keep the workflow merged into main and GitHub Actions enabled. GitHub can notify subscribed maintainers of failed workflows. The runner cannot proactively fix application errors; it provides deterministic evidence for development.

## Roadmap after the private demo
A) Complete release-grade admin/role access and privacy controls; B) audit/protection of entry and door payments, partner substitutions, disputes and final bracket corrections; C) hosting move to Cloudflare and optimized public spectator API; D) monitored public pilots; E) capacity benchmarking for nationwide 5,000+ spectator traffic.

Related: [Production Accounts & Security](PRODUCTION_AUTH_SECURITY.md), [Spectator-first Architecture](SPECTATOR_SCALING_ARCHITECTURE.md), [Live Scoring Architecture](LIVE_SCORING_ARCHITECTURE.md).
