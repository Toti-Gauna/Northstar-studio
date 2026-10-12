# Scope and requirement map

All functionality below is implemented locally over API/PostgreSQL, except explicitly external effects in the integration matrix. This demo is general services software; the three sector profiles reuse every screen.

| Requirement | Screen | Entity/snapshot | Endpoint | Evidence/check |
|---|---|---|---|---|
| D1 continuous brief → proposal → project | Home, brief, request, project | Lead, QuoteVersion, Acceptance, Project | `/leads`, `/leads/:id/quotes`, `/quotes/:id/accept` | PostgreSQL integration; full export E2E |
| D2 conditional smart brief, missing information, compatible service switch | Brief steps | Service questions, private Draft, answers | `/public/services`, `/me/brief-draft`, `/leads` | Conditional-rule unit test; browser workflow |
| D3 explainable estimate | Live preview, brief sidebar | Catalog price rules | `/estimates` | Integer rounding/currency/tampering tests |
| D4 package/alternative comparison | Service detail, proposal room/editor | Up to 3 packages/options | service CMS, quote draft/accept | Alternative acceptance concurrency test |
| D5 revision diff | Proposal history/compare | Frozen versions/lines/scope | `/quotes/:id/versions`, `/compare` | Actual amount/scope/time delta integration; capture |
| D6 scope clarity/read checkpoints | Proposal/editor/project | Five scope sections, acceptance audit checks | quote edit/send/accept | Missing checks rejected; immutable snapshot |
| D7 authorized room/documents/PDF | Client request room | Comments, attachments, snapshot PDF/hash | lead detail/comments/download/pdf | Ownership/workspace/private-comment tests; E2E PDF |
| D8 transactional handoff | Project milestones/tasks | Unique acceptance/project, tasks | accept, projects, tasks/milestones | Concurrent requests create one project, 3 milestones, 6 tasks |
| D9 brand/sector kit + CMS | Operator settings/content | Brand JSON, content draft/published/history | operator settings/content/preview/publish/archive | Profile/history and no-rebuild publication E2E |
| D10 sales demo | Visible role selector, tour, analytics, sales download | Approved workspace identities, durable events | demo role/session, analytics, sales-card | Role escalation and counts tests; tour never performs business actions |
| Public surfaces | Home/services/detail/cases/process/FAQ | Published service/case/FAQ revisions | `/public/*` | Exported routes, navigation, actual responsive captures |
| Operator operations | Inbox/search/source/stage/pagination/detail | Leads/comments/quotes/activity | operator leads, transitions, comments, activity | Real filters and persisted URL, E2E inbox |
| Client operations | Own requests/comments/proposals/project/tasks | Owned entities | me requests, leads, quotes/projects | Distinct clients and reload persistence |
| Notifications/reminders | Inbox/outbox/activity | Durable rows, dedupe | inbox/outbox/activity; worker | No external-delivery claims; TTL reconciliation test |
| Files, PDF, safety | Uploads/downloads | Private metadata/file/hash | attachments; quote PDF | MIME/content/size/permission tests; sample PDF |
| English/Spanish, USD/ARS, timezone | Selector/config/screens/PDF snapshots | Dictionaries + sector content + brand | brand/settings | Language navigation E2E; schema/domain tests |
| Static hosting/clean install | Fixed shells + query IDs | Arbitrary server IDs | static export + separate API | Built `out/`; QA/runbook |

## Acceptance matrix (24 requested checks)

1–3: DB HTTP integration verifies visible ID, concurrent submit dedupe, fingerprint conflict and separate same-email customers. 4–6: customer/workspace ownership across lead/quote/file/project and private API activity/comments; PDF uses only frozen public scope. 7–9: integer pricing, immutable draft/send rules, conditional package/questions and server recalculation. 10–14: real V2 diff, superseded/expired/wrong-user/read-check rejection, exact alternative, concurrent one-project handoff, stable PDF bytes after publishing.

15–18: exported CMS publication E2E; failed-network draft recovery; server role checks/cache scoping; reset/TTL access invalidation with other workspace intact. 19–20: upload structure/size/permission rejection and analytics from workspace events. 21–24: full business flow over the static export, responsive/reduced motion/focus/keyboard checks, sector/history isolation and real PostgreSQL persistence.

Automated coverage is evidence of these behaviors, not a WCAG certification, complete penetration test or production approval. Exact final executed results and limits belong to `qa-report.md`.

## Explicit limits

No real CRM integrations, omnichannel messaging, email/WhatsApp sending, payments, calendar booking, LLM or certified signatures. No global administrator/production signup is exposed. Tour guides six scenes on a 90-second cadence and pauses on interaction; it never completes acceptance or reset. Demo-card output lists local product functions, never exports analytics as commercial results. Lists paginate requests/projects; event feeds are deliberately bounded to the latest 100 and paginate locally. CMS uses normal bilingual copy/price controls plus a validated advanced JSON editor for questions/packages/templates.
