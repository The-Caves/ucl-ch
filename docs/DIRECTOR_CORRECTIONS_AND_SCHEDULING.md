# Director Corrections & Bracket Scheduling

## State as of November 17, 2026
**Implemented in the browser-local prototype:**
- Directors can enter completed games manually when tablets are unavailable, or correct a final score / winner.
- Director forfeit recording (21–0), with an explicit winning side.
- Edit recorded round bag counts, including correcting the actual throwing player in doubles.
- Correct matchups in unplayed opening-round matches; atomically swap registered players or doubles teams between two unplayed opening matches.
- Explicitly reopen a match (clear its saved rounds and score), with warnings.
- Require director demo mode and a correction reason (at least six characters); create a local audit entry with before/after match and round snapshots, other changed matches and affected IDs.
- When the winning side changes, recalculate unplayed downstream competitors, or reject the change if a dependent match has started/finished or has score entries. Corrections are applied against a draft state so a rejected change leaves the original state untouched.
- Manual-result and forfeit records deliberately have no invented bag-level PPR; corrections that alter scored games replace old round data while retaining its before-image in the audit.
- Director Tools includes a dedicated correction interface with match selection, form validation and audit browsing. Match details and active board cards link directly to correction actions.

**Scheduling implemented:**
- Double-elimination generation supports power-of-two fields of **4, 8, 16, 32, 64 or 128 teams/competitors** (single-elimination up to 128).
- Scheduling candidates are limited to fully seeded matches and exclude any player already active on a board in another match, including across child tournaments.
- Winners and losers brackets are paced together by the following preferred waves:
  **W1 → L1 → W2 → L2 → L3 → W3 → L4 → L5 → W4 → ... → championship**.
- Hard catch-up gate: before W round R >= 3 can launch, every match in L round 2R-4 of the same tournament must be Final or Not needed. Examples: W3 waits for L2; W4 waits for L4; W5 waits for L6.
- The shared event board queue uses this policy; director screens show matches ready and the number of upper-bracket games held for the lower bracket.
- Simulated complete brackets through 128 participants without deadlock; conditional grand-final reset behavior remains in the engine.

## Director edit rules

| Action | Eligibility | Effect on rounds, winner and bracket |
| --- | --- | --- |
| Manual final score | Match has both teams | Record 21–x or x–21, remove prior bag history, advance bracket once |
| Forfeit | Match has both teams and a selected forfeit winner | Record 21–0, no fabricated PPR, advance bracket once |
| Score/winner correction | Even when Final | Updates scores and recalculates unplayed dependent matches if winner changes; blocked when downstream has started |
| Round/thrower correction | Already saved round in active/final match | Validate max 4 bags per player, recompute cancellation score and PPR; reject history that ends early |
| Unplayed opening matchup | Scheduled W1 match without recorded rounds | Change registered competitors, prevent duplicate first-round allocations |
| Swap opening competitors | Two scheduled, unplayed W1 matches in the same bracket | Atomically exchange a singles player or complete doubles team; validate roster and prevent duplicates |
| Reopen | In Progress or Final match | Clear saved rounds and score, release board, recalculate unplayed dependents; blocked if downstream already started |

**Correction semantics:** an edited recorded game that no longer reaches 21 cannot silently become a final. Reopen and replace the result instead. Reopening destroys the current scorecard in operational state but preserves the previous copy in its audit record. A manual result/forfeit never generates PPR data. An audited correction must not be confused with rewriting the original historical event.

## Operational caveats
This is **not** a trusted or secure audit trail: the browser's localStorage and simulated director access can be modified by the device owner. It is not a substitute for server-side authentication, an append-only audit table or multi-device synchronization. Do not use it as the sole tournament scorekeeping platform.

No automatic rewrite of already-started downstream games is allowed. This requires an explicit **supervised bracket rebuild** with director confirmation, impact preview, notifications, and transactional rollback.

## Production requirements / roadmap
### P0 — required before real events
1. Shared Postgres backend and server-side role enforcement for director, scorekeeper, referee, tablet device, and read-only spectator.
2. Server-only command API with idempotent request IDs, optimistic versions, row locks, and atomic edits, results, bracket advancement, board release, rating/stat invalidation and append-only audits.
3. Secure device pairing, revocation, sessions, signed scoring rights for a single board/match, and Realtime notifications for published score changes.
4. Immutable round ledger with correction revisions and actor/approver identities. Audit should include before/after of **all** affected matches, boards, rounds and derived aggregates.
5. Confidence and reconnection paths: offline edits remain drafts until accepted, and stale devices receive conflicts instead of overwriting a new official result.

### P1 — competition-grade bracket rules and correction recovery
1. Supervised bracket rebuild if a wrong result has already fed an active/final match: impact visualization, replay from a checkpoint, commissioner approval, and notifications.
2. Add configurable match scoring modes and tournament rules (21 cancellation, points win-by-two option if chosen, round/time limits, best-of series, no-show/bye/forfeit behavior).
3. Time/rest-aware scheduling across simultaneous brackets: minimum rest, manual holds, board constraints, fairness across divisions, scorekeeper restrictions, event priority and director overrides with warnings.
4. Improve large-field bracket performance, lazy rendering and bracket viewport navigation; verify 64/128 with real scoring and board scheduling load.
5. Explicit player/partner substitution rules, roster corrections after match start, sanctioned doubles lineup changes and rating recomputation policy.

### P2 — director operations and reporting
1. Director issue inbox for score disputes, approval flow for corrections, audit downloads and annotated match history.
2. Per-round detailed bag entry editing, undo/redo and player notification when PPR is restated.
3. Detailed operational dashboard: wait time, board occupancy, bracket pacing heat map, missed matches, referee overrides.
4. Full e2e tests with 6–12 real tablets, 3+ simultaneous child tournaments, Wi-Fi loss, duplicate requests and conflicting director actions.

## Acceptance tests
- An incorrect first-round winner is corrected; all *unplayed* dependent match participants are updated without changing any unrelated match.
- The same correction with a started dependent match is rejected and makes **no** state changes.
- A 21–0 forfeit advances the bracket but contributes zero scored bag rounds.
- A wrong doubles thrower is corrected; PPR moves to the right player without changing another player's stats.
- A swap between two opening-round matches preserves a unique player/team allocation.
- A supervisor can review the actor, reason, timestamp, before/after and all affected match IDs for each change.
- W3 waits on L2, W4 waits on L4, and no allowed ready-match queue gets stuck for full 4–128 participant simulations.
- An active player cannot be assigned to two boards, even across separate child brackets.
- A real cross-device pilot must pass the separate requirements in [Live Scoring Architecture](LIVE_SCORING_ARCHITECTURE.md).

These are implementation milestones and acceptance criteria, not claims of a production live tournament service.
