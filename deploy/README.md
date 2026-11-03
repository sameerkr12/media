# Deploy EmpireX on a VPS

This deployment uses the native Next.js standalone Node server, Supabase Postgres/Auth, and Caddy for HTTPS. It does not run Wrangler or a development server in production. The existing Vinext/Worker local workflow remains available.

## Prerequisites

- A Linux VPS with Docker Engine and the Compose plugin installed. See https://docs.docker.com/engine/install/ubuntu/ for the official Ubuntu setup.
- A domain whose A record points at the VPS IP. Set an AAAA record only if IPv6 is working on the server.
- Ports 80/tcp and 443/tcp open for HTTP and HTTPS. 443/udp is optional for HTTP/3. Keep the app's port 3000 private. Allow SSH before changing firewall rules.
- Supabase SQL migrations `202611020001_empirex.sql`, `202611020002_admin_login.sql`, `202611030001_page_builder.sql` and `202611030002_page_builder_conflicts.sql` (in order) applied in the project's SQL Editor. Existing Supabase data stays in place.

## Configure Supabase sign-in

The VPS cannot use the Sites/ChatGPT identity proxy. It uses Supabase Auth email/password instead; forged oai-authenticated-user headers are ignored by the native Node runtime.

1. In Supabase Authentication → Users, create your real admin account and confirm its email. Set a strong account password.
2. Set ADMIN_EMAIL to exactly that account's confirmed email in `.env.vps`.
3. Create confirmed Auth accounts for creators and assign their emails under Admin → Creator pages → Portal access. Existing link pages and links do not need new IDs.
4. Disable public sign-ups if the project is only for invited staff/creators. Set the Supabase Auth Site URL to the production origin.
5. The **account password** signs a user in at `/login`. The separate **ADMIN_PASSWORD** then unlocks the admin console. Reuse your generated local admin password if desired by copying it directly into the VPS secret file.

The application does not auto-create Auth accounts or email credentials. Sessions use an HttpOnly access-token cookie, validated with Supabase on the server, and require signing in again when the access token expires (at most one hour). The admin unlock session is additionally bound to that user. Password attempts for the extra admin gate are throttled persistently in Postgres; Supabase handles Auth sign-in limits.

## First deployment

```sh
git clone https://github.com/sameerkr12/media.git empirex
cd empirex
cp deploy/env.vps.example .env.vps
chmod 600 .env.vps
nano .env.vps
```

Fill in every placeholder:

- SITE_DOMAIN: the bare hostname, such as media.yourdomain.com.
- ACME_EMAIL: your email for TLS certificate notices.
- APP_URL: the exact public HTTPS origin, such as https://media.yourdomain.com. It must match SITE_DOMAIN.
- ADMIN_EMAIL and ADMIN_PASSWORD: your confirmed admin Auth email and the separate admin unlock password (12–256 characters).
- SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY), and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).

Keep real secrets only in `.env.vps`. It is ignored by Git and excluded from Docker builds. Runtime secrets are injected when the container starts. Quote values containing spaces or # using Compose env-file syntax. Use a random password without dollar signs to avoid Compose interpolation surprises.

```sh
sh deploy/deploy.sh
docker compose --env-file .env.vps ps
```

Caddy obtains and renews TLS certificates automatically once DNS and ports are correct. The application must pass startup validation and health checks before Caddy starts. Open `https://YOUR_DOMAIN/`, `/login`, and `/admin` to verify. `/api/health` checks the running app process; it does not promise upstream Supabase availability.

## Updates and operations

```sh
git pull --ff-only
sh deploy/deploy.sh
docker compose --env-file .env.vps logs --tail=100 app
docker compose --env-file .env.vps logs --tail=100 caddy
# Recreate containers after changing secrets:
docker compose --env-file .env.vps up -d --force-recreate
# Stop while preserving certificate volumes:
docker compose --env-file .env.vps down
```

Do not add `-v` to down unless you intend to remove Caddy's certificate state. Configure Supabase backups in Supabase; the app containers have no database files. Git history can restore application code, but schema changes need their own rollback plan. This is a single-VPS setup; rebuilds can briefly interrupt service.

For sign-in errors, confirm Auth users are verified and email/password sign-in is enabled. For locked admin access, check ADMIN_EMAIL, ADMIN_PASSWORD and the login migration. For 403 errors on forms, ensure APP_URL and the browser's HTTPS origin match. Never expose the old mock-auth dev server to the internet.

## Optional native Node deployment

Behind an existing HTTPS reverse proxy, you can use Node.js 24 without Docker:

```sh
npm ci
npm run build:vps
npm run start:vps
```

Create the same `.env.vps` first. The native start command binds to 127.0.0.1:3000 and validates settings. Use systemd or another process supervisor with the repository as WorkingDirectory and an unprivileged user. Route your reverse proxy to that loopback port; preserve Host and use APP_URL for the public HTTPS origin. Do not use npm run dev or npm start for production (those are the Worker preview workflow).

## Verification

```sh
node tests/vps-config.test.mjs
npm run build:vps
npm run test:vps
```

The full integration test requires local `.dev.vars` with Supabase server/anon keys and ADMIN_PASSWORD. It starts the native server on loopback port 3001, creates one disposable confirmed Auth user, verifies real login, header-spoofing denial and the admin password gate, then removes the test user. Run against a test Supabase project for regular CI. No emails are sent by this test.

For the expanded Page Studio, also apply `202611040001_design_options.sql` then `202611040002_design_palettes.sql` before deploying.
