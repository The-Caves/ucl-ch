# CH — Cornhole Hub

Mobile-first, independent UCL-inspired cornhole competition prototype. Not an official UCL or Scoreholio product.

## Features
Responsive homepage, tournament discovery, searchable brackets, match center, demo director score entry, opponent-adjusted provisional CH Skill ratings, local favorites and browser-local score persistence.

## Run
Run `python3 -m http.server 8000` and open http://localhost:8000. Run `npm test` to verify the bracket and rating unit tests.

## Deploy
GitHub Pages workflow is included. In repository Settings → Pages, choose GitHub Actions as the source. Publishing requires successful workflow completion.

## Tournament discovery and sample season
The demo seeds 10 completed fictional events (six singles, four doubles) with consistent simulated bracket results, per-round bag logs, and a competitive example player record. Singles and doubles statistics are separated; doubles PPR credits only rounds actually thrown by the selected teammate, and doubles ratings are calculated independently. Upcoming/live demonstrations remain available alongside the history.

Tournament discovery includes search, status chips, sorting, expandable date/city controls, and pagination. My Tournaments has its own full searchable list of enrolled/saved events, while the dashboard previews only a few recent events. Player profiles show the last three matches with a separate searchable full match history. The dashboard highlights active matches separately from matches up next. Fixture data is versioned in browser storage; sample season updates may replace earlier fictional fixtures but do not represent real competitions.

## Player discovery and CSR leaderboard
The UCL brand title acts as a dashboard navigation button. The dashboard provides a Players & Leaderboard entry below My Tournaments and above Practice. Player search uses the eight fictional competition participants and includes any browser-local demo profiles as unranked entries. Singles and doubles CSR standings use existing tournament scoring/rating algorithms, with independent qualification thresholds and state/city filters. Geographic ranks are calculated within the filtered area, while name search does not renumber ranks. Public demo player pages include established CSR and recent simulated results. This remains a browser-local prototype, not a server-backed player database or verified real-world ranking.

## Player Hub and multi-tournament event hierarchy
The dashboard now links to a dedicated **Players** area with player search, following, and an embedded singles/doubles CSR leaderboard. Following is per demo account and stored only in the current browser. Player profiles include singles and doubles CSR, overall and state rank, match record, PPR, four-bagger percentage, recent matches, and active/upcoming/completed parent events. No backend or cross-device player account synchronization is claimed.

A hosted parent **Event** has zero or more child **Tournaments**. Child tournaments keep their independent brackets, scores, stats and standings; opening any child bracket provides a link to event-wide scores. The parent event page shows every child bracket and expandable, searchable live/upcoming/final score groups. A versioned migration wraps existing tournaments in parent events without modifying their match IDs or results. The fictional Triangle Cornhole Night fixture demonstrates three simultaneous brackets; other legacy tournaments become one-bracket events. Director demo tools create a venue event separately and then add independent singles or doubles brackets beneath it. The bracket tab is full-width with a large scrollable canvas on desktop and mobile.

These remain **fictional browser-local demonstration data**, not a live multiuser competition service. Production should use server-assigned event IDs, director permissions, audited match updates, and shared player-follow relationships.

## Director board scoring pilot
The Director Tools page now links to a **Board Command Center**. Boards are shared by all tournaments in the parent event; the director can add boards, assign the next ready match, release an unscored assignment, and open a large tablet-style scoring view. Players save in/on bag totals for each side every round (with thrower attribution for doubles). Cancellation scores and bag metrics update immediately; a match reaching 21 advances the existing bracket and frees the board. Optimistic round-number checks prevent duplicate saves in the local pilot. Live round statistics update before match final, while wins, losses and CSR only change when the result is final.

**Important:** This is browser-local demonstration functionality with same-browser tab storage synchronization, **not actual cross-device scoring**. The backend pairing, real-time subscriptions and transactional writes needed for a live event are specified in [Live Board Scoring Architecture](docs/LIVE_SCORING_ARCHITECTURE.md). Do not use the pilot as sole scorekeeping at a real venue.

## Development
Run `npm test` to validate the engine, scorecards, historical fixtures and player statistics. GitHub Actions runs tests on pull requests and before Pages publication.

## Limitations
All sample people, events and scores are fictional. This is a single-browser demonstration, not a real multiuser tournament backend. No official league feed, account system, realtime synchronization, secure director authentication, full double-elimination bracket, payments or native store apps. A production implementation needs a verified score/audit pipeline and permissioned server.

## Branding
Edit `src/brand.js` for naming and `index.html` theme variables for colors. Licensed artwork can replace placeholder assets after permission is obtained.
\n## Throw scoring\nDirectors can enter four bags per round (0 off, 1 board, 3 hole), view recorded PPR and placement counts in match details, and export CSV. This is browser-local demo data, not synchronized across tablets.\n