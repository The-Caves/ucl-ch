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
