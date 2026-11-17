# UCL Production Infrastructure, Accounts & Security

Updated: 2026-11-17. **Status: proposed infrastructure plus deployable database/account code; no production Supabase project has been connected.** The current GitHub Pages login and director toggle are browser-local demos, not secure authentication.

## Recommended infrastructure

For a real event, use:
1. A production website with controlled builds, TLS, security headers and monitoring. GitHub Pages can host a static front end temporarily, but browsers are never trusted to decide scores or grant permissions.
2. Supabase Auth + PostgreSQL for managed user identity, private profiles, organization and role memberships, events, tournaments, boards, scores and audits.
3. Trusted server-side APIs / Edge Functions for director invitations, venue operations, all scoring changes, corrections, board pairing, fee processing and bracket advancement. All updates must be version-checked, idempotent, and committed atomically.
4. Authenticated realtime subscriptions that signal committed changes to laptops and separately paired tablets. Clients reload official state after reconnect; no unsynchronized round can advance a real bracket.
5. Separate staging/production deployments, managed email, encrypted secrets, backups with restore drills, MFA for privileged roles, alerts, resource limits, and event-day support playbooks.

Supabase Pro is advertised starting at $25/month plus variable compute, Realtime, storage, email, custom domain and backup/PITR services. A precise launch budget needs device/spectator peak counts, saves per round, and retention needs. Source: https://supabase.com/pricing

## Account and authorization data model

Migration: supabase/migrations/202611170001_account_foundation.sql

- **auth.users**: Supabase-managed authentication (password hashes, email confirmation, recovery, MFA); never put plaintext passwords in UCL's tables.
- **public.profiles**: UUID linked to auth.users, player display name, username, optional city/state/avatar, discoverability. No email, password or security role.
- **app_private.platform_admins**: trusted-provisioned global platform administrators (revocable), not editable by users.
- **public.organizations** and **public.organization_memberships**: one player may simultaneously be a regular player and an owner/director/scorekeeper of one or more organizations. Membership is scoped; it does not grant access to other directors' events.
- **app_private.authorization_audit**: server-appended records of privileged grants and access changes.

Every access decision must be checked on the server against the authenticated user ID and the requested event/organization; RLS is the database defense layer. Signup metadata and localStorage are never authoritative roles.

**User**: manage own profile and registration, view published events/player stats.

**Director**: create/manage tournaments, freeze, flex boards, correct results only within authorized organizations/events.

**Scorekeeper/referee**: limited to assigned scoring rights; no global roster or permissions changes.

**Platform administrator (your account)**: global organization onboarding, moderation, security reviews, director approvals and revocation. Requires verified email and MFA. Provision directly from the trusted SQL console only after the admin identity is verified.

## Account service code
The pre-integration module src/production-account-service.js takes an initialized Supabase JS v2 client and supports:
- email/password signup with confirmation-aware response
- sign-in, sign-out and reset-password initiation
- own profile load and update
- server-evaluated access retrieval through get_my_access
- auth state subscription without granting roles from client state

It is **not connected to the existing demo UI**. Connecting real sign-in to the still-local demo scoring would create a false sense of security. We must first move event and score writes to an authenticated backend.

## Deployment steps (requires project ownership / configuration)
1. Create staging and production Supabase projects under an organization you control.
2. Configure verified-email signup, controlled redirect URLs, password reset, reliable outbound email and privileged MFA. Review abuse rate limits and bot prevention.
3. From a trusted operator environment, run Supabase CLI: supabase login, supabase link --project-ref PROJECT_REF, review migration, then supabase db push.
4. Create and email-verify an actual admin user in the Auth console. Find their exact Auth user UUID. Bootstrap a global administrator in a trusted SQL session only: insert into app_private.platform_admins(user_id) values ('verified-user-uuid'); No fixed credentials or self-service admin registration.
5. Build the production frontend with a pinned Supabase JS dependency. Supply its **URL and publishable key only**; never include service_role, secret API keys, or direct database credentials in web bundles.
6. Add trusted API endpoints for organization and event assignment, director invitations/revocations, transactional scoring, board pairing, corrections, audit revisions, and account deletion requests.
7. Verify staging RLS and end-to-end security tests, conduct multi-tablet venue acceptance tests, then deploy with operational monitoring.

## Security acceptance tests — not yet executed against live Postgres

- Hidden profiles and private org memberships are not exposed to unauthenticated users.
- A player can update only their allowed profile fields; cannot insert themselves as director/admin, edit another profile, or modify the permissions tables.
- Sending role=admin on registration or modifying localStorage does not grant backend capabilities.
- An assigned director in one organization cannot edit another organization's venue.
- Suspended memberships and revoked device sessions are rejected on each subsequent protected request.
- At-most-once round commits, version conflicts, bracket advancement and board release are safe under concurrent tablets.
- Audit rows cannot be edited by ordinary callers and record actor, reason and before/after data.
- Realtime channels are authenticated/scoped, and an offline tablet cannot confirm a result without server acknowledgment.
- Secure headers/CSP, CSRF protections where relevant, robust input validation, replay defense, abuse controls, backup restoration and deletion/privacy procedures pass review.

**Production NO-GO** until authentication, backend scoring and event-level roles are live, policy tests run against a real Supabase project, and a multi-board venue pilot succeeds.

## Related roadmap
- Project Roadmap: PROJECT_ROADMAP.md
- Live Scoring Architecture: LIVE_SCORING_ARCHITECTURE.md
- Director Tournament Epic: DIRECTOR_TOURNAMENT_EPIC.md

## Nationwide deployment and scale strategy (future)
For nationwide availability, move the static UI to a globally distributed CDN hosting provider (for example Cloudflare Pages), keep shared Auth and authoritative Postgres in one US region initially, and use trusted server functions for all match writes. A user in any state should operate against the same protected event records, with organization_id/event_id enforcement at API and RLS layers.

**Scale reads separately from authoritative writes:** Published schedules, player profiles, completed results and public standings should use CDN caching or paginated read views where safe. Directors, tablets and scorekeepers need authenticated private subscriptions per event/board. Spectators need not maintain a WebSocket unless they explicitly watch live scores; use snapshot reads and efficient broadcast messages. A submitted round is official only after its server transaction commits.

**Capacity limits (as published November 2026, verify when launching):** Supabase Realtime Pro capped tier supports 500 simultaneous connections and 500 messages/sec. Pro without spending cap has a documented 10,000 connection and 2,500 messages/sec limit; costs include quotas and usage-based overages. These are platform ceilings, not UCL benchmark results, and must not be interpreted as a guarantee. Relevant docs: https://supabase.com/docs/guides/realtime/limits and https://supabase.com/docs/guides/realtime/pricing.

**Graduated acceptance gates:** Single-venue pilot with 6–12 tablets, then 10, 50, and 100 concurrently active multi-board events, plus 500/2,000/10,000 spectator bursts. Measure p95/p99 API and round-to-screen latency, errors, peak Realtime connections and broadcasts, DB saturation, recovery and isolation. Upgrade compute or split public read workloads only after measurements; consider replica/caching architecture and specialized realtime providers if bottlenecks justify them. Multi-region databases are unnecessary at initial nationwide launch and introduce consistency/operational complexity.

Until the real backend is connected and these tests pass, nationwide operations are a **design target, not a shipped capability**.

## Spectator load and public data isolation
Public spectator traffic must be separated from protected scoring and member data. Serve public result snapshots through a cacheable read model, and restrict director/board operations to authenticated, transactional commands. Even at 5,000 concurrent visitors, **not** every page needs a websocket; direct Realtime fanout to that many clients has independent message/second limitations. Public CDN caches must never contain email, private profiles, membership, fees, payments, tokens or drafts. See [Spectator-First Nationwide Architecture](SPECTATOR_SCALING_ARCHITECTURE.md).

Production performance targets require both distributed (5,000 viewers across many events) and concentrated (5,000 viewers watching one event) load tests, with simulated scoring bursts, reconnection, offline venue and privacy/RLS checks. These are future acceptance tests, not achieved capacity.
