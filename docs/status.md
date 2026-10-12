# Northstar Service Studio — construction

Repository: Toti-Gauna/Northstar-studio, initially empty. The three supplied Notion sources were fetched on 2026-10-12. The user's current specification takes precedence over historic priority and implementer assignments.

Current step: final QA/documentation/clean checkout verification. No deployment or external infrastructure created. No other projects touched.

Stack: npm workspaces, TypeScript, Next static export, Express, PostgreSQL 17, Drizzle. Docker daemon available. Node observed: 24.19.0.

Implemented: public web, guided brief/server draft/estimate/uploads, client/operator portals, proposal drafts/sent immutable versions/alternatives/diff/PDF, exact acceptance and transaction handoff, CMS, brand/sector/language/currency/timezone, local inbox/outbox/worker/activity/analytics, tour/card, prepared deployment and CI.

Last checks: lint/typecheck/build passed; 25 domain/DB tests passed (9 domain + 16 integration). All five Playwright scenarios passed against compiled API and static export with real CSP headers. Axe home/brief/operator zero violations (home has one incomplete item requiring human interpretation). Compiled migration runner and readiness checked. Latest Lighthouse reports and recording are in evidence; final clean checkout verification in progress.

Active local services at time of writing: compiled API 4000, static export+CSP server 3000, dedicated Docker PostgreSQL 5434. No GitHub push or deployment. Remaining: clean-clone install/fresh DB verification and final video/documentation recording. No access blocks the local demo. Production origins/cookies/Neon/Render/durable disk/retention and identity/invitation policy require Ignacio review; no provisioning is authorized in this task.
