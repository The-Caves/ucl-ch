# Spectator-first nationwide live scoring architecture

Updated 2026-11-17. **Planning and acceptance criteria only — not deployed or load-tested.**

## Product direction
UCL is a **public nationwide live sports platform**, not merely software for tournament directors. Public spectators at a venue or at home should be able to:
- Open a Today / Live directory, filter national events by state/city, date, format, venue and director.
- Search for a player by name or ID and immediately see active events, which tournament/bracket they are playing, board assignment, opponent, confirmed score, PPR and previous results.
- View an event-wide scoreboard covering all child tournaments plus bracket, current games, upcoming matches, final results, standings and individual player pages.
- Share a deep link to an event, particular player or match. Public score viewing does not require a login.
- Follow a player and eventually opt into alerts when that player's match begins or ends (authenticated opt-in and unsubscribe workflow remain future tasks).
- See the last authoritative saved score and a clear update timestamp when connectivity is degraded; never show a locally pending tablet round as an official result.

## Architecture: keep reads and writes separate

**Cloudflare — public frontend and cache.**
Serve website assets nationwide. Expose a versioned public read API through Workers or a comparable backend gateway. Cache public event lists, scoreboard snapshots, player profiles and results. Proposed cache freshness: approximately 2–5 seconds for actively watched events and 15–60 seconds for less dynamic listings; tune from load tests. Validate response sizes, cache keys, paging, search parameters and expiration. Never cache private player data, payments, organization membership, account sessions or director/admin responses.

**Supabase PostgreSQL — one authoritative ledger.**
All score rounds, bracket progression, corrections, boards, players, events and accounts belong to the shared database. A trusted transactional API writes official rounds and advances brackets atomically; it also updates compact public read-model tables indexed for event, player and match lookup. No visitor should recalculate all match results from a large join per refresh.

**Supabase Realtime — focused operations.**
Authorized directors, scorekeepers and paired board tablets use event/board-scoped private Broadcast channels and reload authoritative versions after reconnect. Prefer Broadcast over client subscriptions to individual Postgres Changes for scale. A confirmed round triggers a versioned notification and refresh; no uncommitted score becomes official.

**Spectator viewing — efficient delivery.**
National directories, player searches, standby spectators and most scoreboard lists use CDN snapshots with conditional fetch and smart refresh. Foreground match views may use selectively subscribed realtime broadcasts if measured fanout/throughput is affordable, or short-interval versioned refresh. Batch frequent round changes into compact event/match snapshots; do not replicate every raw bag record to every visitor. A popular tournament may need a dedicated push/fanout service when benchmarking proves Supabase Realtime throughput insufficient.

### Proposed read-only public API contracts (not implemented)
- GET /api/public/events?status=live&state=NC&date=YYYY-MM-DD&cursor=...
- GET /api/public/players?search=name-or-id&cursor=...
- GET /api/public/players/{id}/live — active match, board, bracket, opponent, confirmed scores
- GET /api/public/events/{id}/live — all child tournament live score rows, version, updated time
- GET /api/public/tournaments/{id}/bracket — current progression and upcoming games
- GET /api/public/matches/{id} — confirmed score and recorded round history

Every response should include a public status, version, last committed time and last refresh time. Protect all private or unpublished event information through authorization, not just UI visibility.

### Indexing and data projections (proposed)
- events: by state, city, start_time, status and public_listing
- tournaments: by parent_event_id and status
- matches: by tournament_id and status, board_id, and updated_at
- live_match_participants: by player_id and match_id with link to parent event, for fast "Where is this player playing?"
- public_player_summaries: current PPR, published CSR, rank and recent results with bounded history
- public_event_scoreboard: compact versioned event-wide snapshots updated after confirmed scoring transactions

## What 5,000 simultaneous spectators requires

**A webpage visit is not a live database connection.** With a CDN, many ordinary page loads and result refreshes can be served without touching Postgres.

- At a 10-second snapshot interval, 5,000 active viewers generate 500 **HTTP requests/second to the edge** before caching. Cache-hit ratio and deduplicated public read models control the actual origin load; do not assume a particular hit ratio without measurement.
- Supabase published Realtime Pro (spending capped) limits are 500 simultaneous connections and 500 messages/second. Pro without the spend cap lists 10,000 connections and 2,500 messages/second as of November 2026. A 5,000-subscriber broadcast update could itself exceed one second of that default message-throughput allowance. 10,000 connections does NOT guarantee 5,000 continuously synchronized spectators.
- Separating operators' critical realtime messages from public viewers' cacheable snapshots avoids exhausting realtime throughput when a national tournament gets popular. Check provider tiers and overage pricing before production and contact provider support for higher limits if needed.

### Performance and acceptance scenarios
1. 500 spectators / 10 events, 40 boards
2. 2,000 spectators / 25 events in several states
3. 5,000 spectators distributed across 50–100 events, mixed live viewing and directory/player searches
4. 5,000 spectators concentrated on one national event, 8–20 active boards, rapid score updates and bracket finalizations
5. 10,000 spectators growth scenario, plus hundreds of tablets/directors, for future capacity planning
6. Reconnect storms, cold CDN, bot searches, simultaneous finals, an offline venue, correction race conditions and a database failover rehearsal

Measure p95/p99 website/API latency, CDN hit ratio, origin requests/sec, concurrent realtime connections, broadcasts/messages/sec, score-commit latency, confirmed-round-to-screen delay, failed requests, database CPU, RLS isolation, mobile usability and cost per 1,000 spectators. Initial performance targets (not promises): confirmed scores visible in 2–5 seconds on a foreground live view and 15–30 seconds in national directories, with correctly displayed delay indicators during outages. Require zero acknowledged round loss.

## Security and privacy
- Anonymous people may access **published** results and discoverable profiles; login is optional for browsing and required for protected follow notifications, personal settings and tournament operations.
- Spectators are **read-only**. No public client can call director correction, board assignment, score-write or platform role APIs.
- Public caches must exclude email, phone, private profiles, payment and door fee records, device secrets and draft corrections. Respect player discoverability, minor protections where applicable and data deletion procedures.
- Rate-limit search, validate input, bound pagination and query work, use WAF/bot defenses, and review all privileged APIs for cross-organization and cross-event isolation.

## Delivery milestones
1. Public nationwide Today / Live directory, event hub and fast player live-lookup UX design and API contracts.
2. Supabase schema for events, teams, matches, confirmed rounds plus public indexed projections and trusted write API.
3. Cloudflare production frontend, public cached snapshot APIs, selective live subscriptions, freshness and outage UI.
4. Load tests for 500 / 2,000 / 5,000 distributed AND 5,000 concentrated spectators; security audit, cost measurements, recovery.
5. Scale database compute, introduce read replicas, or move spectator fanout to a dedicated service **only when benchmark data justifies it**.

**Current state:** the real public API, CDN snapshot layer, shared Supabase scoring backend and capacity tests are not deployed. Today's GitHub Pages application remains a browser-local demonstration.

## References to check before deployment
- https://supabase.com/docs/guides/realtime/limits
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/platform/read-replicas
- https://developers.cloudflare.com/cache/get-started/
