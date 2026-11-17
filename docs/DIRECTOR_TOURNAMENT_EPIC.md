# Director Tournament Epic: Formats, Registration, Board Flex

Updated: November 17, 2026. Status: **browser-local prototype**. Not production multi-device scoring.

## Hosted events and tournaments
Directors create an Event (venue/day) with multiple child Tournaments. Event boards may run any child bracket. Tournaments begin in Upcoming/Signup, then move to Rounders (for swap formats) or an elimination Bracket.

## Supported formats
- Singles: single or double elimination.
- Fixed-team doubles: director pairs registered players before launch; single or double elimination.
- Blind-draw doubles: pseudorandom partners, then single or double elimination.
- Singles swap: a director-selected 1–20 rounders, with rotating random opponents, then a singles elimination bracket.
- Doubles swap: 1–20 rounders with rotating randomized teammates and opponents; scored PPR standings determine post-rounder teams and bracket seeds.

Doubles swap team assignment options: Top/Bottom (#1 with #20, #2 with #19); Top/Middle (#1 with #11, #2 with #12); random top-half/bottom-half; full blind draw. Rankings use recorded individual PPR, then wins and ID as deterministic tiebreakers. Swap playoffs cannot generate from manually entered results lacking bag-level data, because PPR cannot be established.

## Solo Slot and byes
An odd number of doubles entrants creates one Solo Slot (internal ID -1) alongside a real player, never a virtual player profile, paid entry, or CSR contributor. Only the real player can be selected as round thrower. Byes automatically advance without fictitious played matches. Standard seeded brackets are positioned symmetrically, including uneven 3–128 entrant fields. Round-robin style rotation is used to reduce repeated rounder pairings, with occasional sit-outs if an odd number of teams cannot all play at once.

## Seeding
Director choices: random; event points; state ranking; national ranking; rounder PPR. External metrics are **manually entered demo data** until a sanctioned ranking/points feed exists. Missing values block ranking-based seeding rather than silently inventing official scores. Winners/losers pacing remains protected by existing scheduling gates.

## Round-capped matches
Directors can select 1–30 rounds, with 0 meaning normal play to 21. A game can finish on reaching 21, or when the cap is reached with one side ahead. When the cap is reached tied, the game remains unfinished and enters sudden-death overtime round(s) until the cumulative score is unequal. This documented tiebreak exception ensures there is no tie final.

## Registration and manual fees
Directors search the demo roster plus locally created player profiles by name and unique numeric ID, add players before launch, mark entry paid/unpaid, and build fixed doubles teams. Signup locks when launched. Parent Event can optionally set a door fee once for the event or for each day of the event; per-day check-in selects the charge date. These are status indicators **only**: no real payments, receipts or financial data integrations.

## Freezes and board flexibility
Directors freeze an individual match or whole tournament to block **new board assignments**, without stopping an in-progress match from scoring. A board can flex between child brackets. A scored match can move to a **free** board and retain its scorecard, but it cannot be silently displaced by another match; only unscored assignments may be replaced after confirmation. Local prevalidation protects against losing the old assignment on an unsuccessful transfer. Production requires an atomic server transaction.

## Acceptance tests
- Freeze and unfreeze blocks/unblocks ready scheduling while live scoring continues.
- Move a running scored match to a free board without losing rounds; reject displacement by a second game.
- All formats launch valid single/double elimination or rounders; uneven fields complete without deadlocks.
- Partner modes give expected 20-player pairings.
- Solo Slot cannot be credited as a scoring player or receive a CSR.
- A tied round-cap game cannot finalize; it finalizes only after a scored deciding overtime round.
- Player signups and fee flags are retained in the browser and cannot be silently duplicated.
- Director-entered ranking values determine seeds; missing values produce errors.
- No player has two simultaneous active board assignments within the scheduling scope.

## Production work remaining
- Shared database, director/scorekeeper authentication, trusted corrections and append-only audits.
- Secure tablet pairing, scoped scoring, real-time subscriptions and offline reconciliation.
- Verified event points, official state/national rankings and permitted partner/roster changes.
- Secure entry fee and door payment records, refunds, day check-in and receipts.
- Real venue simulation: 6–12 tablets, multiple brackets, 128-field load, rest limits and score integrity.
- League rules review of Solo Slot, round-capped overtime, sit-outs and bracket seeding.
See the Project Roadmap and Live Scoring Architecture documents for prerequisites and release gates.
