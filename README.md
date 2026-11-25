# StayBridge Hospitality

StayBridge is a Next.js hospitality marketplace with a Supabase/PostgreSQL backend. Public property pages only show approved, active listings. Partner verification documents stay in a private Storage bucket.

## Run locally

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set the project URL and public anon/publishable key:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
   PUBLIC_REGISTRATION_ENABLED=false
   ```

   Never put a Supabase service-role/secret key in a `NEXT_PUBLIC_` variable, the browser, or source control.
3. Apply migration files in `supabase/migrations/` in filename order using the Supabase SQL editor or Supabase CLI. If the initial migration was already run directly in the SQL editor, also apply `202611140002_grant_anon_rls_helpers.sql`. SQL editor runs are not recorded in CLI migration history, so reconcile the initial migration before using `supabase db push`.
4. Start the development server:

   ```powershell
   npm.cmd run dev -- --webpack --hostname 127.0.0.1 --port 3000
   ```

5. Open `http://127.0.0.1:3000`. Browse approved stays at `/discover`; the partner workspace is `/partner/dashboard`; the protected admin portal is `/admin`.

The local project uses the webpack build because Turbopack's native SWC binary is incompatible with some Windows installations. Validate changes with:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npx.cmd next build --webpack
```

## Provision administrators

1. Create the intended administrator accounts through Supabase Auth and verify their email addresses.
2. In the Supabase SQL editor, promote only trusted accounts. Replace the example email with the exact account email:

   ```sql
   update public.profiles
   set role = 'super_administrator'
   where email = lower('admin@example.com');
   ```

   To provision a second administrator, use `administrator` unless they need super-administrator security-check management.
3. Sign in at `/login`, open `/admin`, and enroll an authenticator app. Administrator data and decisions require AAL2 (MFA).
4. The initial security-check records are intentionally all `passed = false`. A super-administrator must complete and document the checks before public registration can be authorized.

To authorize the two founders after their accounts are provisioned, use the Supabase SQL editor and replace the example addresses:

```sql
insert into public.founder_authorizations (slot, profile_id)
select 1, id from public.profiles where email = lower('founder-one@example.com')
on conflict (slot) do update set profile_id = excluded.profile_id;

insert into public.founder_authorizations (slot, profile_id)
select 2, id from public.profiles where email = lower('founder-two@example.com')
on conflict (slot) do update set profile_id = excluded.profile_id;
```

Both distinct founders must then sign in with MFA and record approval in `/admin`. The server-side `PUBLIC_REGISTRATION_ENABLED` flag must also be set to `true`; registration stays closed unless the flag, all required security checks, and both founder approvals are satisfied. Do not mark checks complete or enable registration until the corresponding controls have actually been implemented and tested.

## Application workflow

- Partners sign up only while public registration is open, verify their email, then submit property details at `/partner/dashboard`.
- Partners upload property photos and verification documents through the authenticated upload route. The server validates file size, declared type, and file signature.
- Administrators review submissions at `/admin`. Review decisions use the database transaction, application version, MFA and role checks. Approval requires at least one photo and one verification document; the listing becomes public only after approval.
- Signed links for private files expire after five minutes. Public property photos are served with short-lived signed URLs.
- Public registration is disabled by default. Keep it disabled until the security, legal, backup, rate-limit, and independent-review launch checks have been completed.

## Important limitation

This repository contains the application and migration, but cannot connect to a real Supabase project until you configure `.env.local` and apply the migration. The example environment file contains placeholders only. Do not share service-role credentials in chat.
