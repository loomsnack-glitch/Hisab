# WhatsApp Cloud API-only migration plan

Status: in progress — implementation loops 1–6 complete; Loop 7 plan ready; Cloud API migration not yet production-ready
Date: 2026-08-21
Owner: Hisab platform

This document is the source of truth for the Cloud API migration. The status
below is based on the `feat/whatsapp` branch after the main-branch merge and
must not be inferred from the presence of a migration file or a passing unit
test alone.

## Decision

Hisab will move from the QR/Baileys integration to Meta's official WhatsApp
Business Platform Cloud API. Baileys will not remain as a second production
provider after the migration is complete.

The customer-facing connection flow will be Meta Embedded Signup. A customer
will authorize and connect a business phone number once; Hisab will then
manage the connected WABA, templates, Store assignment, messaging, delivery
status, usage, and operational errors through the Cloud API.

This is a provider replacement, not a rename of the existing QR flow. Cloud
API has no QR session, no local WhatsApp Web auth state, and no port-8100
worker requirement.

## Goals

- Replace QR/Baileys account linking with Embedded Signup.
- Send bills, due reminders, promotions, media, and approved templates through
  Meta Cloud API.
- Receive inbound messages and delivery events through a verified HTTPS webhook.
- Support one WhatsApp account assigned to multiple Stores in one Organization.
- Keep conversations, messages, outbox retries, idempotency, and dead-letter
  handling durable in PostgreSQL.
- Verify and synchronize Meta template approval status.
- Enforce opt-in, cooldown, Meta limits, Hisab quotas, and spending controls.
- Give operators clear account, template, quality, limit, usage, and failure
  visibility.
- Migrate existing Baileys data without silently losing historical messages or
  creating duplicate sends.
- Remove Baileys code, dependencies, auth data, UI, deployment, and port 8100
  only after the migration gates are passed.

## Non-goals

- Do not keep a QR fallback after the final cutover.
- Do not put a Meta access token in the browser, an Organization row, or a
  normal customer-editable `.env` value.
- Do not treat a Hisab-local template as automatically approved by Meta.
- Do not promise unlimited marketing delivery.
- Do not send arbitrary business-initiated text outside Meta's customer-service
  window.
- Do not make a POS request wait for a Graph API request; all outbound work
  remains asynchronous through the outbox.
- Do not change Billing, Sales, Payments, or Customer Ledger semantics as part
  of this migration.

## External constraints

Meta's current Cloud API documentation requires a Meta business portfolio,
WABA, business phone number, access token, HTTPS webhook, and the WhatsApp
management and messaging permissions. The official Embedded Signup flow covers
WABA discovery, system-user assignment, phone registration, WABA subscription,
and template discovery.

- [Meta Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Meta Embedded Signup collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)
- [Meta partner roles](https://whatsappbusiness.com/partners/become-a-partner/)

Meta currently charges by delivered message and message category. Service
messages and some utility replies have different pricing treatment from
marketing messages. The implementation must fetch and record the applicable
provider information rather than hardcoding a rate.

- [Meta platform pricing](https://whatsappbusiness.com/products/platform-pricing/)

Meta messaging policy requires recipient opt-in, opt-out handling, approved
templates for business-initiated messages outside the rolling 24-hour
customer-service window, and appropriate escalation/support paths.

- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)

## Operating assumptions and decision gates

The implementation starts with these defaults unless the product owner changes
them before Phase 0:

- Hisab is a Meta Tech Provider, not yet a Solution Partner.
- Each customer connects and authorizes its own WABA/phone number through
  Embedded Signup.
- Meta billing is customer-owned in the first rollout. Hisab quotas and
  budgets are safety controls, not a replacement for Meta billing.
- Centralized Meta billing is a separate BSP/Solution Partner workstream and
  must not be mixed into the first Cloud API delivery path.
- One Cloud API account may be assigned to many Stores, but every inbound
  conversation has one deterministic Store route.
- Cloud API migration is opt-in per Organization. No account is silently
  converted because a phone number happens to match an old Baileys account.

The following decisions block production onboarding:

1. Meta billing owner: customer direct or contracted BSP/Solution Partner.
2. Hisab plan quota, budget, and overage behavior.
3. Required consent wording and accepted opt-in evidence.
4. Secret-management provider, data region, and retention periods.
5. Phone-number migration policy for numbers currently used by WhatsApp or
   WhatsApp Business App.
6. Whether platform-owned OTP/invite messages will use a dedicated Cloud API
   account or move to another channel.

These are explicit gates because changing them changes schema, authorization,
financial liability, or customer behavior.

## Current Hisab state

The repository already has useful durable messaging infrastructure:

- `whatsapp_accounts`, conversations, messages, and outbox tables;
- Store assignment and default inbound Store support;
- provider-event inboxing, retries, leases, dead lettering, and delivery
  status handling;
- bill, due-reminder, promotion, image, and document-related flows;
- local Hisab message templates and campaign recipient records.

The current production path is still Baileys-shaped:

- `packages/types/src/services/whatsapp.schema.ts` exposes `baileys`, QR
  statuses, QR images, and worker status contracts;
- `apps/whatsapp-worker` owns Baileys sockets, QR creation, auth state, and
  provider sends;
- outbox dispatch is coupled to the Baileys worker;
- `whatsapp_accounts` still has QR/session fields and a provider enum created by
  `20260811100000_create_whatsapp_messaging_foundation.sql`;
- local templates and Meta-approved templates are not yet separate concepts;
- campaign data has marketing opt-out state but needs auditable opt-in and
  usage/quota accounting;
- the older global Cloud API notification service is not a multi-tenant
  customer-account implementation and must not be reused with one global token.

The branch now also contains a Cloud API contract foundation:

- additive Cloud account, webhook receipt, status-timestamp, and onboarding
  state migrations are present in `apps/backend/db/migrations/20260821180000`
  through `20260821183000`;
- signed onboarding state, durable replay protection, callback validation, and
  injected token-exchange orchestration exist under
  `apps/backend/src/modules/tenant/whatsapp/cloud-api/`;
- webhook verification, receipt persistence, normalization, processing, and
  outbound payload/error contracts exist as fixture-tested module boundaries;
- the public webhook route is mounted at `/webhooks/whatsapp`, and the
  authenticated onboarding-start route is mounted with the existing WhatsApp
  routes;
- Cloud account provisioning now exchanges the Embedded Signup code server-side,
  validates the WABA and sender against Graph, subscribes the WABA, stores only
  an opaque credential binding, and persists a safe account snapshot;
- Cloud refresh/revoke endpoints and a provider-aware Admin account surface are
  wired, including Meta Embedded Signup launch, status display, refresh, revoke,
  and reconnect actions; the existing Baileys account surface remains available
  until Phase 7;
- the real secret-manager adapter, Meta App configuration, live Graph exchange,
  and production webhook verification remain external release gates.

### Verified implementation status (2026-08-22)

| Area | Status | Evidence and remaining gate |
| --- | --- | --- |
| Phase 0 Meta/product readiness | Readiness researched; external gate deferred | The repository checklist and primary-source findings are recorded in `docs/research/2026-08-21-whatsapp-cloud-api-phase-0-readiness-research.md`; Meta App, Embedded Signup, production webhook, secret manager, billing, consent, and migration decisions remain a release/integration gate. |
| Phase 1 account/database foundation | Code-first foundation implemented; exit gate open | The injected credential-vault/key-version port, atomic WABA/sender persistence, credential-binding rotation seam, resumable provisioning columns, and read-only integrity verification script are implemented and fixture-tested. Applying the migration set to a production-shaped copy, wiring the real secret manager, and running the database/security exit checks remain. |
| Phase 2A–2D Cloud contracts | Webhook and gated outbox runtime implemented; provider exit gate open | Signed receipt replay, webhook heartbeat persistence, gated outbox dispatch, and callback-based reconciliation for uncertain sends are wired and focused fixtures pass. A real credential-vault/private-storage assembly, migration execution, Meta verification, and production observation remain. |
| Phase 3A–3D onboarding contracts | Implemented | State, persistence, result validation, and server-side exchange seams are covered by focused fixtures. |
| Phase 3 account operations | Code-first implementation complete; external gate open | Graph discovery, sender validation, WABA subscription, opaque credential binding, safe account persistence, resumable provisioning attempts, refresh/revoke endpoints, durable refresh error state, provider-aware Admin UI, Meta Embedded Signup launch, and existing Store assignment paths are wired. Secret-manager assembly, live Meta verification, migration execution, and production-shaped Store/inbound testing remain. |
| Phase 4 templates/policy | Code-first admission complete; caller migration pending | Phase 4A–4C template, consent, and send-admission seams are implemented. Legacy invoice, due, promotion, and inbox callers are now blocked from sending through Cloud accounts until they migrate to the Cloud template route. |
| Phase 5 quotas/usage/safety | Code-first implementation complete; external gate open | The append-only usage ledger, atomic quota reservation/settlement/release, provider quality/limit snapshots, pacing, cooldown, campaign duplicate prevention, stop controls, and reconciliation reporting are implemented. Target-environment policy and controlled concurrency/provider checks remain. |
| Phase 6 feature migration | Planned; blocked by external gates | The caller migration is planned as Loop 7 below. It must wait for the Phase 2–5 provider, credential, storage, template, consent, and quota exit gates. |
| Phase 7 Baileys retirement | Not started | Baileys code, auth state, UI, deployment, and port `8100` remain intentionally. |

The post-merge baseline reconciliation is complete for the confirmed source
and contract mismatches. The focused regression set now passes 169 tests across
the affected API, catalog, POS, KOT, platform, and Console suites. A broad
`bun test` invocation still reports 26 failures caused by Bun cross-file
`mock.module()` and browser-global contamination; each affected suite passes
when isolated. This is tracked as test-harness work and is not being treated
as a Cloud runtime failure.

Relevant existing areas:

- `apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.ts`
- `apps/backend/src/modules/tenant/whatsapp/`
- `apps/backend/src/services/notifications/whatsapp.service.ts`
- `apps/backend/db/migrations/20260811100000_create_whatsapp_messaging_foundation.sql`
- `apps/backend/db/migrations/20260816170000_organization_whatsapp_accounts.sql`
- `apps/backend/db/migrations/20260816201000_customer_whatsapp_messaging.sql`
- `apps/whatsapp-worker/`
- `docs/development/ganatri_deployment_guide.md`
- `docs/development/ecosystem.config.ganatri.js`

## Execution phases and dependencies

Work is delivered in vertical phases. A phase is not complete because its
code compiles; its exit gate requires the listed database, security, and
controlled-provider evidence.

The implementation order is intentionally different from the order in which
the contract files appeared in Git. Contract slices may be implemented ahead
of external setup, but they do not authorize live onboarding or production
sends. The next implementation targets are the missing Phase 2 runtime wiring
and then the Phase 3 account-operations seam, not Phase 6 feature delivery.

### Phase 0: Meta and product readiness

Status: **readiness researched; external gate open**. See
`docs/research/2026-08-21-whatsapp-cloud-api-phase-0-readiness-research.md` for
the source-backed checklist and exit evidence.

Dependencies: none.

Deliverables:

- Hisab Meta Business Portfolio and Developer App;
- Tech Provider onboarding and required App Review/Advanced Access;
- verified production HTTPS domain, privacy policy, terms, support, and data
  deletion pages;
- test WABA and test phone number;
- webhook verify secret and application secret stored outside source control;
- written billing, quota, consent, retention, and phone-migration decisions.

Exit gate: Embedded Signup can authorize the test account, the webhook can be
verified, and the agreed billing/consent decisions are documented.

### Phase 1: Secure account and database foundation

Status: **code-first foundation implemented; exit gate open**. The additive
development migrations and the credential/account persistence seams are in
place, but the real secret-manager adapter, production-shaped database copy,
and security/backfill evidence are not complete.

Dependencies: the code uses injected credential and provider ports; live
verification still depends on Phase 0 Meta App and secret-management decisions.

Deliverables:

- additive Cloud account migration;
- encrypted credential reference and key-version model;
- Cloud lifecycle states and safe error DTOs;
- globally unique WABA/Phone Number IDs;
- Store assignment/default inbound routing constraints;
- corrected Store-scoped conversation uniqueness;
- migration/backfill checks and production-shaped database test.

Exit gate: migrations apply cleanly to a copy of the target database, all
existing rows remain readable, and no secret is present in DTOs or logs.

### Phase 2: Cloud API module and webhook

Status: **runtime seams implemented; provider exit gate open**. Phase 2A–2D
have focused fixture coverage, the Cloud receipt processor is scheduled, the
legacy Baileys claim path is provider-scoped, and the Cloud outbox/media
dispatcher is wired behind injected credential and storage ports. The real
vault assembly, live Graph verification, and production observation remain.

Dependencies: Phase 1 account/credential model.

Deliverables:

- backend Graph API client with timeout, retry classification, and redaction;
- internal Cloud dispatcher with no public port;
- webhook challenge/signature verification;
- durable provider-event ingestion and idempotent normalization;
- inbound conversation/message and outbound status mapping;
- media upload/download handling through private storage.

Exit gate: fixture tests cover signatures, duplicates, out-of-order statuses,
tenant scoping, retryable errors, permanent errors, and dead lettering.

#### Phase 2A: Signed webhook ingress vertical slice

Research: `docs/research/2026-08-21-whatsapp-cloud-api-phase-2-research.md`.

This is the first implementation slice of Phase 2. It deliberately stops at
the durable, authenticated receipt boundary so webhook delivery can be tested
without Meta setup or changing the existing Baileys replay path.

Deliverables:

- public `GET` verification endpoint using the application webhook verify token;
- public `POST` endpoint that validates `X-Hub-Signature-256` against the raw
  body before parsing or writing anything;
- bounded envelope validation and extraction of WABA/Phone Number IDs;
- idempotent durable Cloud webhook receipt records keyed by the authenticated
  raw-body digest, including unknown-account receipts for later reconciliation;
- fast `200` acknowledgement after persistence, with no media download,
  conversation mutation, or Graph API call in the request path;
- fixture tests for valid/invalid verification, signatures, malformed bodies,
  duplicate deliveries, unknown accounts, and request-size limits.

Non-goals for Phase 2A:

- message/status normalization and monotonic state transitions;
- Cloud outbox dispatch or uncertain-send reconciliation;
- media retrieval, template synchronization, or Embedded Signup;
- applying the migration to a target database or testing against Meta.

Exit gate: the route authenticates the raw request, persists one durable receipt
per delivery digest, acknowledges duplicates safely, does not expose secrets,
and all fixture tests pass. The ingress contract is now the committed baseline;
Meta verification, production HTTPS, and target-database execution remain
outside this slice.

#### Phase 2B: Cloud message and status normalization contract

Research: `docs/research/2026-08-21-whatsapp-cloud-api-phase-2b-normalization-research.md`.

This slice defines the safe translation boundary from a durable Cloud webhook
receipt into the existing Hisab message/status model. It is intentionally pure
and fixture-tested before database processing is wired, so provider payload
drift cannot mutate conversations or messages without an explicit contract.

Deliverables:

- normalize supported inbound text messages using the WABA ID, Phone Number ID,
  provider message ID, sender phone, profile name, body, and provider timestamp;
- normalize `sent`, `delivered`, `read`, and `failed` outbound status events,
  including safe failure metadata;
- reject malformed identifiers, phones, timestamps, and message bodies;
- preserve unknown and media message types as explicit deferred outcomes rather
  than silently dropping them or writing incomplete message rows;
- define monotonic status application rules so an older `sent`/`delivered`
  notification cannot regress a message already marked `read`;
- fixture tests for text, media deferral, unsupported types, duplicate items,
  malformed fields, failed statuses, and out-of-order status sequences.

Non-goals for Phase 2B:

- claiming or completing database receipt rows;
- creating conversations/messages or changing account state;
- downloading media, marking inbound messages read, or calling Graph API;
- Cloud outbox dispatch, template handling, and startup worker scheduling.

Exit gate: every supported payload produces a typed normalized event, unsupported
payloads produce an explicit deferred outcome, status transitions are monotonic,
and the focused/full test suites pass. The normalization contract exists and
focused tests pass; the repository-wide test gate remains open.

#### Phase 2C: Durable Cloud receipt processing

Research: `docs/research/2026-08-21-whatsapp-cloud-api-phase-2c-processing-research.md`.

This slice consumes the durable receipt contract without adding Cloud runtime
scheduling. It closes the database-processing boundary while preserving the
existing Baileys replay path.

Deliverables:

- lease and claim pending, retryable, and expired Cloud receipt rows with
  `FOR UPDATE SKIP LOCKED` and bounded attempt/backoff handling;
- re-resolve the account from `(waba_id, phone_number_id)` before processing,
  including receipts accepted before account provisioning finished;
- apply normalized inbound text through the existing Store-scoped conversation
  writer without creating legacy Baileys provider-event rows;
- apply timestamp-aware, monotonic outbound Cloud status updates;
- classify malformed, media, and unsupported events as ignored, while unknown
  accounts and temporarily missing outbound messages retry and eventually
  dead-letter with safe bounded diagnostics;
- fixture tests for leases, idempotency, status ordering, deferred outcomes,
  retries, and dead letters.

Non-goals for Phase 2C:

- no startup interval or worker reconciliation wiring;
- no Graph API calls, media retrieval, template synchronization, or Embedded
  Signup;
- no migration execution against a target database;
- no changes to the existing Baileys provider-event replay path.

Exit gate: a claimed receipt is processed exactly once from the application's
perspective, retries are bounded and observable, Store/account scoping is
preserved, focused/full tests pass, and a scheduler invokes the processor with
operational metrics and dead-letter handling. The backend scheduler and
dead-letter path are implemented; live provider verification remains open.

#### Phase 2D: Cloud outbound transport boundary

Research: `docs/research/2026-08-21-whatsapp-cloud-api-phase-2d-transport-research.md`.

This slice defines the safe Graph message boundary before any existing outbox
row can produce Cloud traffic. It keeps Meta payload construction and
uncertain-send classification independently testable while the template,
consent, quota, and credential-binding work is still pending.

Deliverables:

- typed payload builders for explicit text, approved-template, and provider
  media-reference messages;
- strict recipient/Phone Number ID validation and successful `wamid` response
  validation;
- provider error classification into accepted, retryable, permanent, and
  reconciling outcomes;
- transport-level protection against retrying a POST whose network result is
  unknown;
- fixture tests for payloads, validation, response parsing, and error classes.

Non-goals for Phase 2D:

- no database outbox claiming or completion;
- no credential vault, template binding, consent, quota, or cost ledger;
- no media upload/download orchestration or startup worker scheduling;
- no production Cloud sends and no changes to the Baileys worker.

Exit gate: the transport boundary is typed, redacted, deterministic, and
fully fixture-tested; credential binding, provider-scoped outbox claiming,
private-storage media upload, and uncertain-send reconciliation are wired
behind injected ports. Controlled Meta verification and the deployment
credential-vault assembly remain open.

#### Phase 3A: Embedded Signup authorization and provisioning contract

Research: `docs/research/2026-08-21-whatsapp-cloud-api-phase-3a-onboarding-research.md`.

This first Phase 3 slice establishes the security and state rules before the
Meta App configuration and credential-management seam are available locally.
It is intentionally pure and fixture-tested; it does not claim that an
Organization is connected merely because the browser returned from Embedded
Signup.

Deliverables:

- signed, short-lived onboarding state bound to one Organization and initiating
  administrator, with constant-time verification and an atomic replay-store
  boundary;
- ordered provisioning-step contract matching the documented onboarding flow;
- idempotent step completion plus resumable failure, cancellation, and bounded
  safe-error transitions;
- fixture tests for tampering, expiry, audience mismatch, duplicate completion,
  out-of-order steps, retry, and terminal states.

Non-goals for Phase 3A:

- no Facebook SDK or live Embedded Signup UI;
- no authorization-code/token exchange or credential persistence;
- no Graph API provisioning calls, database migration, Store assignment, or
  connected-account UI;
- no changes to the existing Baileys account routes or worker.

Exit gate: onboarding state cannot be forged, expired, or accepted for another
Organization/user; the one-time replay decision is explicit at the persistence
boundary; provisioning transitions are deterministic and resumable; and the
focused contract tests pass. This contract slice is committed; live Meta
onboarding remains outside its gate.

#### Phase 3B: Durable onboarding launch and replay boundary

Research: `docs/research/2026-08-21-whatsapp-cloud-api-phase-3b-onboarding-persistence-research.md`.

This slice turns the Phase 3A persistence seam into a real backend boundary
without pretending that browser authorization has completed provider
provisioning. It persists only the minimum data needed to bind and replay-proof
the future Embedded Signup callback.

Deliverables:

- a migration for hash-only, short-lived onboarding-state records bound to an
  Organization and initiating user;
- an authenticated start service and route that issues the signed state only
  after Organization authorization succeeds;
- an atomic database-backed replay-store adapter for the Phase 3A state
  contract;
- a shared response schema and focused tests for authorization, persistence,
  response redaction, and route validation; expiry and one-time consumption
  remain covered by the Phase 3A contract until a live database test harness is
  available.

Non-goals for Phase 3B:

- no Facebook SDK or Embedded Signup browser UI;
- no authorization-code exchange, Graph API call, provider credential, WABA,
  phone, or `whatsapp_accounts` persistence;
- no provisioning-attempt row before a real Cloud account/sender exists;
- no Store assignment, template sync, campaign behavior, or Baileys worker
  change;
- no migration execution against a target database.

Exit gate: the start boundary is organization-scoped, secrets and raw state
are not persisted or returned in logs, the replay adapter is atomic and
expiry-aware by construction, and focused contract tests pass. This persistence
slice is committed; target-database and live Embedded Signup verification
remain outside its gate.

#### Phase 3C: Embedded Signup result-intake contract

Research: `docs/research/2026-08-21-whatsapp-cloud-api-phase-3c-result-intake-research.md`.

This slice makes the browser callback an explicit, typed server boundary. It
validates the callback fields and binds the returned state to the authenticated
Organization and administrator, without treating the callback as a connected
account.

Deliverables:

- a strict callback payload schema for state, authorization code, WABA ID, and
  phone-number ID with bounded fields and normalized output;
- a pure verifier that composes the existing state signature and audience
  checks;
- focused tests for malformed, oversized, unknown, mismatched, expired, and
  valid callback results.

Non-goals for Phase 3C:

- no Facebook SDK or Embedded Signup browser UI;
- no authorization-code/token exchange, Graph API call, or provider fixture;
- no credential persistence, WABA/sender/provisioning-attempt/account rows, or
  Store assignment;
- no migration execution, template synchronization, or Baileys worker change.

Exit gate: callback input is strictly validated, state binding is
Organization/user scoped, secrets and callback values are not logged or
persisted, and focused contract tests pass. This result-intake slice is
committed; live callback wiring remains outside its gate.

#### Phase 3D: Server-side exchange and replay orchestration

Research: `docs/research/2026-08-21-whatsapp-cloud-api-phase-3d-exchange-replay-research.md`.

This slice adds the backend seam between a validated Embedded Signup result and
provider discovery. It keeps provider-specific HTTP details behind an injected
exchange port and makes replay consumption conditional on a successful
server-side handoff.

Deliverables:

- an exchange port for the authorization value and a bounded in-memory token
  result;
- an orchestration function that verifies the Phase 3C result, exchanges it,
  and atomically consumes the onboarding state only after exchange succeeds;
- fixture tests for successful exchange, exchange failure without consumption,
  invalid provider tokens, and replay races.

Non-goals for Phase 3D:

- no live Meta Graph request or hard-coded token endpoint;
- no WABA/phone discovery, provider ownership validation, or credential vault;
- no WABA/sender/provisioning-attempt/account rows, Store assignment, or
  connected status;
- no migration execution, Embedded Signup UI, template synchronization, or
  Baileys worker change.

Exit gate: provider-specific exchange is isolated behind a testable port,
state is consumed only after a valid exchange, sensitive values never enter
logs or persistence, and focused contract tests pass. This exchange slice is
committed; the real Graph exchange and account provisioning remain outside its
gate.

### Phase 3: Embedded Signup and account operations

Status: **code-first account operations implemented; external verification open**.
The 3A–3D state, persistence, result, and exchange contracts now flow through
server-side Graph discovery, sender validation, WABA subscription, credential
binding, account persistence, refresh/revoke operations, and the Admin Cloud
account surface. Baileys remains available for the later controlled migration.

Dependencies: Phases 0–2.

Deliverables:

- one-time Connect WhatsApp flow;
- resumable provisioning state machine;
- WABA subscription and phone registration;
- connected/disconnected/revoked/needs-action UI;
- reconnect, revoke, rotate credential, and refresh operations;
- Store assignment and default inbound Store UI.

Exit gate: one test Organization can connect, reload, reconnect, assign the
account to multiple Stores, and receive a deterministic inbound message. The
code path is implemented and fixture-verified; the gate is still open until a
configured secret manager, Meta test WABA, HTTPS webhook, and production-shaped
database run prove the full flow.

### Phase 4: Templates and policy enforcement

Status: **sub-phased; 4C code-first complete; external gate open**. The existing local Hisab template
manager and promotion UI must not be treated as Meta template approval or
policy enforcement.

Dependencies: Phases 2–3 and approved test WABA.

Deliverables:

- Hisab preset versus Meta template binding model;
- template create/sync/status/rejection handling;
- bill, due-reminder, and promotion mappings;
- variable and dynamic-link validation;
- opt-in, opt-out, suppression, and 24-hour window checks;
- send-time blocking for pending/rejected/paused templates.

Exit gate: a controlled test proves that approved templates send, invalid
templates are blocked, approval changes are reflected, and marketing cannot
send without consent.

#### Phase 4A: Meta template assets, bindings, and sync

Review result: the existing `whatsapp_message_templates` table is a Store-local
preset table. It cannot represent a WABA-level Meta asset, approval/rejection
state, language/category, binding history, or the immutable template snapshot
required by queued messages.

Implementation boundary:

- add separate WABA-level Meta template assets and Store/preset bindings;
- normalize provider status, category, language, components, and rejection data;
- add a server-side Graph sync seam with idempotent upserts;
- snapshot the selected binding/version on Cloud outbox rows;
- keep live Graph and Meta approval verification outside the code-only gate.

Review result: the migration provides WABA/org-scoped assets, Store/preset
bindings, one active default per Store/kind, and org-scoped outbox snapshot
foreign keys. The service and repository seams are implemented and the focused
Cloud suite passes 82 tests. Live migration execution, authenticated Graph
pagination, a real test WABA, and an integration fixture proving the database
constraints plus enqueue-time snapshot write remain open; the latter is wired
in Phase 4C with send-time admission.

Exit gate for this code-first slice: provider rows normalize safely, sync is
idempotent by WABA/provider template identity, bindings are authenticated and
Store/account scoped, and the outbox schema can retain the selected snapshot.

#### Phase 4B: Auditable consent and suppression

Implementation boundary:

- add explicit marketing and utility consent state, source, wording/version,
  timestamps, opt-out reason, and suppression precedence;
- preserve current opt-out behavior while making default migration policy
  explicit;
- expose bounded customer consent commands for Admin/POS use.

Exit gate: consent history is append-only/auditable, suppression wins over
campaign selection, and existing customers are not silently treated as opted
in.

Review result: the code-first slice adds explicit marketing and utility consent
state, bounded source/evidence/reason metadata, append-only consent events, and
Store-independent customer suppression with transactional state updates. The
existing legacy opt-out column remains intact, while promotion selection now
requires positive marketing consent and rejects suppressed customers. The
focused Cloud/consent suite passes 85 tests. Applying the migration, wiring the
Admin/POS controls to these commands, and provider/customer reply ingestion
remain integration gates.

#### Phase 4C: Send-time policy admission

Implementation boundary:

- require an approved Cloud binding for Cloud template sends;
- enforce category/intent compatibility, required variables, consent, and the
  rolling 24-hour customer-service window;
- return safe operator-facing reasons for Admin/POS callers; wire the
  template-status and consent controls when Phase 6 migrates those callers;
- leave quota/budget reservation to Phase 5.

Exit gate: fixture tests prove approved utility sends, rejected/pending/paused
templates, missing consent, invalid variables, and expired 24-hour windows are
blocked before an outbox row is created.

Review result: the admission policy now enforces active bindings, approved
status, utility/marketing category compatibility, positive consent, suppression
precedence, required component variables, and a 24-hour window for free-form
messages. Cloud template outbox rows atomically re-check the account, Store
assignment, binding, approval/version, and consent, then persist the immutable
binding/version snapshot; the Cloud dispatcher sends that snapshot as a Meta
template payload. Focused fixture tests pass 92 tests. Phase 6 still must route
bill, due-reminder, and promotion callers to this seam; live Meta approval,
migration execution, and controlled provider tests remain external gates.

### Phase 5: Quotas, usage, and campaign safety

Status: **sub-phased; 5B code-first complete; external gate open**. Existing promotion cooldowns, pending-outbox limits,
and campaign counters are useful local safeguards but do not satisfy the
append-only ledger and atomic reservation requirements below.

Dependencies: Phase 4 template and consent contracts.

Deliverables:

- append-only usage ledger and atomic reservations;
- Organization quota and budget policy;
- Meta limit/quality snapshot synchronization;
- per-account rolling recipient-window accounting;
- per-customer cooldown and campaign duplicate prevention;
- preview-before-send and stop-campaign behavior;
- usage/cost dashboard and reconciliation job.

Exit gate: concurrent sends cannot overspend quota, duplicate recipients are
not admitted, failed sends reconcile correctly, and the ledger can rebuild
summary totals.

### Phase 6: Feature migration

Status: **blocked by Phases 2–5**. Do not route POS bills, due reminders, or
promotions to Cloud API until the preceding account, template, policy, quota,
and dispatcher gates pass.

Dependencies: Phases 2–5.

Deliverables:

- POS bill document template send;
- due-reminder utility template send;
- promotion campaign template/media send;
- inbound replies and delivery status in existing messaging views;
- platform OTP/invite decision implemented or explicitly retired;
- no caller directly depends on Baileys or QR state.

Exit gate: the full controlled checklist passes for bill, due reminder,
promotion, media, inbound reply, status updates, failed delivery, and quota
enforcement.

### Phase 7: Customer migration and Baileys retirement

Status: **not started**. Keep the Baileys worker, QR-compatible contracts, and
port `8100` until the Phase 6 controlled checklist and migration gates pass.

Dependencies: Phases 0–6 and migration runbook approval.

Deliverables:

- Organization migration inventory and export;
- customer-by-customer Cloud API connection;
- safe outbox freeze/drain/rebuild process;
- old-account retirement and historical-data verification;
- final removal of QR/Baileys code, data, deployment, and port 8100.

Exit gate: zero active Baileys accounts or unsafely recoverable Baileys sends;
Cloud API-only production monitoring and support runbooks are live.

No implementation phase may skip its exit gate to reach the cleanup phase.
Code-only contract and runtime work may proceed with the external Phase 0 gate
deferred, but no live onboarding, provider send, or production cutover is
authorized until the external gate passes.

## Implementation loop state

Last updated: 2026-08-22

- Loop 1 — **complete**: fail closed at the legacy-to-Cloud boundary. Legacy
  invoice, due-reminder, promotion, and inbox-text paths reject Cloud accounts,
  and the Cloud dispatcher claims only Cloud template outbox rows.
- Verification: Cloud-focused suite passes 87 tests; `git diff --check` passes.
- Loop 2A — **complete**: wire the Cloud outbox scheduler behind the explicit
  `WHATSAPP_CLOUD_OUTBOX_ENABLED` gate and prevent overlapping dispatch cycles.
- Loop 2B — **complete**: carry the message idempotency key as bounded provider
  callback data, correlate a later status to an uncertain message without
  recipient/time heuristics, and atomically settle its `reconciling` outbox row.
- Verification: Cloud-focused suite passes 89 tests; backend TypeScript still
  reports the repository's existing unrelated test-contract errors; no errors
  remain in the changed Cloud files.
- Loop 3 — **complete**: require caller-owned template idempotency keys, make
  Cloud template enqueue replay-safe at the database boundary, follow bounded
  same-origin Graph pagination, and reject malformed provider template identity,
  timestamps, and components.
- Verification: Cloud-focused suite passes 91 tests; `git diff --check` passes;
  the full backend TypeScript check still reports only the repository's
  pre-existing unrelated test-contract errors.
- Loop 4 — **complete**: persist resumable provisioning state and opaque vault
  bindings, resume failed attempts without exchanging the authorization code,
  record refresh failures durably, and persist webhook heartbeats.
- Verification: Cloud-focused suite passes 92 tests; `git diff --check` passes;
  the full backend TypeScript check still reports only the repository's
  pre-existing unrelated test-contract errors.
- Loop 5A verification: Cloud-focused suite passes 95 tests; `git diff
  --check` passes; the full backend TypeScript check still reports only the
  repository's pre-existing unrelated test-contract errors; `dbmate up`
  applied the template-admission, resumable-provisioning, and quota-ledger
  migrations successfully against the configured local database.
- Loop 5A — **complete**: add an atomic Organization quota reservation,
  append-only usage/cost ledger, reservation settlement/release on direct and
  uncertain sends, and repair the Cloud template message-content constraint.
- Loop 5B — **complete**: add configurable rolling account windows, account
  pacing, customer cooldown, campaign-recipient uniqueness, atomic stop for
  pending/retryable Cloud campaign rows, and ledger reconciliation reporting.
- Loop 5B verification: Cloud-focused suite passes 96 tests; `git diff
  --check` passes; the full backend TypeScript check still reports only the
  repository's pre-existing unrelated test-contract errors; `dbmate up`
  applied the delivery-safety migration successfully against the configured
  local database.
- Loop 6 — **complete**: expose authenticated quota-policy, usage,
  reconciliation, and Cloud campaign-stop controls, and populate provider
  quality/limit snapshots during Cloud provisioning and refresh.
- Loop 6 verification: Cloud-focused suite passes 96 tests; `git diff
  --check` passes; the full backend TypeScript check still reports only the
  repository's pre-existing unrelated test-contract errors; database status
  remains fully applied with no pending migrations.
- Loop 7 — **in progress**: migrate bill, due-reminder, promotion/media, and
  inbound feature callers behind the Cloud feature flag; keep legacy paths
  fail-closed until the controlled provider acceptance run passes.
- Loop 7A — **complete; caller migration not started**: deepen the shared Cloud
  template enqueue seam with connected-account, Store, and WABA binding scope
  checks, and add typed component construction for text, currency, date/time,
  document, image, and URL-button parameters. Required placeholders, media
  formats, HTTPS links, and button indexes are rejected before enqueue.
- Loop 7A verification: Cloud-focused suite passes 102 tests; changed Cloud
  files have no TypeScript errors; `git diff --check` passes. The full backend
  TypeScript check still reports only the repository's existing unrelated
  test-contract errors. No bill, due-reminder, promotion, or inbound caller
  was migrated in this sub-loop.
- Rule: each loop must end with focused verification, a two-axis review, a
  committed narrow diff, and this state update before the next loop starts.

## Current execution sequence

The main-branch merge and the recent TypeScript/database alignment commit are
repository maintenance, not a completed Cloud migration phase. From the
current branch, work proceeds in this order:

1. **Close the baseline gate.** **Complete.** Confirmed API fallback and
   merged application contract mismatches are aligned, the affected focused
   regression set passes, and the remaining broad-suite failures are isolated
   Bun test-harness contamination rather than confirmed source failures.
2. **Defer Phase 0 external setup until integration.** **Release gate.** Keep
   the billing owner, consent wording, quota/budget policy, secret manager/
   region, phone-migration policy, Meta App access, test WABA/number, and
   verified HTTPS webhook checklist documented; these do not block code-only
   implementation but must pass before live verification.
3. **Close the Phase 1 database/security gate.** **Code-first implementation
   complete; evidence open.** Wire the deployment-selected credential-vault
   adapter, run `verify-whatsapp-cloud-foundation`, and prove additive
   migrations against a production-shaped database copy without exposing
   secrets. The atomic WABA/sender persistence and key-version rotation seams
   are already implemented.
4. **Close the Phase 2 provider gate.** **Code-first runtime complete; evidence
   open.** Bind the deployment credential vault and private-storage adapter,
   apply and verify the migrations, run the Cloud receipt/outbox fixture and
   database checks, and complete controlled Meta verification. Uncertain sends
   now carry a bounded callback token and settle from a later provider status;
   unresolved rows still require an operational timeout/dead-letter policy.
5. **Close the Phase 3 account-operations gate.** **Code-first implementation
   complete; evidence open.** The server-side exchange and provider
   discovery, idempotent WABA/sender persistence, WABA subscription, safe
   connect, reconnect, revoke, refresh, and Store assignment paths are
   implemented, including resumable provisioning attempts, durable refresh
   failures, and webhook heartbeats. Deployment-selected secret-manager
   assembly, Meta test-WABA verification, migration execution, and the
   production-shaped reload/reconnect/inbound acceptance run remain.
6. **Complete the Phase 4 external gate.** The 4A asset/binding, 4B consent/
   suppression, and 4C send-time admission seams are code-first complete. Apply
   migrations, connect the Admin/POS commands, and run the controlled Meta
   template/consent acceptance tests before production sends.
7. **Close the Phase 5 external gate.** **Code-first implementation complete;
   evidence open.** The append-only usage ledger, atomic quota/budget
   reservations, provider quality/limit snapshots, rolling recipient windows,
   cooldown/duplicate admission, campaign stop, and reconciliation controls
   are implemented. Apply policy in the target environment and run concurrent
   send, failure-release, and controlled provider checks.
8. **Only then implement Phase 6.** **Code-first Loop 7 complete; external
   rollout gate open.** Migrate bill documents, due reminders, promotions/media, inbound
   replies, and delivery statuses behind an explicit Cloud feature flag while
   Baileys remains available for controlled rollback. The current working
   diff has migrated the planned feature callers; rollout evidence remains open.
9. **Only after the Phase 6 checklist passes, execute Phase 7.** Freeze and
   drain Baileys, migrate Organizations one by one, verify historical data, and
   remove QR/UI/auth-state/worker/port-8100 code in a separate cleanup release.

The current code slice is the Loop 7 implementation. Bill/document,
due-reminder, promotion/media, inbound, and status integration are implemented
behind the caller gate. Phase 6 remains blocked until the provider/runtime,
quota, consent, storage, and controlled Meta acceptance gates are closed.

## Loop 7 plan: migrate feature callers to Cloud templates

Status: **code-first complete; external rollout gate open**.

### Objective and invariants

Route the existing bill, due-reminder, promotion/media, inbound, and delivery
status use cases through the Cloud template outbox without changing Sales,
Payments, Customer Ledger, conversation ownership, or Store assignment
semantics. A POS/Admin request must only prepare and enqueue durable work; it
must never wait for a Graph API call.

The implementation must preserve these invariants:

1. Cloud sends use an approved, active, Store-scoped binding for the same WABA
   as the assigned Cloud account.
2. Every send passes the existing consent, suppression, category, cooldown,
   recipient-window, account-pacing, quota, and campaign-duplicate controls.
3. Every queued message has a caller-owned idempotency key and an immutable
   template/component snapshot. Retrying a request or dispatcher lease cannot
   create a second logical send.
4. A bill document or promotion image is never put in a template body or
   exposed through an unsafe private-storage URL. The selected media strategy
   must be explicit and bounded.
5. Baileys behavior remains unchanged for legacy accounts during the rollout;
   Cloud accounts never fall back to Baileys. The feature flag fails closed.
6. Inbound messages and provider statuses continue to use the existing
   Store-scoped conversation/message model and remain idempotent.

### Sub-loop 7A — shared Cloud feature-caller seam

Research and design before editing:

- Map each caller to its current account lookup, customer consent lookup,
  message/template selection, idempotency key, conversation, outbox, status,
  and UI response contract.
- Define one shared Cloud caller helper that resolves the Store/account,
  selects the default or explicitly requested Cloud binding, validates the
  binding/account/WABA relationship, and calls
  `enqueueCloudTemplateSend`.
- Define a typed component-parameter builder for text, currency, date/time,
  document, image, and URL-button parameters. It must validate the provider
  component shape and reject missing/extra parameters before enqueue.
- Decide the exact Cloud feature flag and rollout scope. It must be explicit,
  observable, and fail closed; enabling the outbox worker alone must not
  silently switch feature callers.
- Define response/status mapping so existing POS/Admin screens can show
  queued, sending, sent, delivered, read, failed, retryable, reconciling, and
  stopped states without provider-specific identifiers.

Exit criteria: one shared seam has unit tests for account/binding mismatch,
inactive/unapproved templates, missing parameters, consent/suppression,
idempotent replay, quota rejection, and legacy-account preservation. No
feature caller is migrated in this sub-loop.

### Sub-loop 7B — bill/document send

- Reuse the existing sale validation, customer phone validation, invoice PDF
  rendering, deterministic object key, size limit, and private upload path.
- Replace the Cloud rejection in `invoice.ts` with a Cloud template enqueue
  path using the Store's approved bill binding and typed sale/customer/store
  variables.
- Use a Cloud document header component only when the approved template
  declares one. The document parameter must use a provider-accepted media ID
  or a short-lived, authenticated-by-storage public link according to the
  deployment storage decision; never pass a private MinIO key as a link.
- Preserve `invoice:<saleId>` idempotency and make media cleanup safe when
  admission/enqueue fails. A duplicate request must return the existing
  queued record and must not render/upload/send a second invoice.
- Keep custom free-form bill text out of the business-initiated Cloud path.
  If the product keeps custom text, it must be represented by approved
  template variables or be explicitly limited to a valid 24-hour customer
  service window.
- Keep invoice status/retry endpoints working against the common Cloud outbox
  status model.

Exit criteria: bill enqueue tests cover document-header mapping and explicit
rejection of text-only/image/video bill assets, missing/oversized PDF,
private-media failure, duplicate request, unapproved binding, consent failure,
quota failure, and legacy Baileys regression. A controlled provider test
confirms one document arrives and its status is reconciled.

Implementation evidence: 7B uses the existing private object storage path and
generates a bounded HTTPS signed URL for the approved Cloud document header
(`WHATSAPP_CLOUD_MEDIA_URL_TTL_SECONDS`, default 24 hours, maximum 7 days).
Cloud bill sends reject custom free-form text and fail closed when the selected
Store template is not bound to an approved document-header asset. Local bill
tokens are mapped to the approved Cloud component order; mismatches are
rejected before enqueue. The Cloud outbox stores `sale_id`, so existing invoice
status and retry endpoints recognize both legacy invoice rows and Cloud
template rows without broadening the match to unrelated templates.

Verification: the focused Cloud, invoice-text, and invoice-component suites pass
(107 tests, 0 failures); changed-file backend type checking reports no errors;
`git diff --check` passes. A provider document delivery test and production
storage/HTTPS verification remain external gates.

### Sub-loop 7C — due-reminder utility send

- Replace the Cloud rejection in `queueDueReminderForStore` with the shared
  Cloud utility-template route.
- Build deterministic variables for customer name, total due, bill count,
  store name, and the selected bill/invoice reference. If the approved
  template supports a dynamic bill list, define its component contract; do
  not insert an arbitrary rendered multi-line body into an unapproved
  template.
- Preserve per-bill idempotency/status behavior and prevent duplicate
  reminders on retry. For a customer-wide reminder, use a stable fingerprint
  of the Store, customer, due-bill set, and reminder policy window rather than
  a random key.
- Enforce utility consent, suppression, cooldown/duplicate policy, and due
  amount revalidation inside the transaction boundary before reservation.
- Keep the existing preview/status UI contract and return a useful conflict
  when no approved due-reminder binding exists.

Exit criteria: tests cover one bill, multiple bills, changed due amount,
duplicate/replay, no due bills, consent/suppression, missing binding, quota
rejection, and delivery status. A controlled provider test confirms the
utility template and rendered values.

Implementation evidence: 7C preserves the existing due-bill and status
validation, routes Cloud accounts through the shared utility-template admission
and outbox, rejects custom free-form text and media headers, and maps local
tokens plus active Store links to approved component order. Per-bill sends use
`due-reminder:<saleId>:<UTC-day>`; customer-wide sends use a SHA-256 fingerprint
of the Store, customer, due-bill IDs/amounts, and UTC-day. Existing reminder
status lookup recognizes Cloud template rows while preserving legacy text rows.

Verification: due-reminder component and legacy formatter tests pass; changed-
file backend type checking reports no errors; `git diff --check` passes. A
controlled provider utility-template test and target-database consent/quota
verification remain external gates.

### Sub-loop 7D — promotion campaign and media send

- Replace the legacy per-recipient promotion inserts with Cloud template
  admission and the Cloud campaign key/quota reservation path.
- Keep recipient selection bounded, consent-aware, suppression-aware, and
  deterministic. Record campaign and recipient rows against the common
  message/outbox IDs so the current dashboard and pagination remain useful.
- Require an approved marketing template and marketing opt-in for every
  recipient. Do not use a free-form promotion body for Cloud business-
  initiated sends.
- Support optional image media only through an approved image header
  component. Choose one shared media path: upload once to Meta and reuse its
  media ID where valid, or generate a safe provider-accepted link per the
  storage policy. Enforce MIME/type/size limits and delete private temporary
  objects only after durable enqueue or a safe cleanup decision.
- Preserve Redis Store cooldown as a fast UX guard, but make the database
  campaign key, quota reservation, recipient uniqueness, and stop-campaign
  operation authoritative under races.
- Ensure partial failures return a resumable campaign state; they must not
  silently report all recipients as queued.

Exit criteria: tests cover text-only, image-header, mixed recipient eligibility,
campaign duplicate, concurrent campaign creation, cooldown race, quota race,
stop-before-dispatch, partial enqueue, media failure, and provider status
aggregation. A controlled provider test confirms approved marketing delivery
and a stopped campaign sends no new recipients.

Implementation evidence: 7D creates the local campaign and recipient shell
before enqueue, then routes each recipient through the shared marketing
template admission, consent, quota, idempotency, and campaign-key path. Cloud
outbox creation atomically links its message/outbox to the campaign recipient;
partial admission failures become recipient dead letters and the response
reports the actual queued count. Campaign claim, retry, delivery, failure, and
stop transitions now update recipient/dashboard state for Cloud template rows.
Images use a bounded private object and HTTPS signed URL, and are accepted only
when the approved asset declares an image header. Cloud promotions currently
require the request body to match the Store's active local promotion template;
arbitrary free-form marketing text is rejected.

Verification: the combined Cloud, invoice, due-reminder, and promotion
component suite passes (108 tests, 0 failures); changed-file backend type
checking reports no errors; `git diff --check` passes. Campaign database
assertions and controlled Meta marketing delivery/stop tests remain external
gates.

### Sub-loop 7E — inbound and delivery/status integration

- Verify Cloud webhook normalization routes inbound messages to the existing
  Store-scoped conversation using `(account, Store, external chat)` and does
  not reuse another Store's conversation.
- Verify inbound text/media, opt-out keywords, and provider status events are
  idempotent and do not create orphan messages or cross-Store foreign-key
  violations.
- Reconcile accepted, delivered, read, failed, and uncertain statuses into
  the existing message/outbox/campaign/invoice/due-reminder views. Preserve
  provider failure details in bounded operator-safe fields.
- Define the timeout/dead-letter policy for `reconciling` rows and make the
  retry/replay operation safe before enabling feature callers.
- Confirm the UI polls/refetches status without forcing a page reload and
  avoids showing provider IDs as user-facing Store/account labels.

Exit criteria: webhook fixtures plus database assertions cover duplicate
events, status-before-message, unknown account, wrong Store, opt-out, inbound
reply, uncertain send reconciliation, dead lettering, and replay.

Implementation evidence: 7E keeps Cloud inbound routing Store-scoped through
the existing `(account, Store, external chat)` conversation writer, preserves
durable webhook claim/replay/dead-letter behavior, and records exact inbound
STOP/UNSUBSCRIBE/CANCEL/END/QUIT commands as auditable customer suppression
events. Cloud provider failure callbacks now finalize any non-terminal outbox,
release only still-reserved quota, and update linked promotion recipients and
campaign aggregates; late failures after an accepted send no longer remain
marked sent in the outbox. Legacy Baileys inbound behavior remains unchanged.

Verification: Cloud webhook, normalization, processor, and opt-out tests pass;
changed-file backend type checking reports no errors; `git diff --check` passes.
Target-database foreign-key/integrity assertions and controlled webhook/status
replay tests remain external gates.

### Sub-loop 7F — controlled rollout and closeout review

- Add an organization/account feature flag with a documented default-off
  rollout and an immediate rollback switch that stops new Cloud feature
  admissions without deleting queued work.
- Run focused Cloud tests, affected legacy invoice/due/promotion tests,
  database integrity checks, `dbmate status`, and `git diff --check`.
- Run two-axis review: repository standards/architecture and Phase 6 spec
  correctness. Review SQL transaction boundaries, idempotency, authorization,
  PII/secret handling, media retention, logs, and error messages.
- Execute a controlled test WABA run for one bill, one due reminder, one
  promotion, one inbound reply, duplicate webhook, failed delivery, uncertain
  submission, quota rejection, campaign stop, and page reload/reconnect.
- Update this plan with evidence and only then mark Phase 6 complete. Do not
  start Phase 7 or remove Baileys/QR/port 8100 in this loop.

Implementation evidence: 7F adds the default-off
`WHATSAPP_CLOUD_CALLERS_ENABLED` admission switch; the independent
`WHATSAPP_CLOUD_OUTBOX_ENABLED` worker switch remains default-off. Focused
tests for the complete WhatsApp module pass (123 tests, 0 failures), changed-
file backend type checking reports no errors, `git diff --check` passes, and
`dbmate status` from `apps/backend` reports 70 applied and 0 pending
migrations. Full backend type checking still reports pre-existing unrelated
platform/billing test-contract errors. No provider WABA, vault, production
HTTPS storage, target-DB integrity, or controlled end-to-end acceptance run was
claimed here.

### Loop 7 stop conditions and decisions required before coding

Coding pauses if any of these are unresolved because they change the public
contract or create delivery risk:

- deployment-selected credential vault and private/public media strategy;
- exact approved Meta template names, languages, categories, and component
  bindings for bill, due reminder, and promotion;
- consent/opt-in evidence and opt-out behavior for utility and marketing;
- whether bill PDFs are delivered as a template document header or as a
  separately approved media flow;
- Cloud feature-flag owner and rollback behavior;
- reconciliation timeout/dead-letter policy for uncertain provider sends.

The first coding pass after approval is Sub-loop 7A only. Each subsequent
sub-loop is implemented, tested, reviewed, and committed separately; no
caller migration is bundled with Baileys retirement.

## Target architecture

```text
POS/Admin UI
    |
    | authenticated Hisab command
    v
Backend WhatsApp module
    |
    | validates Store, opt-in, template, quota, cooldown, and account state
    v
PostgreSQL message + outbox + usage ledger
    |
    | leased Cloud API dispatcher
    v
Meta Graph API
    |
    | HTTPS webhook: inbound messages, statuses, template/account events
    v
Webhook ingress -> provider-event inbox -> normalizer -> conversations/messages
```

The external seam is a deep `WhatsAppMessaging` module. Billing, POS, and
campaign callers know only the Hisab command/result contract. They do not know
Graph API paths, access tokens, Meta component syntax, or retry rules.

Backend owns onboarding, account state, webhook ingress, template
synchronization, and quota admission. A dedicated internal Cloud dispatcher
owns outbox leases and Graph API calls. It has no public HTTP port; its health
and metrics are reported through the backend's authenticated internal seam.
This keeps slow provider calls and backpressure out of API request handlers and
eliminates the old port-8100 WebSocket worker.

The implementation may contain small internal adapters for Graph API HTTP,
credential storage, media storage, template synchronization, and webhook
normalization. Those are internal seams; the application must not expose a
provider choice that no longer exists.

## Domain invariants

These invariants must be enforced in the backend and, where possible, by the
database:

1. A connected Cloud API account belongs to exactly one Organization.
2. A Cloud API account may be assigned to many Stores in that Organization.
3. A Meta Phone Number ID and WABA ID are globally unique in Hisab; they cannot
   be connected to two Organizations.
4. Every outbound row records the Organization, Store, account, recipient
   snapshot, message intent, and idempotency key.
5. Every inbound conversation is resolved by account, Store, and external chat
   identity. An account assigned to multiple Stores must have deterministic
   default inbound routing.
6. A Meta token is never returned in any DTO, log, error, or client payload.
7. A message cannot be queued if its account is not provisioned and usable.
8. A business-initiated notification cannot be queued without an approved Meta
   template and a valid recipient opt-in.
9. A campaign recipient is counted once per campaign and once per unique
   recipient window, even if the dispatcher retries.
10. A provider webhook may be delivered more than once; duplicate events must
    be harmless.
11. A message status can move forward but must not move from delivered/read
    back to queued/sending.
12. A quota reservation is created atomically with message enqueueing and is
    reconciled from provider status events.
13. Store scoping is checked server-side from the authenticated Organization;
    client-supplied Store or account IDs cannot cross tenant boundaries.

For an account shared by multiple Stores, outbound Store scope comes from the
sale, reminder, or campaign. Inbound messages use the account's explicit
default inbound Store unless a future routing rule resolves them more
specifically. The system must never guess a Store from a customer name alone.

## Account and credential model

### Account lifecycle

Replace QR-specific lifecycle states with Cloud API states:

- `pending_authorization`: no completed Embedded Signup authorization;
- `provisioning`: authorization received; WABA/phone/webhook setup is running;
- `connected`: account is registered, subscribed, and usable;
- `needs_action`: Meta requires a customer/operator action;
- `disconnected`: temporary provider or credential problem;
- `revoked`: authorization or phone access was revoked;
- `suspended`: provider/account policy or quality restriction;
- `failed`: provisioning failed permanently until retried or reconnected.

The API must return a stable user-facing reason and a safe remediation action,
not a raw Graph API payload.

### Provider identifiers

Model the Meta WABA and its sender phone number separately. A WABA can own
more than one phone number, while templates and many management operations are
WABA-scoped. The Hisab concepts are:

- `whatsapp_business_account`: Organization-scoped Meta WABA and encrypted
  credential/authorization record;
- `whatsapp_account`: one Meta sender phone number under that WABA, retaining
  the existing Store assignment and message/outbox relationship;
- `whatsapp_account_stores`: the many-to-many Store assignment with one
  explicit default inbound Store;
- Meta template binding: attached to the WABA, then mapped to Store/use-case
  presets.

Add sender-specific metadata with clear ownership:

- Meta Phone Number ID;
- display phone number;
- verified business/display name;
- Meta quality rating and quality timestamp;
- Meta messaging limit and last synchronization time;
- credential reference, never the raw credential;
- token version/rotation metadata;
- last webhook and Graph API health timestamps;
- last provider error code and safe message.

`phone_number` is a display/business value. It must never be confused with
Meta's Phone Number ID or WABA ID.

If the first implementation keeps WABA fields on `whatsapp_accounts` for
delivery speed, it must still enforce WABA-level template synchronization and
must not create duplicate template approval state for every phone number. A
follow-up normalization migration can move those fields into the parent table.

### Credential security

- Exchange Embedded Signup results on the backend over HTTPS.
- Encrypt tokens before persistence using an application key-management seam or
  secret-manager reference.
- Store key version metadata to support rotation.
- Decrypt only inside the Cloud API command/dispatcher implementation.
- Redact tokens, authorization codes, webhook secrets, media URLs, full phone
  numbers, and message bodies from logs.
- Use least-privilege system users and request only the Meta permissions needed.
- Provide credential rotation and revoke/reconnect operations.
- Do not reuse the old global OTP/invite token for customer-owned WABAs.

## Database plan

All changes are forward-only dbmate migrations. Never edit an already-applied
migration.

### Migration A: Cloud account foundation

Status: **partial and additive migration applied to development only**. The
current migrations add Cloud lifecycle enums, WABA/sender snapshot columns,
provisioning-attempt storage, webhook timestamps, `reconciling` outbox status,
webhook receipts, and onboarding-state replay storage. They do not yet provide
encrypted credential storage, live provisioning persistence, or a
production-shaped backfill verification.

Add Cloud API fields and constraints while the old Baileys fields still exist:

- `whatsapp_business_accounts` parent records for WABA identity and
  authorization;
- sender-level Phone Number ID and parent WABA reference;
- verified display name and provider quality/limit snapshots;
- credential reference and credential key version;
- Cloud lifecycle status and safe provider error fields;
- webhook/health timestamps;
- globally unique WABA and Phone Number ID constraints;
- explicit account-level billing/quality/limit synchronization timestamps;
- resumable provisioning-attempt records with idempotency key, current step,
  completed steps, and safe failure state.

Keep existing rows readable. Do not mark an account Cloud-connected until all
required external steps have succeeded and their results have been persisted.
Database updates remain short, atomic transactions around each step.

Add `reconciling` to the outbox lifecycle before implementing uncertain-send
handling. A timeout after a provider submission must not be represented as
ordinary retryable work.

The migration must not make the old `UNIQUE (whatsapp_account_id,
external_chat_id)` conversation key the final key for a shared account. The
final Store-scoped key must be `UNIQUE (whatsapp_account_id, store_id,
external_chat_id)` with matching foreign-key/index support, so the same
customer chat can exist in separate Store contexts without cross-Store foreign
key failures.

### Migration B: Template and binding model

Status: **not started**. The existing `whatsapp_message_templates` table is a
Hisab-local preset model; it is not the Meta WABA template/binding model
defined below.

Separate the existing Hisab template preset from Meta's template asset:

- Hisab preset: kind, name, local preview, token mapping, active/default state;
- Meta binding: WABA/account, Meta template ID/name, language, category,
  component definition, approval state, rejection reason, last sync time;
- immutable template version or binding history for messages already queued;
- campaign/use-case binding to the approved Meta template version;
- unique constraints preventing two active defaults for one Store/use case.

The send path stores the selected template binding/version on the outbox row so
later edits cannot change a message already queued.

### Migration C: Consent and suppression

Status: **partial local behavior only; schema/decision gate open**. Existing
marketing opt-out fields and campaign selection rules must be audited and
extended with auditable opt-in source, wording/version, utility consent, and
suppression precedence before marketing is enabled through Cloud API.

Add auditable customer messaging consent:

- marketing opt-in state and timestamp;
- utility/bill-reminder opt-in state and timestamp where required by product
  policy;
- source and wording/version of the consent;
- opt-out timestamp and reason;
- suppression state that takes precedence over campaign selection.

Existing customers must not be silently treated as opted in. Provide an
explicit migration/default policy before enabling promotions.

### Migration D: Quota, usage, and cost ledger

Status: **not started**. Existing pending-outbox limits, cooldown records, and
campaign statistics are not a replacement for this append-only ledger.

Add append-only usage accounting rather than mutable counters alone:

- Organization/account/Store scope;
- message and campaign identifiers;
- recipient identity hash or safe reference;
- message category and intent;
- reservation, submitted, delivered, failed, released, and reconciled states;
- Meta message ID and provider error code;
- quantity, currency, estimated cost, actual cost when available;
- timestamps and idempotency key.

Quota accounting must include a normalized recipient-window key scoped to the
Cloud API account and rolling-window period. Meta limits are account/number
concerns, not independent per-Store allowances; Store usage is attribution,
while admission must prevent all Stores sharing one number from collectively
exceeding the account policy.

Add a quota policy/configuration record for:

- monthly quota;
- rolling daily recipient cap;
- promotion cap;
- per-recipient cooldown;
- monthly budget;
- optional auto-stop behavior.

Use the ledger as the audit source. Cached usage summaries may be rebuilt from
it and must never be the only record.

### Migration E: Outbox/provider cleanup

Status: **deferred until Phase 7**. Keep the provider discriminator, QR/session
columns, Baileys worker, and historical rows until the migration inventory and
drain/reconciliation gates pass.

During migration, retain enough old columns to drain and audit Baileys rows.
After the final cutover and retention window:

- add Cloud-specific message intent/template/recipient metadata;
- add a final account/template/recipient snapshot so historical messages do not
  depend on mutable current templates;
- remove QR response fields and worker-only constraints;
- remove `session_reference` after verifying no remaining use;
- remove Baileys rows/auth references only after backup and reconciliation;
- remove the provider enum/column only in a final forward migration if it has no
  remaining audit value. Product/API contracts must stop exposing provider
  selection earlier.

### Migration F: legacy platform notifications

Status: **decision required**. The global platform notification path must be
explicitly migrated to a separately scoped platform account or retired; it
must not be silently folded into customer-owned WABAs.

The existing global OTP/invite notification path is a separate credential and
tenant model. Before final Baileys/legacy cleanup, choose one explicit route:

- migrate OTP/invite delivery to a dedicated Hisab-owned Cloud API WABA and
  template set; or
- remove WhatsApp as an OTP/invite channel and use the approved replacement
  channel.

It must not continue using one global `WHATSAPP_API_TOKEN` for customer-owned
Organization accounts. If a dedicated platform account is retained, model it
as a separately scoped system account with its own templates, quota, audit, and
incident policy; do not expose it as a Store's WhatsApp account.

## Meta onboarding flow

1. Hisab admin opens `Connect WhatsApp` for an Organization.
2. Backend creates a short-lived onboarding state bound to the authenticated
   Organization/user and an anti-CSRF state value.
3. Frontend launches Meta Embedded Signup using the approved App configuration.
4. Meta returns the authorization result to the frontend callback.
5. Frontend sends the short-lived result to the backend; the backend validates
   state and exchanges it server-side.
6. Backend discovers the shared WABA and Phone Number ID and reconciles them
   against existing Hisab identities.
7. Backend creates or reuses the Organization's WABA parent record.
8. Backend assigns/validates the required system-user access.
9. Backend registers the phone number when required, including secure PIN
   handling.
10. Backend subscribes the WABA to the Hisab App webhook.
11. Backend fetches the phone status, quality, limits, and approved templates.
12. Backend stores encrypted credential metadata and updates the sender account
    in a short database transaction after each verified provisioning step.
13. UI shows the connected display number and asks the admin to assign the
    account to Stores.

Provisioning must be resumable and idempotent. If step 7, 8, 9, or 10 fails,
the user sees the exact safe next action and can retry without creating a
second account or duplicate assignment.

Meta API calls cannot participate in the PostgreSQL transaction. Create a
provisioning-attempt record with an idempotency key and completed-step markers;
persist each successful external identifier before continuing. A retry resumes
from the last verified step and reconciles existing WABA/phone assignments
before creating anything new.

If a number is already used by another Meta/WABA setup, show Meta's actual
eligibility/conflict error. Do not silently unlink or migrate a number.

## Webhook design

### Ingress

- Public HTTPS endpoint only.
- Implement Meta verification challenge handling.
- Verify `X-Hub-Signature-256` against the raw request body with constant-time
  comparison.
- Reject malformed, oversized, unsigned, and stale requests according to the
  configured policy.
- Persist an idempotent provider-event row and acknowledge quickly.
- Do not process media downloads or long Graph calls during webhook response.

### Normalization

Normalize inbound payloads into the existing Hisab message model:

- resolve `phone_number_id` to the Cloud API account;
- resolve the account to Organization and default/assigned Store;
- derive external chat ID and normalized customer phone;
- create or reuse the Store-scoped conversation;
- insert inbound message once by provider message ID;
- enqueue media fetch asynchronously using the provider media ID;
- process outbound status updates as monotonic transitions.

Template approval, quality, phone status, WABA review, and account events must
also update the account/template snapshots through the same idempotent inbox.

## Outbound dispatch

The dispatch loop is a backend-owned Cloud API module or a separate Cloud API
worker. It must not be the old Baileys worker.

### Enqueue transaction

The enqueue command must, in one transaction:

1. authorize Organization, Store, customer, and account;
2. normalize and snapshot recipient information;
3. validate consent and suppression;
4. validate the template binding/category and required parameters;
5. validate cooldown and duplicate campaign recipient rules;
6. reserve quota/budget;
7. create message and outbox rows with an idempotency key;
8. record the selected template version and intent.

If any check fails, no outbox row or quota reservation may remain.

### Dispatch behavior

- Lease rows with `FOR UPDATE SKIP LOCKED`.
- Use per-account concurrency and rate limits.
- Apply separate Graph API request throttling from Meta's notification-recipient
  limit; one is transport capacity and the other is messaging policy.
- Use bounded exponential backoff with jitter for retryable Graph errors.
- Do not retry permanent template, recipient, policy, or authorization errors.
- Send the correct Meta message category and template payload.
- Upload media through the private storage/Meta media flow; never send arbitrary
  untrusted URLs without validation.
- Persist the returned `wamid` before acknowledging success.
- Reconcile status through webhook events, not optimistic delivery claims.
- Reconcile quota and cost from final status.
- Move exhausted failures to dead letter with an operator-visible reason.

### Idempotency

Use separate idempotency boundaries:

- Hisab command key for duplicate user actions;
- campaign/recipient uniqueness for bulk sends;
- outbox row ID for internal dispatch;
- Meta provider message ID for status and webhook deduplication.

If a Graph request times out after submission, do not blindly send again. Mark
the row as `reconciling` and use a provider-supported reconciliation path or
operator review before retrying. If Meta cannot prove whether the message was
accepted, the system must prefer a visible uncertain/dead-letter outcome over
silently sending a duplicate.

## Template lifecycle

### Concepts

1. Hisab preset: friendly Store-facing content and variable preview.
2. Meta template: the approved WABA asset that can actually be sent.
3. Binding: the mapping between a Hisab use case and a Meta template version.

### Rules

- Bill, due reminder, and promotion are separate use cases.
- Bills and due reminders use Utility templates when they describe a specific
  sale or receivable balance.
- Promotions use Marketing templates and require marketing opt-in.
- URL buttons must be declared in the Meta template; a local reusable link
  cannot bypass Meta approval.
- Template variables are mapped server-side and validated for count, order,
  type, and length.
- A rejected, paused, disabled, or missing template cannot be queued.
- Editing a local preset creates a new binding/version when the Meta structure
  changes.
- The UI displays sample preview values but never presents preview as proof of
  Meta approval.

### UI

Keep the WhatsApp UI simple:

- `Account`: connected number, business name, status, quality, Meta limit,
  assigned Stores, reconnect/action state;
- `Templates`: Bill, Due reminder, Promotion cards with Meta status, mapped
  variables, preview, and safe sync/submit action;
- `Usage`: Hisab quota, Meta limit snapshot, delivered/failed counts, budget,
  and current period;
- `Campaigns`: recipient count, opt-in count, cooldown/limit warnings, queue
  status, delivered/read/failed counts, and stop action.

Do not expose raw WABA IDs, Phone Number IDs, access tokens, or Graph payloads
in the normal UI.

## Limits, quotas, and billing controls

There are four different controls and the UI must label them separately:

1. Meta messaging limit: provider-controlled unique notification recipients in a
   rolling window.
2. Meta quality: provider-controlled quality signal that can reduce delivery
   ability or limit.
3. Hisab product quota: Organization's plan allowance.
4. Hisab budget/cooldown: business safety controls against accidental or
   abusive sends.

Never hardcode a Meta limit tier as an Organization entitlement. Sync and show
the provider-reported value with its timestamp.

### Campaign admission

Before a campaign is queued, calculate:

- eligible customers with valid numbers;
- customers with required opt-in;
- customers not suppressed;
- unique recipients already contacted in the Meta rolling window;
- recipients remaining in the Hisab period quota;
- recipients remaining in the campaign cap;
- estimated provider and internal cost.

Show the operator the result before confirmation. If the campaign exceeds a
limit, do not silently truncate the audience; require an explicit smaller
audience or a documented split plan.

### Safety defaults

- New Organizations start with a conservative quota.
- Promotions require explicit confirmation and opt-in.
- Promotions have a configurable cooldown per recipient.
- Duplicate active campaigns for the same audience are blocked.
- Budget exhaustion stops new queueing but does not corrupt already-submitted
  messages.
- Manual stop cancels only unsent/cancellable rows and records the operator.
- Any provider quality warning pauses or throttles marketing campaigns while
  utility delivery remains separately visible.

## Baileys migration and removal sequence

### Gate 0: freeze

- Stop creating new Baileys accounts.
- Stop adding new QR UI entry points.
- Stop adding features to the Baileys worker.
- Inventory every account, Store assignment, queued row, retryable row,
  conversation, and auth-state directory.

### Gate 1: internal Cloud API proof

- Configure Hisab Meta App, App Review/permissions, Embedded Signup, and HTTPS
  webhook.
- Connect one controlled test number.
- Verify template sync and approval state.
- Send a bill/document, due reminder, promotion, and inbound reply.
- Verify delivered/read/failed events and duplicate event handling.
- Verify quota reservation/reconciliation and failure classification.

### Gate 2: organization migration

For each Organization:

1. Export an account/message/outbox/usage reconciliation snapshot.
2. Ask the admin to connect the number through Embedded Signup.
3. Confirm WABA, Phone Number ID, number ownership, webhook subscription,
   account status, and template readiness.
4. Assign the Cloud API account to the intended Stores.
5. Pause new Baileys outbound work for that account.
6. Let in-flight work finish or mark it for safe reconstruction.
7. Rebuild unsent bill/reminder/promotion rows using approved Cloud templates.
8. Do not replay arbitrary old custom text outside the 24-hour window.
9. Enable Cloud API sends and verify one controlled message.
10. Mark the old Baileys account retired and retain its history for the
    retention period.

Cloud API cannot reuse Baileys auth state. A phone number migration is a Meta
onboarding/eligibility operation and must be explicitly completed.

### Gate 3: global cutover

Proceed only when:

- zero Organizations require Baileys for production sends;
- zero pending/retryable Baileys rows remain, or each has an approved
  reconstruction decision;
- zero active Baileys accounts remain in the database;
- Cloud API webhook and dispatcher metrics are healthy;
- backup and reconciliation reports are stored;
- support has the reconnect/template/quota runbook.

Then remove, in separate reviewed changes:

- QR dialogs, routes, polling, and worker status contracts;
- Baileys provider classes, packages, tests, and auth-state storage;
- port-8100 process, PM2 app, deployment copy rules, and environment entries;
- Baileys-only schema fields and provider branches;
- obsolete Baileys runbooks and research instructions;
- stale global WhatsApp worker configuration.

Do not delete historical message rows merely because the transport changed.

## Error model

Map provider errors into stable Hisab categories:

- `account_not_connected`;
- `authorization_required`;
- `phone_not_registered`;
- `template_pending`;
- `template_rejected`;
- `template_paused`;
- `recipient_not_opted_in`;
- `recipient_suppressed`;
- `meta_limit_reached`;
- `hisab_quota_reached`;
- `budget_reached`;
- `rate_limited`;
- `media_invalid`;
- `provider_transient`;
- `provider_permanent`;
- `unknown_reconciliation_required`.

Each error must define whether it is retryable, user-actionable, operator-
actionable, and quota-releasing. Raw Meta error text is retained only in
protected diagnostics with redaction.

## Observability and operations

Metrics must be split by Organization, account, Store, intent, and safe error
category where cardinality permits:

- webhook accepted/duplicate/rejected;
- webhook processing age and failure;
- outbox queued/processing/sent/delivered/read/failed/dead-letter;
- dispatcher latency and Graph response classes;
- retry and lease expiry counts;
- template approval/rejection/paused counts;
- account quality and limit snapshot age;
- quota reserved/released/delivered;
- campaign eligible/queued/delivered/failed counts;
- estimated and reconciled costs.

Alerts:

- webhook failures or stale events;
- dispatcher unavailable;
- growing dead-letter queue;
- stale account/limit/template synchronization;
- sudden quality downgrade;
- repeated authorization failures;
- quota ledger reconciliation mismatch;
- provider 429 or 5xx spike.

Runbooks must cover reconnect, token rotation, webhook verification, template
rejection, campaign stop, dead-letter replay, quota correction, provider
outage, and customer opt-out.

## Testing strategy

### Unit and contract tests

- Embedded Signup state/CSRF validation;
- Graph client request construction and error mapping;
- webhook signature verification;
- webhook payload normalization;
- duplicate webhook idempotency;
- monotonic message status transitions;
- Store/account/conversation scoping;
- template parameter validation;
- consent, suppression, cooldown, quota, and budget admission;
- usage reservation/reconciliation;
- outbox lease/retry/dead-letter behavior;
- media size/type and private storage handling.

### Database tests

- Organization/account/Store foreign keys;
- one default inbound Store per account;
- template binding uniqueness;
- campaign recipient uniqueness;
- concurrent quota reservation;
- duplicate enqueue idempotency;
- usage ledger rebuild;
- migration up on a production-shaped copy;
- rollback rehearsal for every pre-cutover migration where rollback is safe.

### Controlled integration tests

With a real Meta test WABA/number:

- Embedded Signup completion;
- phone registration and webhook subscription;
- approved, pending, rejected, and paused templates;
- text, document, image, and URL-button messages;
- inbound reply and 24-hour window behavior;
- delivered/read/failed status events;
- duplicate and out-of-order webhooks;
- revoked token/number and reconnect;
- rate limit and provider outage behavior;
- campaign opt-in, cooldown, quota, and stop behavior.

Local tests cannot prove Meta approval, phone eligibility, provider delivery,
quality changes, account limits, or real webhook behavior. Those require the
controlled integration environment.

## Release sequence

1. Ship additive database and shared-contract changes.
2. Ship Cloud API client, credential vault seam, webhook ingress, and event
   processor behind a disabled feature flag.
3. Ship template synchronization and account dashboard behind an internal-only
   flag.
4. Enable one internal Organization and one Store.
5. Run the complete controlled integration checklist.
6. Enable customer-by-customer migration.
7. Freeze and drain Baileys.
8. Remove Baileys in a separate cleanup release.
9. Remove the feature flag only after the post-cutover observation period.

Every release must include migration status, application version, webhook
health, dispatcher health, and usage reconciliation evidence.

## Acceptance criteria

The migration is complete only when all are true:

- A new customer can connect through Embedded Signup without QR or manual token
  entry.
- Hisab stores no raw Meta token in browser-visible data or logs.
- A connected account can be assigned to multiple Stores safely.
- Inbound messages route deterministically and do not cross Stores.
- Approved bill, due-reminder, and promotion templates send successfully.
- Unapproved templates are blocked with a useful message.
- Promotions require opt-in and respect suppression/cooldown.
- Duplicate campaign recipients cannot be queued twice.
- Meta status events update the same Hisab message idempotently.
- Hisab quota and budget checks are atomic under concurrent sends.
- Meta limit/quality information is visible with freshness timestamps.
- Retryable failures retry safely; permanent failures do not loop.
- Dead-letter rows are inspectable and replayable only when safe.
- Existing historical conversations and messages remain readable.
- No production Baileys accounts, QR routes, auth state, worker process, or
  port-8100 deployment remain.
- Production runbooks, monitoring, migrations, and support documentation match
  the Cloud API-only runtime.

## Decisions required before implementation

These are product/operations decisions, not implementation guesses:

1. Will Meta charges be paid directly by each Organization or through an
   existing Solution Partner/BSP with Hisab-managed billing?
2. What is the initial Hisab monthly quota and budget for each plan?
3. Which consent wording and opt-in sources will be accepted for bill,
   due-reminder, and marketing messages?
4. Which production region and secret manager will hold Cloud credentials?
5. What is the retention period for message bodies, media, webhook diagnostics,
   and usage ledger data?
6. What is the customer migration window and support policy for numbers that
   cannot be immediately registered with Cloud API?

Implementation must stop at these decision gates if the answer changes billing,
data retention, customer authorization, or number migration behavior.

## Source and repository references

- [Meta Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Meta Embedded Signup](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)
- [Meta Templates API](https://www.postman.com/meta/whatsapp-business-platform/folder/huymv7d/templates)
- [Meta template approval webhook](https://www.postman.com/meta/whatsapp-business-platform/request/enu4z5g/message-template-approved)
- [Meta platform pricing](https://whatsappbusiness.com/products/platform-pricing/)
- [Meta quality and messaging-limit guidance](https://whatsappbusiness.com/wp-content/uploads/2026/05/Utility-Messages-Playbook-English.pdf)
- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)
- [Existing Cloud API research](../research/2026-08-18-whatsapp-cloud-api-integration.md)
- [WhatsApp schemas](../../packages/types/src/services/whatsapp.schema.ts)
- [WhatsApp foundation migration](../../apps/backend/db/migrations/20260811100000_create_whatsapp_messaging_foundation.sql)
- [Organization account migration](../../apps/backend/db/migrations/20260816170000_organization_whatsapp_accounts.sql)
- [Customer messaging migration](../../apps/backend/db/migrations/20260816201000_customer_whatsapp_messaging.sql)
