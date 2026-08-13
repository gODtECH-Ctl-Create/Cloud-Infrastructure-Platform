# Waste to Work — backend export

A complete, self-contained bootstrap of the Waste to Work backend: schema, security, business logic and starter data. Run it against an **empty** Supabase project to reproduce the live backend exactly.

## Run order

Open your Supabase project → SQL Editor → paste each file's full contents and run, **in this order**:

| # | File | What it does |
|---|------|--------------|
| 1 | `01_schema_rls.sql` | Enums, shared triggers, all 14 tables, sequences (incl. the `WTW-000001` customer-code sequence), indexes, GRANTs, RLS enabled on every table, and all policies. |
| 2 | `02_functions_triggers.sql` | Role bootstrap (`claim_first_admin`), allowance/rollover logic, rate resolution, session lifecycle (`start_session`, `pause_session`, `resume_session`, `extend_session`, `end_session`), branch/global pause. |
| 3 | `03_function_grants.sql` | Locks down EXECUTE on helper and internal functions. Must run **after** 02, since the revokes have to land last. |
| 4 | `04_seed.sql` | Default branch, starter subscription plans, base pricing rates, and the `global_pause` system setting row. |

Notes:

- `01_schema_rls.sql` starts with a guard that aborts loudly if Waste to Work tables already exist, so it cannot clobber a populated database.
- Run each file in full — do not run partial selections, since order within a file matters (create → grant → enable RLS → policies).
- Money is stored in integer minor units. All time and money logic is server-authoritative inside the SQL functions; nothing is trusted from the client.

## Create the first admin

There is deliberately no seeded admin account.

1. Deploy/point the app at the new project (see below) and open `/auth`.
2. Sign up the owner account with email + password (or Google, once configured). The `on_auth_user_created_staff` trigger creates the matching `staff_profiles` row automatically.
3. While signed in as that account, run once in the SQL Editor **or** call the RPC from the app:

   ```sql
   select public.claim_first_admin();
   ```

   Run from the SQL editor it needs an authenticated context, so the reliable path is calling it from the app while signed in (the app does this on first load if no roles exist). It returns `true` on the first successful claim and `false` forever after — it self-locks as soon as any row exists in `user_roles`.
4. Verify: `select * from public.user_roles;` should show one `admin` row for the owner.
5. All further roles (`manager`, `attendant`) are granted by that admin from inside the app.

## Auth settings to mirror

In your Supabase project → Authentication:

- **Site URL** — your app's canonical URL (e.g. `https://your-app.example.com`). Use the deployed URL, not `localhost`.
- **Redirect URLs** — add every origin the app is served from, each with `/**`:
  - `https://your-app.example.com/**`
  - your preview/staging URL, if any, `/**`
  - `http://localhost:8080/**` for local development
- **Email provider** — enabled. Email confirmations **on** (production default). Leave auto-confirm off unless you accept unverified addresses.
- **Anonymous sign-ins** — disabled.
- **Leaked-password protection** — enabled.
- **Google provider** — enable it and paste your Google OAuth client ID and secret. In the Google Cloud console, the authorized redirect URI is `https://<your-project-ref>.supabase.co/auth/v1/callback`. OAuth must return to a public same-origin URL (`<site url>` or `<site url>/auth/callback`) — never directly to a protected route.
- No other providers are required.

## Pointing the app at your project

Nothing in `src/` hardcodes a project reference, so repointing is environment-variables only:

| Variable | Used by |
|---|---|
| `VITE_SUPABASE_URL` | browser client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser client |
| `VITE_SUPABASE_PROJECT_ID` | browser client |
| `SUPABASE_URL` | server functions |
| `SUPABASE_PUBLISHABLE_KEY` | server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | privileged server-only paths |

The publishable/anon key is safe to expose. The service-role key is server-only — never put it in a `VITE_` variable, never return it from a server function, never log it.

`src/integrations/supabase/*` is generated code; leave it untouched. On a fresh Lovable project connected to your own Supabase account, those files regenerate against your schema.

## Verification status

The export was diffed against the live migration history: tables, functions, policies and triggers all match one-for-one, and no key, password, or project identifier appears in any exported file.
