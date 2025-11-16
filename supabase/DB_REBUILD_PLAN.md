# HSE Hub Database Rebuild Plan

The goal is to replace the stack of emergency SQL patches with a single, authoritative migration that can be deployed to any Supabase project and provide every feature required by the web app. Below is a pragmatic plan to get there without putting production data at risk.

## 1. Snapshot & Archive the Current State
1. Run a full schema dump from the environment that currently works best:
   ```bash
   npx supabase db dump --db-url "postgresql://USER:PASSWORD@HOST:PORT/postgres"
   ```
2. Move all legacy patch files out of `supabase/migrations/` and into a dated archive so the Supabase CLI stops replaying them:
   ```text
   supabase/migrations_backup/2025-11-16/
     ├─ 20251114160236_5da6f4a0-a62c-4638-b356-df4d183aeff4.sql
     ├─ ...
     └─ 20251117000006_get_company_context.sql
   ```
   (The files remain available for reference but no longer participate in new deployments.)

## 2. Define the Canonical Schema
1. List every feature surfaced in `src/pages` (Activity Groups, Audits, Documents, Employees, Incidents, Measures, Messages, Reports, Risk Assessments, Settings, Tasks, Training, Super Admin tooling, etc.).
2. For each feature, document the required tables, relations, enums, and policies. Existing guides like `ENHANCED_IMPLEMENTATION_GUIDE.md`, `COMPLETE_FIX_GUIDE.md`, and `FINAL-FIX-REGISTRATION.md` already capture many of these details—merge them into a single checklist.
3. Author a new migration file (for example `20251118000000_full_hse_schema.sql`) that:
   - Creates all tables/enums/sequences with explicit `IF NOT EXISTS` guards.
   - Seeds lookup tables (statuses, measure types, etc.).
   - Defines security definer helpers (`create_company_with_admin`, `get_company_context`, `fix_my_company_link`, etc.).
   - Re-creates RLS policies in a consistent manner (company members, super admins, service roles).
   - Adds grants for `authenticated`, `anon`, and `service_role` where needed.
4. Keep the script idempotent so it can run safely in dev/staging multiple times.

## 3. Automated Verification
1. After running the new migration locally (`supabase db reset`), run `npm run test`/`npm run build` to ensure the front-end compiles against generated types.
2. Use Supabase CLI tests:
   ```bash
   npx supabase db lint
   npx supabase db diff --linked
   ```
3. Regenerate TypeScript types so the client matches the canonical schema:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
   ```

## 4. Deployment Rollout
1. Apply the new consolidated migration to staging first. Validate:
   - `AuthContext` can fetch `company_id`/`role` using the `get_company_context` RPC.
   - `SetupCompany` successfully provisions a company via `create_company_with_admin`.
   - Feature pages (Employees, Incidents, etc.) can read/write their data.
2. Once validated, apply the migration to production. Keep the archive in git for traceability but remove it from the active `supabase/migrations` folder.

## 5. Optional Enhancements
- Add a `supabase/tests/` suite with pgTAP or SQL test scripts to prevent regressions in RLS/policies.
- Wire a CI step (GitHub Actions) that runs `supabase db lint` plus the app’s unit tests whenever SQL files change.

---
**Next step:** Confirm which Supabase project currently has the most accurate data, dump that schema, and start consolidating the SQL into the new `full_hse_schema.sql`. Once that file exists, we can safely delete the pile of emergency patches and rely on a single source of truth.
