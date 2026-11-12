# CH — Cornhole Hub

Mobile-first, independent UCL-inspired cornhole competition prototype. Not an official UCL or Scoreholio product.

## Features
Responsive homepage, tournament discovery, searchable brackets, match center, demo director score entry, opponent-adjusted provisional CH Skill ratings, local favorites and browser-local score persistence.

## Run
Run `python3 -m http.server 8000` and open http://localhost:8000. Run `npm test` to verify the bracket and rating unit tests.

## Deploy
GitHub Pages workflow is included. In repository Settings → Pages, choose GitHub Actions as the source. Publishing requires successful workflow completion.

## Limitations
All sample people, events and scores are fictional. This is a single-browser demonstration, not a real multiuser tournament backend. No official league feed, account system, realtime synchronization, secure director authentication, full double-elimination bracket, payments or native store apps. A production implementation needs a verified score/audit pipeline and permissioned server.

## Branding
Edit `src/brand.js` for naming and `index.html` theme variables for colors. Licensed artwork can replace placeholder assets after permission is obtained.
\n## Throw scoring\nDirectors can enter four bags per round (0 off, 1 board, 3 hole), view recorded PPR and placement counts in match details, and export CSV. This is browser-local demo data, not synchronized across tablets.\n