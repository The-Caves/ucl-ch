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
