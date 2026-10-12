# Northstar — Service Studio

D01 · Eclipse demo. Fictional company and sample data. Full-stack service acquisition, versioned proposals and project handoff. Built in the existing `Toti-Gauna/Northstar-studio` repository. No hosting or external infrastructure has been provisioned.

## Run locally

Requires Node 22+ (verified with 24.19.0), npm and Docker Compose.

```bash
npm ci
cp .env.example .env
docker compose up -d db
npm run db:migrate
npm run dev
```

Open **http://localhost:3000**. API: **http://localhost:4000**. Each browser cookie jar automatically receives a separate PostgreSQL demo workspace, synthetic seeds and a 24-hour TTL. No production credentials are seeded. The visible role selector switches among four identities approved by the server inside that workspace.

Choose a service/package → submit a synthetic brief/document → note the request ID → switch to operator → qualify/draft/send V1 → switch to client and comment → operator sends V2 → client compares/accepts one option → open project/tasks and download PDF → reload. A second browser context cannot access the first workspace.

```bash
npm run worker          # after build; durable local reminders and expiry, no emails
npm run build          # compiled API/worker/migrator + static frontend + hosting headers
npm run serve          # API and real static export, ports 4000/3000
npm run db:seed        # optional: creates one isolated diagnostic workspace, never clears DB
npm run lint
npm run typecheck
npm run test           # domain + PostgreSQL HTTP integration/concurrency
npx playwright install chromium
npm run test:e2e       # requires build + migrated DB; starts servers if absent
node scripts/lighthouse.mjs  # requires both local servers and Chromium
```

Stop `dev` before `serve`. Use `docker compose stop` to preserve DB; do not remove its volume unless you deliberately want to discard this project's entire local DB.

## Architecture and review

Next.js static routes load published content and authorized records from Express. PostgreSQL/Drizzle stores business data; filesystem storage is private and persists locally. Sent versions and PDF bytes are frozen. Acceptance, one exact option, lead won, project, milestones, tasks, audit and local outbox/inbox commit together.

English/Spanish dictionaries and three catalogs share the same screens. Brand/profile/currency/timezone can be previewed and saved in the operator workspace. Historical snapshots remain unchanged. ARS prices are independent catalog values; no exchange rate is implied.

Documentation: [scope](docs/scope.md), [architecture](docs/architecture.md), [API](docs/api.md), [runbook](docs/runbook.md), [QA](docs/qa-report.md), [status](docs/status.md), [integration matrix](docs/integration-matrix.md), [customization](docs/customization-playbook.md), [90-second demo script](docs/demo-script.md). Actual browser captures, a generated PDF and a [71-second recording](docs/evidence/northstar-demo.mp4) are in [docs/evidence](docs/evidence).

This is a local demo for Ignacio's review. External messaging, payments, certified signatures, production accounts, hosted URLs and commercial results are not provided. Review deployment origins/cookies, durable storage, retention, costs and production identity needs before sharing publicly.
