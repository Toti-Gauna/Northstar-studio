# GitHub Pages publication

Target: https://toti-gauna.github.io/Northstar-studio/

The `Publish Northstar to GitHub Pages` workflow builds the frontend from `main`, uploads its static export and deploys through the `github-pages` environment. Node 24, npm lockfile, lint and typecheck are checked before publication. Full PostgreSQL verification remains in the separate `Northstar verification` workflow.

## Connected mode versus public preview

GitHub Pages does not run Express, PostgreSQL, the worker or private durable storage. If repository Actions variable `NORTHSTAR_API_URL` contains the HTTPS origin of an independently deployed Northstar API, the build uses that URL. It must support the exact web origin `https://toti-gauna.github.io`, valid secure session cookies and CSRF, and the configured database/storage. Cross-site cookies may be blocked by browsers; test the real deployment before promising the transaction loop. A same-site API/custom-domain arrangement may be necessary. No backend is provisioned by this workflow.

Without that variable, the workflow explicitly builds a **disconnected public preview**. Services, package descriptions, demonstration cases and FAQ come from a generated public editorial snapshot using the same validated catalog definitions as the anonymous API. The page labels this mode in English and Spanish. No leads, users, sessions, estimates, quotes, acceptance or projects are synthesized; the brief and portals explain that the API is required. Changes to this offline catalog require rebuilding. With a connected API, published CMS changes are loaded live without rebuilding.

The source remains fully functional with the local API and PostgreSQL. An Actions database used in CI is temporary verification infrastructure, not the published application's database.

## Routing and security

`NEXT_PUBLIC_BASE_PATH=/Northstar-studio` sets Next's project prefix. Native links, redirect locations and copied client links use the same prefix; Next routers apply their own basePath. Static shell URLs retain query IDs and trailing slashes. `.nojekyll` accompanies the export.

Pages ignores `_headers` and `.htaccess`. The workflow inserts a CSP meta tag with generated inline-script hashes and the configured API origin. It does not claim response-header protection such as `frame-ancestors`, X-Frame-Options, Permissions-Policy or nosniff on Pages. Use a host supporting response headers if those are required.

## Build and verify locally

```sh
npm ci
npx tsx scripts/export-public-catalog.mts
NEXT_PUBLIC_BASE_PATH=/Northstar-studio NEXT_PUBLIC_API_URL=https://api-not-connected.invalid NEXT_PUBLIC_STATIC_PREVIEW=1 npm run build -w @northstar/web
STATIC_CSP_META=1 NEXT_PUBLIC_API_URL=https://api-not-connected.invalid node scripts/static-headers.mjs
NEXT_PUBLIC_BASE_PATH=/Northstar-studio node scripts/serve-static.mjs
```

Open `http://localhost:3000/Northstar-studio/`. For full local operation, rebuild with the regular `npm run build` and use the local `.env` settings described in the runbook. Do not use static-preview flags for the full E2E tests.

## Update and rollback

Push a reviewed commit to `main`, or run the Pages workflow manually. Verify the deployment URL and Actions conclusion. Roll back by reverting the relevant commit and rerunning the workflow; preserve database migrations independently. Never commit secrets or set database/session secrets in NEXT_PUBLIC variables.
