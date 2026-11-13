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

## Development
Run `npm test` to validate the engine, scorecards, historical fixtures and player statistics. GitHub Actions runs tests on pull requests and before Pages publication.

## Limitations
All sample people, events and scores are fictional. This is a single-browser demonstration, not a real multiuser tournament backend. No official league feed, account system, realtime synchronization, secure director authentication, full double-elimination bracket, payments or native store apps. A production implementation needs a verified score/audit pipeline and permissioned server.

## Branding
Edit `src/brand.js` for naming and `index.html` theme variables for colors. Licensed artwork can replace placeholder assets after permission is obtained.
\n## Throw scoring\nDirectors can enter four bags per round (0 off, 1 board, 3 hole), view recorded PPR and placement counts in match details, and export CSV. This is browser-local demo data, not synchronized across tablets.\n