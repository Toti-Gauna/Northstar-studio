# Customization playbook

## One application, three sectors

Operator → Brand & sector previews name/text mark/colors/contact/language/currency/timezone/profile. Save to the current workspace only. Switch to Digital Studio, Architecture Office or Technical Services: published catalog/questions/cases/FAQ change, old requests retain captured service revision and warn when historical profile differs. Old proposals/PDFs/accepted projects retain their original identity/scope/currency. Other visitors are unaffected.

No FX conversion exists. Maintain USD and ARS catalog values separately. New requests use the current configured currency; a proposal follows its request currency even if workspace defaults change later. IANA timezone changes display only; persisted timestamps remain UTC.

## Catalog/content

Operator → Content studio: services/cases/FAQ/quote blocks. Edit bilingual copy/prices via ordinary controls; use advanced validated JSON for detailed packages, questions, conditional rules, exclusions and milestone templates. Save draft privately → preview → publish a validated revision. Archive removes public listing and keeps snapshots. Every public screen fetches from API; publishing does not require rebuilding Next.

Services include 1–3 uniquely identified packages with explicit USD/ARS prices, indicative days/revisions/included/excluded. Add-ons have their own prices. Questions have stable IDs, localized labels/hints, required/type/select options and optional `{field,equals}` condition. Store select values as stable English option value while displaying translated labels. Keep IDs stable for compatible question changes; change the label/ID deliberately when semantics differ. Brief service change confirms before incompatible answers are discarded.

Milestone template: localized title, ordered tasks with `owner: customer|operator`. At acceptance, the service snapshot's template creates actual project rows. Editing a published template affects new briefs/proposals, never existing accepted projects. Project task status updates are ownership checked.

Reusable quote blocks are currency-specific lines/scope. Apply from the editor; IDs are regenerated per inserted line to avoid collisions. Drafts can adjust quantity/prices, discounts/example taxes, conditions, timing, scope and up to three alternatives. Save recalculates on server. Send freezes version/PDF; changes require a next revision. Accepted/lost work needs a new scope/new brief rather than reopening.

## What code to change

For new default catalogs, adjust `apps/api/src/db/catalog.ts` and validate with shared schemas. For additional field types or pricing rules, update `packages/contracts` and server rule services/tests first, then UI controls. For copy add both keys to `apps/web/src/lib/dictionaries.ts`. For visual primitives/tokens modify globals/components, keeping responsive/reduced-motion/accessibility checks. Font licensing assets stay with the project.

Do not bypass workspace/customer predicates, CSRF, guard transactions, unique acceptance/project constraints, immutable snapshot trigger or money calculation to customize presentation. Do not edit sent snapshots/catalog JSON in SQL to change accepted work. Do not add secrets to NEXT_PUBLIC variables. External integrations need a separate explicit scope; there are no fake provider adapters to enable.

## Review before adapting commercially

Confirm sector terminology, real package prices/taxes/terms/exclusions, responsibility/acceptance checklists, contact/brand assets, accessibility and document layout. Replace demonstration cases only with approved truthful case evidence. Decide production identity/invitation roles, retention, persistent storage, domain/cookie topology, monitoring/backups and provider permissions separately from this demo.
