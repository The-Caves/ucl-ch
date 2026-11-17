# Live Board Scoring Architecture

Status: a browser-local Director Board Command Center and board-side round-scoring pilot are implemented. This is NOT a secure, cross-device production scoring system. Static GitHub Pages cannot host the required write API.

## Venue workflow
1. Director creates one Event with one or more child Tournaments (singles, doubles).
2. Director configures the shared venue Board floor. Boards can rotate across brackets.
3. Director pairs each tablet to a physical board through a short-lived one-time code. No director permissions are exposed to the tablet.
4. Director assigns a ready match from any child tournament. Assigned tablet receives that match automatically.
5. Player enters bags in/on per side for each round; in doubles, selects each actual thrower. A server transaction validates the round and calculates cancellation scoring to 21.
6. After each acknowledged save, director, spectator board and player bag metrics update through authenticated real-time notifications.
7. On final score, a single transaction advances the winner/loser bracket, publishes the game result, and releases the board for the next match.

## Recommended stack
- Keep GitHub Pages as frontend; add a trusted write backend.
- Recommend Supabase Postgres + Auth + Realtime Broadcast and trusted scoring API functions. This is a proposed stack, not a deployed connection.
- PostgreSQL must be source of truth. Broadcast notifications notify clients about committed IDs and versions; clients reload authoritative snapshots after reconnect.
- Require private authenticated Realtime channels, row-level security, short-lived JWTs, and verified device permissions. Public spectator reads must not allow writes.
- Use version locks and transactions to enforce uniqueness across concurrent devices.

## Relational schema (proposed)
- organizations / organization_members: tenant, director/admin permissions
- events: name, director, venue, date and lifecycle
- tournaments: parent event, format, config, bracket state
- event_boards: parent event, board number/name, enabled status
- board_pairing_codes: hashed one-time pairing code, expiry, used_at
- board_sessions: paired device, event, board, revoked_at, heartbeat
- matches: tournament, assigned board, version, status, teams, scores and advancement links
- match_rounds: match, monotonically increasing round, bag counts, actual doubles throwers, timestamp, unique(match_id,round_number)
- scoring_requests: request UUID, board session, committed response; unique(request_id) for idempotency
- score_audit: actor, timestamp, old/new, correction reason
- player_stats / rating_snapshots: derived bag metrics plus final-result ratings

## Submit Round API
The board submits: board_session, request_id, match_id, expected_match_version, expected_round, a_in, a_on, b_in, b_on, and optional doubles thrower IDs.

The trusted backend transaction MUST:
1. Authenticate board session and verify its exact assigned match and event.
2. Lock match and board rows. Reject stale/final/unready matches, conflicts, invalid four-bag totals, or wrong doubles throwers.
3. Deduplicate by request_id and unique match/round. Retried requests return their prior result.
4. Recompute score and PPR from committed round records on the server; never trust submitted total scores.
5. Insert immutable round and audit records; increment match version and recalculate current scores.
6. If finished, atomically finalize the match, advance the bracket (including reset finals), and release the board.
7. Commit then publish a versioned change. Clients waiting for acknowledgment must not claim their local round is official.

## Director controls
Board pairing/revocation; assign next eligible match; block boards; monitor connected devices; correct scores with audit reason; pause/forfeit; inspect all child tournaments; live board occupancy and queue; view last saved round and conflicts. A board belongs to the Event, not any child tournament.

## Tablet UX
Show assigned match and big names/scores; one-touch four-bag in/on controls; named doubles thrower selection; clear Save Round acknowledgment, offline/pending/error states, and confirmed per-round history. After match final, show result then idle until director assigns another match.

## Disconnected scoring
Store unsent round drafts locally with stable request IDs. Do not publish or advance a bracket without server acknowledgment. On reconnect fetch current match assignment and version before replay. Assignment changes and conflicting rounds require director review, not silent overwrite.

## Rollout
Phase 1 (implemented): local board floor, round scoring, auto final/advance, immediate local PPR, browser-tab sync, unit and smoke tests.
Phase 2: server schema, Auth, RLS, scoring transaction, live subscriptions and durable server records.
Phase 3: one-time tablet pairing, board heartbeats, realtime match handoffs, secured director workflow.
Phase 4: offline resilience, audited score corrections, notifications, spectator displays.
Phase 5: venue pilot with 6–12 tablets, at least three concurrent tournaments, two directors, many matches and deliberate Wi-Fi interruptions.

## Production acceptance criteria
- A tablet updates without refreshing when a director assigns a match from another device.
- 2 concurrent submissions of the same round create exactly 1 committed round.
- Venue updates target under 2 seconds after a confirmed save; measure this in field tests.
- No board or player can occupy two simultaneous matches.
- Reconnection never invents acknowledged results or silently overwrites a competing score.
- Doubles individual thrower PPR agrees with round records.
- Match final advances exactly once, frees the board, and remains audited.
- Unpaired or revoked devices cannot submit rounds.
- Cross-event tenant isolation works under RLS and private Realtime permissions.

## Explicit current limitations
The pilot currently stores data in browser localStorage. Browser storage event listeners can sync tabs in the same origin/browser profile, not different laptops/tablets. There is no secure device pairing and no shared backend. It must NOT be relied on as sole scorekeeping for a real event.
