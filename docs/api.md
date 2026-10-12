# API contracts

Base URL locally: `http://localhost:4000`. All responses are JSON unless a document download is declared. Timestamps are UTC ISO strings; money is integer minor units and explicit USD/ARS; quantities hundredths and percentages basis points. Schemas in `packages/contracts/src/index.ts` are the executable contract.

## Session and safety headers

Mutations require exact `Origin: <WEB_ORIGIN>`. Session creation additionally requires `X-Northstar-Demo: 1`. Authenticated mutations require cookie `northstar_session` and `X-CSRF-Token` returned by `/me`. Use `credentials: include` in the frontend. The cookie is HttpOnly; server resolves workspace/user/role. Neither IDs, query parameters nor browser role values grant access.

Errors: `{code,message,fieldErrors?,requestId}`. Typical statuses: 401 expired/missing session; 403 role/Origin/CSRF; 404 inaccessible or absent record; 409 invalid transition/immutable version/idempotency conflict; 413 oversized upload; 422 invalid schema/scope/file; 429 rate/workspace limit; 503 unavailable document. Internal errors expose no payload/stack/credentials. Request IDs are also in `X-Request-Id`.

## Routes and permissions

| Method and path | Access | Input → output |
|---|---|---|
| GET `/health` | Any | API liveness `{status,service}` |
| GET `/ready` | Any | PostgreSQL readiness, 503 if unavailable |
| POST `/demo/session` | Origin + demo header | Empty → isolated seeded workspace ID + cookie; existing valid cookie keeps workspace |
| GET `/me` | Session | workspace/user/name/identity/role, CSRF, brand, TTL, approved identities |
| POST `/demo/switch-role` | Session/CSRF | `{identity: customer\|customer-2\|customer-3\|operator}` → rotated approved session cookie |
| POST `/demo/reset` | Session/CSRF | Empty → reset own workspace, invalidate all its sessions/old IDs; other workspaces unaffected |
| POST `/auth/logout` | Session/CSRF | Empty → revoke current session and clear cookie |
| GET `/public/brand` | Any | Session workspace brand or anonymous default |
| GET `/public/services`, `/cases`, `/faq` | Any | `{items:[{id,revision,data}]}`; session profile's published content; no draft |
| GET `/public/services/:id` | Any | One current published service of visible profile |
| POST `/estimates` | Session/CSRF, limited | EstimateInput → server lines/totals/currency/range/serviceRevision; no availability guarantee |
| POST `/leads` | Customer/CSRF, limited | BriefInput + Idempotency-Key → `{id,reference}` after commit |
| GET `/me/requests` | Session, own customer records | search/status/source/page → stable paginated `{items,total,page,pageSize}` |
| GET `/operator/leads` | Operator | Same real filters; all workspace leads, 10/page |
| GET `/leads/:id` | Owner/operator | Snapshot brief/service/estimate, authorized comments/files, quoteId |
| POST `/leads/:id/transitions` | Operator | `{to:qualified\|lost}`; explicit allowed transition only |
| POST `/leads/:id/comments` | Owner/operator | `{body,visibility:public\|private}`; private only operator; public local notification |
| GET/PUT/DELETE `/me/brief-draft` | Customer | Private partial BriefInput. PUT validates fields/questions; server-only storage |
| POST `/leads/:id/quotes` | Operator, qualified/open | `{draft?:QuoteDraft}` → quote and next draft version; existing draft reused |
| PATCH `/quotes/:id/draft` | Operator | `{versionId,draft:QuoteDraft}` → recalculated snapshot; sent version immutable |
| POST `/quotes/:id/send` | Operator | `{versionId}` → frozen sent version, PDF, local inbox/outbox; old sent superseded |
| GET `/quotes/:id/versions` | Owner/operator | Descending revisions; customers cannot see draft; no private filesystem paths |
| GET `/quotes/:id/compare?from=&to=` | Owner/operator | Two authorized revisions → real per-option total/day/scope/line changes |
| POST `/quotes/:id/accept` | Customer owner | `{versionId,optionId,checks}` → exact acceptance/project; repeat exact returns same project |
| POST `/quotes/:id/decline` | Customer owner | `{versionId}` → current proposal declined, lead lost, audit/local notice |
| GET `/quotes/:id/pdf?version=` | Owner/operator | Authorized PDF bytes, frozen hash header; no draft PDF |
| POST `/attachments` | Session/CSRF, limited | Multipart single `file`; TXT/PDF/PNG ≤2 MB → safe metadata/UUID |
| GET `/attachments/:id/download` | File owner/lead owner/operator | Protected binary attachment; no public URL or path authority |
| GET `/projects?page=&leadId=` | Owner/operator | Stable pagination; optional scoped request filter |
| GET `/projects/:id` | Owner/operator | Exact accepted option/record, reference, quoteId, milestones/tasks |
| PATCH `/tasks/:id` | Owner/operator | `{status:todo\|doing\|done}`; customer can only edit customer-owned tasks |
| GET `/projects/:id/milestones` | Owner/operator | Ordered actual project milestones |
| PATCH `/milestones/:id` | Operator | `{status:planned\|active\|complete}` |
| GET `/operator/content?kind=` | Operator | Workspace content (service/case/faq/template), draft/published/history metadata |
| POST `/operator/content` | Operator | `{kind,data}` → validated private draft |
| PATCH `/operator/content/:id` | Operator | `{data}` → validated draft; public revision unchanged |
| GET `/operator/content/:id/preview` | Operator | Private draft preview, never anonymous/customer |
| POST `/operator/content/:id/publish` | Operator | Validate + freeze next published revision + audit; immediately public in workspace |
| DELETE `/operator/content/:id` | Operator | Archive; retain histories/snapshots |
| GET/PATCH `/operator/settings` | Operator | BrandSettings; PATCH returns historic incompatible count, preserved history |
| GET `/inbox` | Session, own identity | Latest 100 real local notifications, no external email |
| POST `/inbox/:id/read` | Notification owner/CSRF | Mark own notification read |
| GET `/outbox` | Operator | Latest 100 local-delivered durable events; `externalDelivery:not-sent` |
| GET `/activity?entity=` | Owner/operator | Latest 100 scoped events; clients exclude private and unrelated entities |
| GET `/analytics` | Operator | Workspace event counts/origin breakdown; demo label, includes synthetic seeds |
| GET `/sales-card?format=txt\|json` | Operator | Download factual local product demo summary; no revenue/ROI export |
| GET `/owner` | No demo identity | Always 403; no global owner grant |

Services/packages/questions/project templates are edited inside the validated `service` CMS document; cases/FAQ and reusable quote blocks use their own kind schemas. This supplies CRUD/publish/preview without separate redundant nested controllers. Event feeds are bounded; request/project sorting is stable (createdAt + ID).

## Payload examples

```json
{
  "serviceId":"<authorized-published-UUID>","packageId":"considered",
  "quantity100":125,"addonIds":["workshop"],"currency":"USD"
}
```

BriefInput extends that estimate with title/name/email, question answers, optional YYYY-MM-DD deadline, source `website|lead|cold-email|referral|in-person`, channel, campaign and up to five authorized attachment UUIDs. Example answers: `{"goal":"A clear scope","existing":"Synthetic reference","coordination":"Yes","team":"Fictional review team"}`. Conditional questions are validated against the published service. Browser totals/unrecognized top-level fields are rejected.

QuoteDraft: currency, discountBps/taxBps, validDays (1–90), terms and 1–3 uniquely identified options. Option: id/name/days/revisions, uniquely identified lines `{id,label,quantity100,unitMinor}`, and scope arrays `included,excluded,deliverables,responsibilities,criteria`. Totals, customer, brand, service revision and snapshot hash are created by the server, not accepted from the editor.

```json
{
  "versionId":"<current-sent-UUID>","optionId":"primary",
  "checks":["scope","exclusions","responsibilities","terms"]
}
```

Submit idempotency is scoped to workspace/user/operation/key. A canonical payload fingerprint handles object-key order. Identical retries return one result; a different payload using the same key conflicts. Acceptance repeat checks the exact option and version, not just the quote ID. No email-based identity merge is performed.

## Expiry and downloads

GET never changes quote/lead/project states. It may present derived expired status, and authorized document GETs audit access. The durable reconciliation worker applies expiry/reminders; command validation rejects expired versions/workspaces immediately. Downloads include `Cache-Control: private,no-store`, safe content disposition and nosniff. PDF hashes are available in `X-Document-SHA256`.
