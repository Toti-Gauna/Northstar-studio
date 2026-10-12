# Local and deployment runbook

## Installation and development

From repo root, Node 22+ and npm. Actual verification runtime: Node 24.19.0.

```bash
npm ci
cp .env.example .env
docker compose up -d db
npm run db:migrate
npm run dev
```

Web `http://localhost:3000`; API `http://localhost:4000`. Docker uses project `northstar-studio`, private volume `northstar-db` and host loopback port 5434; it does not use Handy. Browser session creates its own workspace/seeds. `npm run db:seed` creates an additional diagnostic workspace, never truncates/clears the DB and does not attach a browser cookie.

To run the exported frontend and compiled API:

```bash
npm run build
npm run serve
```

Use a separate terminal for `npm run worker` after build. Worker is required for durable reminder notifications and materialized expiry states; acceptance/auth still reject expired records when it is stopped. Stop owned dev servers before starting compiled ones on the same ports.

## Real environment variables

| Variable | Purpose/local default |
|---|---|
| DATABASE_URL | Required independent PostgreSQL connection; local example localhost:5434/northstar |
| PORT | API bind port, 4000 |
| WEB_ORIGIN | Required exact frontend origin, localhost:3000; no comma wildcard |
| NEXT_PUBLIC_API_URL | Public frontend API base, compiled into static bundle; never a secret |
| COOKIE_SECURE | false only for local HTTP; production requires true |
| COOKIE_SAME_SITE | lax default; none requires Secure and compatible browser cross-site policy |
| DEMO_TTL_HOURS | Workspace/session TTL, 24; accepted range 0.01–720 |
| DEMO_MAX_LEADS | Per workspace requests including 12 seeds, default 100 |
| DEMO_MAX_FILES | Per workspace attachment count, 40 |
| DEMO_STORAGE_BYTES | Private attachment + generated proposal PDF quota, 20 MB; overall filesystem capacity also needs monitoring |
| STORAGE_DIR | Private filesystem path; `./storage` relative to API cwd locally; absolute mounted disk in deployment |
| STORAGE_DURABLE | Explicit persistence acknowledgement; required true with production NODE_ENV |
| WORKER_INTERVAL_MS | Reconciliation interval, 60000, minimum 1000 |
| TRUST_PROXY_HOPS | 0 locally; reviewed reverse proxy hop count (0–2), 1 in prepared Render config |
| NODE_ENV | Standard runtime production guard; production rejects insecure cookie/non-durable storage declaration |
| NEXT_TELEMETRY_DISABLED | Optional Next build tooling preference, not application business configuration |

There are no owner bootstrap credentials or API keys to invent. Demo operator is not a global owner. Env is validated on startup; passwords/cookies must not enter public variables, logs or tracked files.

## QA

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
node scripts/lighthouse.mjs
```

Tests require migrated PostgreSQL and write only their own isolated workspaces. Integration teardown deletes only test-created workspace IDs. E2E starts/reuses local servers; tests run against `apps/web/out` with real CSP headers from the supplied Node static preview helper, not Next dev. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` may select a local Chromium path; otherwise the config uses `/usr/bin/chromium` when present or installed Playwright Chromium. Lighthouse script needs Chromium and local web/API. Rebuild before testing frontend changes.

## Reset, expiry and retention

UI reset confirms the own workspace action and revokes all its sessions; starting again creates a fresh workspace. Old IDs cannot be used. It does not clear the entire DB. TTL is checked in auth/transactions; reconciliation marks expired and invalidates sessions. Historical rows and files are retained inaccessible for review. Before production, define retention and implement reviewed storage garbage collection, monitor overall sessions/PDF bytes and strengthen distributed abuse limits. Do not advertise automatic deletion/production malware scanning.

## Publication preparation only

Hostinger/Pages: upload only `apps/web/out`; keep directory routes and query parameters. Set NEXT_PUBLIC_API_URL to the real reviewed API origin before build. Generated `_headers` contains CSP hashes and fetch origin; the build also emits an Apache `.htaccess` with equivalent headers; review Hostinger support before upload. Never upload `.env`, storage, server source/dependencies or DB dumps to public web hosting.

Render: `render.yaml` prepares compiled Node API, migrations, readiness and a private persistent disk. It is a configuration artifact, not a deployment. Its plan/disk incur cost if applied; Ignacio must review before provisioning. The API build includes dependencies; start `node apps/api/dist/index.mjs`, migrate `node apps/api/dist/migrate.mjs`. Run `node apps/api/dist/worker.mjs` in a separate reviewed worker/scheduler with the same independent DB and origin config. Reminders/expiry need DB only. A shared multi-instance file topology requires a storage adapter/design review; the prepared disk is single-node storage.

Neon: supply a new independent PostgreSQL URL, TLS verified. No Neon project/account was created or connected. Back up before migrations. Use same-site HTTPS subdomains (e.g. studio.<reviewed-domain> and api.<reviewed-domain>) for reliable Secure/Lax cookies. Cross-site Hostinger/Render default domains may require SameSite=None and face browser cookie restrictions; this deployment combination has not been verified. Do not disable CSRF/CORS to bypass it.

## Backup and rollback

Back up the independent database with PostgreSQL tooling and the entire private STORAGE_DIR together; quote PDF/attachment metadata references those files. Protect dumps like private data. Capture app commit/build/env selection, migration journal and disk snapshot. Restore into a separate Northstar DB/storage location and verify file hashes/permissions/one-project acceptance before switching service config.

Rollback frontend/API to a prior reviewed artifact. Migrations are additive but snapshots/constraints are business-critical; no blind down migration or destructive `reset` is supplied. Restore a reviewed backup if a DB rollback is necessary. Never run `docker compose down -v` against a shared project name or a Neon/Handy database. No automatic production deployment is configured in CI.
