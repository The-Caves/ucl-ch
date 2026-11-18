# Environment Variables and Secret Handling — UCL

Updated 2026-11-17. **No credentials, tokens or passwords are stored in this repository.**

## Separate project
UCL must use a **new Supabase project**, not the existing unrelated Supabase project. Each project has its own Postgres database, Auth tenants, API keys, security policies, functions and logs. Initially create a UCL **staging** project; create a separate production project when a real launch is approved. The existing account/organization may host both projects, but confirm the owning organization and any project costs before provisioning.

## What is currently in GitHub
- `.gitignore` excludes `.env`, `.env.*`, installed packages and Supabase temporary CLI state; it allows the example template.
- `.env.example` has **blank, browser-safe** URL/publishable-key placeholders only. It contains no credentials and may be committed.
- **No real `.env` is committed or created**. Copy `.env.example` to your own local `.env` only if local tooling requires it, and fill values directly on your device, never in a chat.
- The current GitHub Pages application is plain static JavaScript with no frontend build step; adding `.env` does **not** currently connect the application to Supabase. We must add a bundler/config-loading step or a safely generated public runtime configuration before browser use. Never expose server-side variables to the browser.

## Credentials by responsibility

| Value | Client-side? | Storage / use |
| --- | --- | --- |
| Supabase URL | Yes | Local env or hosting build/runtime public configuration |
| Supabase **publishable** key (`sb_publishable_...`) | Yes | Local env / configured public frontend; RLS must enforce access |
| Supabase **secret** key (`sb_secret_...`) | **No** | Supabase Edge Function or server-only hosted secrets manager |
| Database password / connection string with password | **No** | Trusted operator environment, never GitHub source or browser |
| Supabase OAuth connector credential for ChatGPT | **No** | Managed by the authorized connection; do not copy or paste tokens into chat |
| Staging test emails/passwords | **No** | GitHub **staging** Environment secrets, dedicated fictional test accounts only |
| Platform-admin/bootstrap credentials | **No** | Trusted Supabase operator console; do not put admin bypasses into signup code |

A publishable key is intentionally visible to public browsers. It does **not** grant admin rights and is safe only when the associated database roles and RLS policies are correctly implemented. Never place secret/service-role credentials under frontend public variable prefixes. Supabase is migrating from legacy `anon`/`service_role` keys to publishable/secret keys in 2026; prefer the new key types for newly created projects.

## Secure project connection
ChatGPT's authorized Supabase connection can operate on the new staging project through the provider; it does not require pasting a personal access token or database password in the chat.

For GitHub Actions staging smoke tests:
1. Create GitHub Environment **staging** (repository Settings → Environments).
2. Add GitHub Environment secrets directly in the GitHub UI: `UCL_STAGING_URL`, `UCL_STAGING_PROJECT_REF`, `UCL_STAGING_PUBLISHABLE_KEY`, `UCL_STAGING_PLAYER_EMAIL`, `UCL_STAGING_PLAYER_PASSWORD`.
3. Optional: `UCL_STAGING_DIRECTOR_EMAIL`, `UCL_STAGING_DIRECTOR_PASSWORD`, `UCL_STAGING_PRIVATE_PROFILE_ID`.
4. Set repository Actions variable `UCL_STAGING_READY=true` **only after** the database migration, dedicated users, and RLS policies are actually verified.
5. Keep production keys and credentials in a separate production environment with restricted deployments and approval controls.

The staging workflow uses project-ref pinning and **read-only** Auth/RLS smoke checks. It does not run without configuration, cannot provision the project, and should not run with a real person's credentials.

## Before live access
- Review schema and RLS in the new UCL staging project; run integration tests with different player/director identities.
- Build authoritative event/match/round and spectator-read backend; do not trust `localStorage` demo director toggles.
- Test a director laptop, separate board tablet and anonymous spectator phone.
- Enable MFA for elevated accounts, email confirmations, HTTPS, backups and logging.
- If a secret is ever accidentally committed, **rotate it** and treat Git history/cache as potentially exposed; adding `.gitignore` later cannot undo that exposure.

Source guidance: https://supabase.com/docs/guides/getting-started/api-keys and https://supabase.com/docs/guides/local-development/managing-config
