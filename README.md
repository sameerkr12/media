# EmpireX Media

A minimal black-and-gold agency website with an interactive 3D hero and a creator link-in-bio platform.

## Features

- Agency homepage with brand and creator roster
- `/admin`: creator pages, link management, access assignment, click analytics, and CSV export
- `/creator`: creator workspace restricted to the assigned creator
- `/c/[handle]`: one link-in-bio page per creator
- `/r/[slug]`: tracked redirects with pause and expiry support
- Cloudflare D1 persistence and Sites-managed sign-in

## Development

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run db:generate # only after changing the schema
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_melted_iron_lad.sql
npm run dev
```

Apply the migration once to a new local database. Create an ignored `.dev.vars` file containing `ADMIN_EMAIL=seedy@sites.test` for local development. The starter simulates sign-in as that local test account. Production uses Sites-provided authenticated identity headers; configure `ADMIN_EMAIL` as a hosted environment variable for the initial administrator.

Opening the admin dashboard initializes the five supplied creators and their Instagram links. Assign creator sign-in emails in **Creator pages → Portal access**. Site visitor access and application roles are separate; the hosted site is currently private.

## Validation

```sh
npx tsc --noEmit
npm run build
npm start -- --port 8787
# In another terminal, with Python requests installed:
python3 tests/tracker-integration.py
```

The integration test runs only against loopback, uses a separate local D1 database, and checks redirects, uniqueness, bot exclusions, paused links, input validation, CSRF, and creator authorization. Local tests and data are not deployed.

Runtime secrets, databases, generated builds, and local environment files are excluded from version control.
