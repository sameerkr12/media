# EmpireX Media

Agency website with an interactive 3D hero and a creator link-in-bio platform.

## Features

- `/admin`: creator pages, titled links, portal assignments, themes, scoped analytics and CSV export
- `/creator`: workspace restricted to the assigned creator
- `/c/[handle]`: themed public creator page
- `/r/[slug]`: tracked redirects with pause and expiry support
- Supabase Postgres persistence and Sites-managed ChatGPT sign-in
- Google Analytics 4 site tag

## Development

Requires Node.js 22.13 or newer.

1. Run `supabase/migrations/202611020001_empirex.sql` in your Supabase SQL Editor. It creates the tables, private permissions and analytics function.
2. Create an ignored `.dev.vars` file:

```dotenv
ADMIN_EMAIL=seedy@sites.test
ADMIN_PASSWORD=choose-a-strong-password-at-least-12-characters
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-service-role-key
# Or use SUPABASE_SECRET_KEY=sb_secret_... instead.
```

```sh
npm ci
npm run db:check
npm run dev
```

Supabase stores admins, creators, themes, links and click analytics. There is no D1 fallback. Only the server accesses Supabase; anon/publishable keys are not used with the existing ChatGPT identity. Never prefix the server secret with NEXT_PUBLIC_. RLS is enabled and private tables/functions are inaccessible to anon and authenticated Supabase clients.

Local sign-in is simulated as seedy@sites.test. Production uses Sites-provided authenticated identity headers. Configure SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY), and the real ADMIN_EMAIL in the hosted server environment before deploying. Local `.dev.vars` does not configure hosted secrets. Trust identity headers only behind the platform authentication proxy.

Opening the admin dashboard initializes five supplied creators and their Instagram links using conflict-ignore inserts. Assign creator sign-in emails in **Creator pages → Portal access**. Site access and creator roles are separate.

## Schema and existing data

The SQL under `supabase/migrations/` is the authoritative schema, including RLS/grants and the analytics function. `db/schema.ts` describes PostgreSQL tables. Review future generated DDL in `supabase/generated/` before applying it: generated table-only DDL does not include custom functions or permission rules. The old `drizzle/` migrations remain historical D1 records and are no longer applied to the application database.

An exported D1 JSON backup containing admins, creators, links and clicks arrays can be imported with:

```sh
npm run db:import -- path/to/backup.json
```

Import runs in dependency order and ignores existing primary keys. IDs, handles, short codes, timestamps and click hashes are preserved. Keep backups outside Git; the current local backup is at the ignored `.sites-runtime/d1-backup.json`.

## Validation

```sh
npx tsc --noEmit
npm run build
npm start -- --port 8787
# In another terminal:
npm run test:db
npm run test:admin
```

The Supabase suite only targets a loopback application server. It writes disposable QA records in the configured Supabase project and cleans up its records afterward. Existing creator assignments are not changed. Prefer a separate test project for CI. Tests cover titles, themes, redirects, repeat visitors, bot/prefetch/HEAD exclusions, pause, creator-scoped reads/writes, access revocation and anonymous rejection. The Python test entry point forwards to this suite.

Runtime secrets, database backups, generated builds and local environment files are ignored by Git.

## Appearance and analytics

Use **Creator pages → Theme & design**, or the profile strip in the creator portal, to choose from six palettes, three button styles and three fonts. The live preview updates before saving; appearance is independent per creator.

Use **Analytics** on a creator card or the analytics selector to scope charts, link metrics, sources, devices, countries and CSV to one creator. Assigned accounts only receive their own data regardless of query parameters. Click totals include repeats; unique visitors are measured per link using a browser cookie, rather than a deduplicated audience across links. Last-click times use the viewer's timezone; chart days use UTC. Country is supplied by Cloudflare and may be Unknown locally. Cookie blocking or deletion affects unique counts.

## Admin password

Run `supabase/migrations/202611020002_admin_login.sql` in the Supabase SQL Editor, and set ADMIN_PASSWORD to 12–256 characters in the server environment. Admin access fails closed if the password or login-attempt schema is missing. Keep the password in ignored `.dev.vars` for local use and in hosted server secrets for deployment; do not commit it. Restart the dev server after editing local secrets.

Admin users must first sign in through ChatGPT, then unlock at `/admin`. Both the admin page and tracker API enforce the password session, including the admin creator-preview route. Signed sessions are bound to the signed-in user, expire after 8 hours, and use HttpOnly, SameSite=Strict cookies (Secure over HTTPS). The existing Supabase server secret also signs the session; changing that secret or ADMIN_PASSWORD invalidates prior sessions. Lock admin clears the current browser cookie; sign-out also clears it. Ordinary assigned creators continue to use their own portal without the admin password.

Password attempts are limited persistently in Supabase to five per admin account per 15-minute window. Successful login resets the attempt count. Production still requires trusted authenticated-identity headers from the hosting platform.

## VPS deployment

See [deploy/README.md](deploy/README.md) for Linux VPS setup with Docker Compose, automatic HTTPS, runtime secrets, Supabase Auth and operational commands. Build the native production server with `npm run build:vps`; deploy with `sh deploy/deploy.sh` after configuring `.env.vps`. The native VPS runtime validates Supabase Auth sessions and ignores platform identity headers. The original `npm run dev` remains the local Worker preview.

## Admin workspace

The black-and-gold control center includes Overview, Links, Creators and Analytics. Link management supports title/URL search, creator and status filters, newest/most-clicked/title/expiry sorting, pagination, duplicate-link drafts, filtered CSV export, and selection of up to 100 links for bulk pause/resume or copying URLs. Resuming preserves link expiry settings. Bulk changes are authorized server-side for every selected link; creator accounts cannot edit another creator's links.

Creator cards offer Add link, Manage links, Design, Analytics, profile editing and portal assignment controls, plus creator search. The overview includes a creator leaderboard and shortcuts to paused/expired links and portal assignments. Data refreshes every minute. The dashboard uses the shared Supabase database.

Run `node tests/dashboard-utils.test.mjs` for filtering/sorting, and `npm run test:db` for Supabase CRUD, bulk authorization and tracking checks.

## Creator page studio

Open Design on a creator card, or visit `/creator/design` from a creator account. The studio includes inline link titles and URLs, up to five tags per link, drag ordering, keyboard sorting and move up/down buttons. Edit the profile, theme, button style and font alongside a live phone preview. Undo/redo works before saving; Save changes publishes the draft atomically. Hiding a saved link preserves its URL and tracking history. The preview does not record clicks. Concurrent changes produce a reload prompt instead of overwriting another edit.

Apply `supabase/migrations/202611030001_page_builder.sql`, then `supabase/migrations/202611030002_page_builder_conflicts.sql`, in Supabase SQL Editor before deploying this version. Creator accounts can edit only their assigned page; unlocked admins can select any creator. Run `npm run test:builder` for model checks, and `node tests/page-builder-integration.mjs` against the local built Worker for database/API checks using disposable records.

Page Studio design expansion: apply `202611040001_design_options.sql` and `202611040002_design_palettes.sql` in order. Link logos include platform presets, generic finance icons, and custom public HTTPS image URLs. Background styles, palettes and button shapes combine freely. Custom image hosting must allow public image loading.

## Single account sign-in

The current release uses one Supabase email/password login for admins and creators. Only the confirmed account matching server `ADMIN_EMAIL` has admin access; legacy admins-table entries do not grant access. `ADMIN_PASSWORD` and the second unlock screen are retired. Set `ADMIN_EMAIL=business@empirexmedia.com` on the VPS.

Create each creator as a separate confirmed user in Supabase Authentication with their own email and password, then assign that exact email under Admin → Creator pages → Portal access. Give creators `/login` or `/creator`; each account sees only its assigned page and analytics. Unassigned accounts see no creator data. Passwords stay in Supabase Auth, not creator records. Existing account passwords continue working. Earlier two-password instructions in this document are superseded by this section.

## Admin-only workspace

The current version has one main administrator, identified by `ADMIN_EMAIL`. Creator portal sign-in, email assignments and creator password controls are retired. All private dashboard and page-builder requests require this owner account, including requests from previously signed-in creators. Public creator pages and click tracking continue to work. Existing Auth records are not deleted, but non-owner accounts cannot use this application. Forgot password is available only for the main admin. Earlier creator-access instructions are superseded.

## Public accounts and self-service pages

This release supersedes the admin-only model. Anyone can register at `/login`, confirm their email, then choose a unique handle at `/create-page`. Each account owns one creator page; server-side checks scope links, designs and analytics to its authenticated user. The verified account matching `ADMIN_EMAIL` remains the sole full-access admin. Existing creator assignments remain supported.

Before public launch enable Supabase new-user signups and Confirm email, configure production SMTP, and allow `/login` and `/reset-password` redirect URLs for both the production origin and local testing origin. Keep the default confirmation email template using ConfirmationURL. Supabase handles email verification and authentication rate limits. The application does not treat user metadata as authorization. No new SQL migration is required: unique user, email and handle indexes already exist.
