# UCL Cornhole Hub — Project Roadmap

Updated 2026-11-17. Keep this file aligned with each feature PR and its tests.

## Completed in browser-local prototype
- [x] Multi-tournament parent events, standings, results, bracket tabs and combined venue scoreboard
- [x] Player profiles, CSR leaderboard, singles/doubles statistics and local player follows
- [x] Director demo event creation and child tournament creation
- [x] Event-level board floor, simulated tablet scoring, rounds, cancellation scoring, automatic progression and PPR
- [x] Director result corrections, manual game/forfeit entry, edited rounds/doubles thrower attribution, matchup swaps, audit snapshots
- [x] Safe dependency-aware correction rule: disallow undoing an upstream result once dependent matches have started
- [x] Balanced upper/lower bracket queue with a losers catch-up gate; simulated brackets up to 128
- [x] GitHub pull-request tests and Pages deployment workflows

## NEXT — Must ship before real tournament use
- [ ] **Shared server / persistent database**: migrate authoritative events, brackets, matches, rounds, boards and corrections from localStorage
- [ ] **Authentication / multi-tenant roles**: directors, assistant directors, scorekeepers, referees, player accounts, board tablets and spectators
- [ ] **Transactional scoring and correction APIs**: idempotent, versioned, validated, append-only audit, safe automatic advancement
- [ ] **Real-time cross-device updates**: score, queue, bracket, stats, corrections and board occupancy; reconnect and stale-version handling
- [ ] **Secure tablet pairing**: expiring one-time codes, device revocation, heartbeat, event and assigned-board scope
- [ ] **Production-quality schema and event migration tests**: server-side RLS, REST/RPC contracts, schema evolution and disaster recovery

## NEXT — Tournament quality and safety
- [ ] **Supervised bracket repair** when downstream matches have already begun
- [ ] **Configurable tournament formats**: byes, uneven field seeding, round robin to bracket, best-of, timed games, forfeits/withdrawals
- [ ] **Smarter match queues**: rest time, seeded priorities, director holds, board fairness, travel time, cross-tournament overlap
- [ ] **64/128 bracket performance**: virtualization, load test, 1,000+ changes with several simultaneous event brackets
- [ ] **Commissioner correction review** with detailed audit, approval, alerts and score dispute handling
- [ ] **Doubles partner/roster updates** with restrictions and ratings recalculation rules

## NEXT — Venue pilot and release
- [ ] 3+ brackets and 6–12 tablet devices with two directors
- [ ] Deliberate offline/reconnect and duplicate save races; verify no double-counted rounds
- [ ] Measured end-to-end latency, ideally under 2 seconds once a round is confirmed
- [ ] Enforced session revocation and spectator read-only permissions
- [ ] Audit exports, final scores reconciliation, and reproducible CSR/stat refresh
- [ ] User documentation for directors, board/tablet operators, and competitors

## Source documents
- [Live Scoring Architecture](LIVE_SCORING_ARCHITECTURE.md)
- [Director Corrections and Bracket Scheduling](DIRECTOR_CORRECTIONS_AND_SCHEDULING.md)

Current deployment is a demo. Every user account and score inside the GitHub Pages app is browser-local, and director demo mode is **not** secure authentication. Do not trust the app as the sole system of record for real events.


## 2026-11-17: Director tournament formats and operations epic
### Implemented in browser-local demo
- [x] Freeze individual match or child tournament from new board assignments
- [x] Board flex between child brackets, with safe transfer of running scored game to free board
- [x] Tournament Studio: signups, team building, stage-based launch, entry paid indicators
- [x] Event/day-scoped door fees and director-marked paid status
- [x] Singles, fixed-team doubles, blind draw doubles, singles/doubles swap formats
- [x] Configurable rounders, PPR standings and top/bottom, top/middle, randomized pairing strategies
- [x] Solo Slot and seeded byes for odd/even, non-power-of-two fields
- [x] Random, director-entered points, state/national rankings, and rounder-PPR seed options
- [x] Round-limited matches with scored overtime to break ties

### Remaining
- [ ] Shared persistent transactional backend, authenticated director/board permissions and multi-device sync
- [ ] Verified league points / rankings imports and real payment flows
- [ ] Audited roster removals/substitutions and fee history / refunds
- [ ] Supervised bracket rebuild, director overrides, rest windows, and load testing
- [ ] Multi-day check-in workflows and reliable tournament-day financial exports
- [ ] Full venue integration tests with 6–12 tablets and concurrent divisions

See [Director Tournament Epic](DIRECTOR_TOURNAMENT_EPIC.md).

## Production accounts and infrastructure — foundation drafted, not deployed (2026-11-17)
- [x] Auth/profiles organization-membership schema + private platform admin table + authorization audit baseline in migration
- [x] RLS and least-privilege profile reads/updates; no client role mutation policies
- [x] Supabase v2 account service scaffold: signup, sign-in, sign-out, reset, profile edits, server-derived access
- [x] Mocked unit tests and static schema security checks
- [ ] Provision staging and production Supabase projects with email delivery and MFA for privileged roles
- [ ] Apply migrations and validate RLS using real JWT roles/SQL integration tests against staging
- [ ] Bootstrap verified founder/admin account from trusted operator console; no public admin signup
- [ ] Build and deploy a production frontend with verified auth flows, email confirmation and account recovery
- [ ] Replace demo localStorage event and score mutations with server-authorized APIs and event/organization access control
- [ ] Secure tablet pairing, server-side scoring transactions, private realtime subscriptions and tested offline recovery
- [ ] Penetration review, security headers, audit retention, backup restore drills and production pilot approval

See [Production Infrastructure, Accounts & Security](PRODUCTION_AUTH_SECURITY.md). Do not treat the current demo login/director toggle as a production security boundary.

## Nationwide scale planning — architecture only (2026-11-17)
- [ ] Move public site from GitHub Pages to a production CDN host (e.g., Cloudflare Pages/Workers) with a custom domain, TLS, WAF, versioned deploys and rollbacks.
- [ ] Keep one centralized authoritative Postgres database initially (US East is a reasonable US default); use indexes, pooled DB connections and paginate/cached public results.
- [ ] Separate public high-volume spectator reads from privileged scoring writes: CDN/cache published standings; use private scoped Realtime only where scores truly need live updates.
- [ ] Benchmark event simulations: 10, 50 and 100 simultaneous multi-board events; separately simulate spectator bursts of 500, 2,000 and 10,000 viewers.
- [ ] Capacity-plan Supabase Realtime limits: current capped Pro tier 500 concurrent connections/500 messages per second; Pro without spend cap permits up to 10,000 connections and 2,500 messages per second, subject to pricing and load testing. Check provider limits again at deployment.
- [ ] Add availability targets, dashboards, connection/message-rate and p95 latency metrics, peak event-day alerting, automatic retries and fail-safe offline scoring.
- [ ] Validate multi-tenant security under concurrency, schema growth, backups and tested disaster recovery before claiming nationwide readiness.

The proposed infrastructure can serve geographically distributed US users, but these scale tests and the backend are NOT implemented. Sources: https://supabase.com/docs/guides/realtime/limits and https://developers.cloudflare.com/pages/platform/limits/.

## Spectator-first nationwide live scoring (new primary product track, 2026-11-17)
Our goal is a **public sports scoreboard and player-tracking platform**, not director-only software. A spectator may visit without a login from a venue or from home.

- [ ] Public Today / Live nationwide directory: state, city, date, live status, event format and venue filters; shareable URLs
- [ ] Public event hub with every child tournament, currently playing games, all scores, upcoming matches, final results and standings
- [ ] Player lookup that identifies active event/bracket, board, opponent, confirmed score, live PPR and recent match history
- [ ] Public read-model tables/indexes with paginated search, bounded responses and trusted score-version snapshots
- [ ] CDN caching for public read-only listings and score snapshots; never cache privileged or payment data
- [ ] Selective live updates in foreground views, clear freshness/offline indicators, no raw Postgres Changes fanout to every viewer
- [ ] Separate trustworthy scoring writes and director/board Realtime traffic from high-volume public spectators
- [ ] Load-test 500, 2,000 and **5,000 simultaneous spectators distributed across events**, plus **5,000 concentrated** on one popular event
- [ ] Measure origin RPS, cache hit ratio, p95/p99 latency, Realtime messages/sec, round-to-screen delay, mobile performance, costs and resilience
- [ ] Add notification/follow opt-in, privacy controls, and replay/history after public browsing and score delivery are proven

Supabase Pro spending-capped Realtime (500 sockets / 500 messages per second) is **not** a viable architecture for 5,000 direct live sockets. Pro with spend cap off documents 10,000 sockets / 2,500 messages per second, still requiring careful fanout capacity. See [Spectator-First Nationwide Architecture](SPECTATOR_SCALING_ARCHITECTURE.md) for contracts, failure modes, and acceptance criteria. **Not implemented or load-tested.**


## Immediate priority: database-backed private pilot and organization presentation (2026-11-17)
**The critical path is shared persistence PLUS trusted scoring APIs**, not just a hosted database.
- [x] Stage Supabase Auth/profile/organization schema and local account service scaffold (not deployed).
- [x] Prepare automated GitHub Actions pilot-readiness agent: daily/manual regression suite, with opt-in read-only staging Auth/RLS smoke after database provisioning.
- [ ] Create UCL-owned staging Supabase project, review/apply migration, configure test accounts, protect GitHub Environment secrets, enable staging check.
- [ ] Implement event/tournament/match/board/round database schema with tenant-isolated RLS and seed reset for a fictional organization.
- [ ] Trusted idempotent match-round submission and automatic bracket advancement in one transaction.
- [ ] Replace browser-local director and tablet writes with shared server APIs; enable private board/device realtime and public spectator snapshots.
- [ ] E2E two-browser/two-device tests (director, tablet, anonymous spectator) and isolated scoring concurrency tests, with audit and offline recovery.
- [ ] Deliver a rehearsed **10–15 minute organization demo**: Today/Live, player search, multi-bracket event hub, board tablet scores, PPR, director correction, role boundaries.
- [ ] Conduct venue pilot and 5k-viewer load tests as separate later release gates; never claim public capacity based on demo.

**Current gate:** no database is connected and the new staging smoke cannot run until Supabase credentials/fixtures are provisioned. The scheduler does not provision Supabase, access production data, or autonomously repair failures. Details: [Private Pilot & Organization Demo Readiness](PILOT_DEMO_READINESS.md).

## Separate UCL database and secret management (2026-11-18)
- [x] Confirm existing Supabase connection belongs to a Supabase account with an unrelated project; **do not modify that project**.
- [x] Add `.gitignore` protection for local `.env` files, a blank `.env.example`, and [safe configuration instructions](ENVIRONMENT_AND_SECRETS.md).
- [ ] Confirm which Supabase organization will own the new **UCL staging project**, review any creation/billing confirmation, and create that independent project.
- [ ] Review and apply the UCL auth/RLS migration to the new project only; run live schema and security tests.
- [ ] Configure protected GitHub `staging` Environment secrets and enable the optional staging smoke checks.
- [ ] Build compiled frontend public config for URL/publishable key and trusted server-only secret handling; the current static GitHub Pages app cannot load `.env`.
- [ ] Build the shared event and scoring schema/API, then end-to-end test laptop, tablet and spectator across separate devices.
