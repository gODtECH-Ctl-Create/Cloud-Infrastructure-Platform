# Move Waste to Work onto your own Supabase project

## The one constraint to know first

This project currently runs on Lovable Cloud, which is a managed Supabase instance. Cloud cannot be detached from a project once it's enabled — so the way to end up on a Supabase project you own is:

1. Prepare a complete, self-contained export of the backend (schema, functions, triggers, security rules, seed data) inside this project.
2. Run that export against your own Supabase project.
3. Point the app at your project using environment variables — either in a fresh Lovable project connected to your Supabase account, or in your own hosting (Vercel/Netlify/self-host) from the GitHub repo that's already synced.

Steps 1 and 2 are what I'll do here. Step 3 needs one decision from you at the end (fresh Lovable project vs. your own hosting), and your Supabase project URL + keys.

## What gets exported

The backend already exists as four migration files in the repo (about 720 lines total). I'll consolidate them into a single ordered bootstrap script plus a seed script so your project comes up in one run:

- `supabase/export/01_schema.sql` — enum types, all 14 tables, sequences, indexes, and the `WTW-000001` customer-code sequence.
- `supabase/export/02_grants_rls.sql` — table grants for `authenticated` / `service_role` (and `anon` only where a public read policy exists), RLS enabled on every table, and every policy.
- `supabase/export/03_functions_triggers.sql` — the role helpers (`has_role`, `is_staff`, `is_manager`), time/money logic (`start_session`, `end_session`, `pause_session`, `resume_session`, `extend_session`, `ensure_weekly_allowance`, `resolve_rate`), branch/global pause, `claim_first_admin`, the customer-code and `updated_at` triggers, and the `auth.users` → `staff_profiles` trigger.
- `supabase/export/04_seed.sql` — default branch(es), starter subscription plans, base pricing rates, and the `global_pause` system setting row.
- `supabase/export/README.md` — exact run order, how to create the first admin, and Auth settings to mirror (email confirmations, Google provider, redirect URLs, site URL).

Every `CREATE TABLE` keeps its GRANT block in the same file, in the required order (create → grant → enable RLS → policies), so the Data API works immediately on your project.

## Verification before handoff

- Re-read the four existing migrations line by line and confirm the export reproduces every table, column, default, constraint, policy, grant, function and trigger currently live — nothing invented, nothing dropped.
- Confirm the export is idempotent-safe to run on an empty project and fails loudly (not silently) if run against a non-empty one.
- Confirm no service-role key, database password, or project-specific identifier is baked into any exported file.

## Application wiring notes (included in the README, not applied yet)

- Client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; server code reads `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Nothing in `src/` hardcodes a project ref, so repointing is env-only.
- `src/integrations/supabase/*` is auto-generated and stays untouched; on a fresh Lovable project connected to your Supabase account these files regenerate against your schema.
- First admin: sign up the owner account, then call `claim_first_admin` once — it self-locks after the first role row exists.

## What I will not do

- No new GitHub repository, no disconnecting or reconfiguring the existing one.
- No changes to `src/` application code in this step.
- No attempt to fake a Cloud disconnect on this project.

## Technical notes

Export lives under `supabase/export/` so it's versioned in the repo you already sync, and is kept separate from `supabase/migrations/` so Lovable Cloud's migration history is not disturbed. Money stays in integer minor units, all time logic remains server-authoritative inside the SQL functions, and `SECURITY DEFINER` functions keep `SET search_path = public`.

Stopping after the export is verified — I won't repoint the app or continue feature work until you pick the hosting route and provide your project's URL and keys.
