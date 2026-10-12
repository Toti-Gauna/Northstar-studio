# QA report — local demonstration

Date: 2026-10-12 UTC. No deployment, external infrastructure or messages. All datasets are synthetic. This is a demo for Ignacio's review, not a certification or production approval.

## Environment

- Node 24.19.0 / npm 11.9.0; PostgreSQL 17.11 in dedicated `northstar-studio` Docker Compose.
- Chromium 154.0.8037.57 on Debian 13. Playwright 1.64.0.
- Next 16.4.0 static export, React 19.3.0, Express 5.3.0, Drizzle 0.45.4, GSAP 3.15.0; installed lockfile is authoritative.
- Web localhost:3000 (real exported files + generated CSP), compiled Node API localhost:4000, DB loopback:5434.

## Executed checks

| Command | Result |
|---|---|
| `npm install` / migrations / `npm run db:seed` | Executed against dedicated local PostgreSQL; seed creates isolated workspace, never clears DB |
| `npm run lint` | Passed, application/source only; generated test reports excluded |
| `npm run typecheck` | Passed API/web/shared contracts |
| `npm run test` | 25 passed: 9 domain/config/format tests + 16 PostgreSQL HTTP integration cases |
| `npm run build` | Passed compiled API/worker/migrator, ten exported routes plus 404, CSP hashes and Hostinger/Pages headers |
| `node apps/api/dist/migrate.mjs` | Executed successfully; compiled API/readiness also started and checked |
| `npm run test:e2e` | Six scenarios; final clean-checkout result recorded below |
| `npm audit --omit=dev` | Last observed: 0 reported production vulnerabilities after ORM update |
| `node scripts/lighthouse.mjs` | Actual JSON reports in evidence; final repeated score table recorded below |

Video is recorded (71.48 seconds). Clean checkout verification details are recorded below. Earlier failures were corrected and rerun: initial fixed-price test selected a random catalog row, a disabled-task selector was wrong, language navigation/autosave had genuine issues, contrast during reveal and responsive labels/layout needed fixes, and intercepted HTML caused Chromium loopback policy failure. CSP is now tested through real HTTP headers without weakening CORS/CSRF. CMS QA targets the active Digital profile rather than a random item from other catalogs.

## Meaningful verified behavior

Continuous new ID across customer/operator/reload; concurrent submit dedupe and changed-key conflict; same-email customers distinct; role/workspace/ownership checks for lead/quote/PDF/file/project; private comments hidden; canonical pricing/rounding and ignored/rejected browser totals; conditional capture and dictionary completeness; draft recalculation, sent snapshot DB immutability; real V2 line/scope/day/amount deltas; invalid/superseded/expired/wrong-user/read-check rejection; one exact option and one project under simultaneous accept requests; prepared later draft cannot be edited/sent after acceptance; tasks enforce client/provider ownership; PDF bytes survive CMS/brand/version changes; publishing updates static frontend without rebuild; private drafts survive network failure; TTL/reset invalidation; file format/size/permission/structural validation; storage budget includes PDFs and attachments; reminder dedupe; related request/proposal/project activity; demo analytics match workspace events.

## UI and evidence

Actual captures: home desktop/360/768, brief desktop/mobile, operator inbox desktop/mobile, proposal room and comparison desktop/mobile, project desktop/mobile. `accepted-proposal.pdf` is downloaded from the real accepted version. Files are produced by running the application, not drawn screen mockups. Evidence includes synthetic references/IDs.

Responsive checks: 360, 390, 768, 1024, 1440 px; page overflow assertions and named scrollable tables/nav. Reduced motion and language selector/navigation tested. Brief first-error focus and dialog Escape/restore tested; receipt/project focus is directed to the new heading. No uncaught browser errors in the full workflow. Axe WCAG 2 A/AA/2.1/2.2 tagged scans: home/brief/operator zero violations in the final successful quality check; one incomplete item on home still requires human interpretation. This is not WCAG certification. Full screen-reader/cross-browser/native browser zoom review remains human QA before external sharing.

## Performance and limits

Lighthouse uses local compiled/static services, actual cookies for operator, Chromium headless, default mobile simulated throttling and no storage reset. Final measured scores: public Performance 100 / Accessibility 100 / Best practices 96 / SEO 100; operator 100 / 100 / 100 / 100. CLS public 0.039, operator 0. Public best-practices deviation is Chrome reporting a CSP issue in its Issues panel; the actual CSP hydration/workflow test passes and the app policy was kept enabled. JSON reports are retained. Scores are local observations, not production guarantees.

Not tested: hosted Hostinger/Pages + Render cookie/domain topology, Neon connection, production distributed traffic, malware scanner, real owner/invitation flow, real messaging/payment/calendar/LLM. CI configuration is supplied but no remote GitHub Actions run has occurred. Automatic retention deletion/garbage collection is not provided; expired/reset history/files stay inaccessible for review. Storage and security production decisions are explicit in the runbook/integration matrix.

## Clean checkout verification

Tested source commit: `b635e9da05f21933f5e62f3c3b22456cf860c9a5`. Used an actual `git clone --no-local` of that local commit to `/workspace/Northstar-clean-check` (not a remote GitHub clone; no push was authorized). Installed with the tracked lockfile using `npm ci` (504 packages, 11 seconds). Created a separate fresh `northstar_clean_check` database in the dedicated Northstar PostgreSQL instance. Copied env example privately with only its DB name changed. Ran migration, diagnostic seed, lint, typecheck, all 25 domain/DB tests and full build successfully. Both original preview services were stopped before clean-checkout Playwright started its own compiled API/static+CSP services on the standard ports, so the new DB/runtime were used rather than reused original services.

Final browser result: all six tests passed (45.1 seconds), including new brief → V1 → comment → V2 → actual diff → exact alternative acceptance → project/tasks → authorized PDF, reload/isolation, mobile keyboard/reduced motion/effective 200% layout, real CSP and live CMS/profile changes. CI workflow is prepared; these are local checks, not a remote GitHub Actions result. npm ci emitted dependency deprecation notices; the production vulnerability audit reported zero.

## Recorded demonstration

`docs/evidence/northstar-demo.mp4` and `.webm`: 71.48 seconds; MP4 2,158,574 bytes. Recorded with Playwright driving an isolated synthetic workspace through real API/DB, with six deliberate seven-second reading pauses, then encoded locally with ffmpeg. No narration, fabricated screen data, public hosting or external service effects. Each capture/recording may use a different isolated workspace; continuity IDs remain the same within each individual business walkthrough.
