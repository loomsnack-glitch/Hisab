# Ganatri WhatsApp + Baileys Production Plan

Status: Proposed execution plan; implementation proceeds one phase at a time.
Date: 2026-08-11
Scope: POS Web first; API and domain model reusable by mobile later.

## Objective

Allow a Store-Scoped POS Workflow to connect a store-owned WhatsApp account,
send a committed Sale as a private PDF to the selected Customer, and later
provide a WhatsApp-style customer conversation view for text and document
messages.

The integration will use Baileys behind an isolated worker. Baileys is an
unofficial WhatsApp Web connector; the system must make that risk explicit and
must not claim that account restrictions are impossible.

## Product defaults

- A WhatsApp account belongs to one Store by default.
- A Store may have at most one active Baileys account in the first release.
- A Customer must have a normalized phone number before an invoice can be sent.
- Invoice sending is asynchronous and never rolls back a completed Sale.
- A cashier may request invoice sending from the POS completion flow.
- Account linking, disconnecting, and session reset are admin-only operations.
- The first release supports text and PDF document messages only.
- Broadcasts, campaigns, groups, bulk sends, and automated marketing are out of scope.
- Conversations are customer-linked when the normalized phone number matches; unmatched chats remain visible for manual attachment.

## Existing constraints to preserve

- Internally use the Hisab billing vocabulary: Sale, Sale Item Snapshot, Customer, Payment, and Store Device.
- Do not create a duplicate Invoice domain. “Invoice PDF” is a presentation artifact of a committed Sale.
- POS mutation routes must remain Device-Scoped Billing Routes.
- Admin billing remains read-only; adding a message must not silently create or mutate billing data.
- Organization and Store scope must come from authenticated context and server-side authorization, never from trusted client input.
- Use the existing Hono route structure, Zod validation, `ServiceResponse`, repository/service split, Redis connection, MinIO/storage boundary, and migration conventions.
- Preserve the current WhatsApp Cloud API OTP/invitation path until a separate migration decision is approved.

## Architecture

```text
POS Web
  -> authenticated Ganatri API
  -> committed Sale + transactional outbox row
  -> Redis dispatch / worker lease
  -> isolated Baileys worker
  -> customer WhatsApp
```

The API owns tenancy, authorization, Sale snapshots, PDF generation, durable
message records, retries, and user-visible status. The worker owns Baileys
sessions, QR lifecycle, connection state, provider calls, and provider event
normalization.

### Provider boundary

POS and backend domain code must depend on a provider-neutral interface:

```ts
interface MessagingProvider {
    sendText(input: SendTextInput): Promise<ProviderSendResult>;
    sendDocument(input: SendDocumentInput): Promise<ProviderSendResult>;
    disconnect(accountId: string): Promise<void>;
}
```

Baileys-specific socket, auth-state, QR, and acknowledgement details stay
inside the worker adapter. The boundary leaves room for an official Cloud API
provider later without rewriting billing or the conversation UI.

## Domain and persistence model

All tables must have UUID primary keys, timestamps, required organization/store
scope where applicable, foreign keys, useful indexes, and explicit lifecycle
states. Sensitive fields must not be logged.

### `whatsapp_accounts`

- `id`
- `organization_id`
- `store_id`
- `provider`
- `phone_number` and normalized phone identity
- `status`: `pending_qr | connecting | connected | disconnected | failed | revoked`
- encrypted session reference, never raw session keys in API responses
- `last_connected_at`, `last_seen_at`, `last_error_code`
- `created_by`, `updated_by`

Constraints:

- unique active provider account per Store for phase one
- organization/store foreign-key consistency
- no account lookup by unscoped phone number

### `whatsapp_conversations`

- `id`
- `organization_id`
- `store_id`
- `whatsapp_account_id`
- nullable `customer_id`
- provider chat identifier
- `last_message_at`, unread count, archived state

### `whatsapp_messages`

- `id`
- conversation and account references
- direction: `inbound | outbound`
- type: `text | document`
- normalized body/caption and private attachment reference
- provider message identifier
- status: `queued | sending | sent | delivered | read | failed`
- failure code/message safe for operators
- created/sent/delivered/read timestamps
- idempotency key

### `whatsapp_outbox`

- durable event/message payload reference
- account, Sale, Customer, and message references
- attempts, lease owner, lease expiry, next attempt time
- status: `pending | processing | sent | retryable | dead_letter | cancelled`
- unique key preventing accidental duplicate invoice sends

The database outbox is authoritative. Redis may accelerate dispatch but must
not be the only record of a pending bill message.

## Security and reliability requirements

- Authenticate every public endpoint with the correct existing auth middleware.
- Enforce Store Device scope on POS sending routes.
- Restrict QR/account management to authorized organization administrators.
- Authenticate API-to-worker traffic with a private network plus service credential or signed request.
- Encrypt Baileys auth state at rest and use a durable private volume/object store.
- Never log QR values, auth keys, message bodies, PDF contents, access tokens, or full customer phone numbers.
- Normalize and validate phone numbers consistently before creating chat IDs.
- Make send operations idempotent by Sale/account/message kind.
- Serialize outbound work per WhatsApp account.
- Retry only classified transient failures with exponential backoff and jitter.
- Move repeated failures to a dead-letter state visible to operators.
- Do not retry permanent recipient or authentication failures indefinitely.
- Add account health, queue age, retry count, send latency, and failure metrics.
- Keep private PDFs inaccessible through permanent public URLs.
- Support session logout, QR expiry, reconnect, revoked session, and worker restart recovery.

## Execution loop

Every phase follows this exact gate:

1. Review the phase plan against this document and the current worktree.
2. Implement only that phase’s scope.
3. Run focused validation during implementation.
4. Review the phase diff on Standards and Spec axes.
5. Fix any findings or explicitly record a blocker.
6. Run the phase closeout checks.
7. Mark the phase complete and stop for approval before the next phase.

No phase may silently expand into the next phase. No commit is created unless
the user explicitly requests committing; the implementation workflow’s default
commit instruction is overridden by the project approval boundary.

## Phases

### Phase 0 — Plan review

Deliverables:

- this complete plan file
- one read-only review of the plan
- confirmed phase order, assumptions, and open decisions

Exit gate:

- no unresolved contradiction with `CONTEXT.md`, ADRs, or current billing/auth boundaries
- user approves starting Phase 1

### Phase 1 — Messaging contract and persistence foundation

Deliverables:

- shared Zod schemas and TypeScript types for account, conversation, message, outbox, and normalized provider status
- migration for the WhatsApp tables and indexes
- migration-backed persistence boundary; repository/service code begins with the first authenticated consumer in Phase 2
- unit tests for schema validation, uniqueness assumptions, and scope rules

Out of scope:

- Baileys connection
- PDF generation
- UI

Acceptance criteria:

- types are exported through `@repo/types`
- invalid statuses, IDs, phone numbers, and cross-tenant references are rejected
- migration is rerunnable only through the repository migration mechanism and verifies cleanly
- account history is retained through revocation/lifecycle status; destructive account deletion is not the normal recovery path
- no public route exposes session secrets

### Phase 2 — Isolated Baileys worker and account linking

Deliverables:

- `apps/whatsapp-worker` or an equivalent isolated deployable service
- provider adapter implementing the messaging boundary
- durable encrypted auth-state handling
- QR generation/expiry, connect/disconnect, reconnect/backoff, and health reporting
- authenticated internal worker API
- admin account-linking UI and status polling/SSE boundary

Acceptance criteria:

- one test account can link, reconnect after restart, disconnect, and relink
- worker failure does not stop the Ganatri API
- QR/session material is absent from logs and API error responses
- account scope cannot cross organization/store boundaries

### Phase 3 — Sale PDF and durable invoice outbox

Deliverables:

- backend PDF renderer based on trusted committed Sale and Sale Item Snapshots
- private storage object and retention strategy
- outbox creation tied to the committed Sale flow
- explicit cashier choice and customer-phone validation
- no duplicate outbox row for the same Sale/account/message kind

Acceptance criteria:

- a PDF remains historically correct after catalog/customer changes
- PDF generation failure is visible and does not undo the Sale
- duplicate UI retries do not create duplicate sends
- private PDF access is limited to authorized users/worker operations

### Phase 4 — Send invoice PDF through Baileys

Deliverables:

- worker document send operation
- message status transitions and provider acknowledgement mapping
- retry/dead-letter handling
- POS invoice action and bill-detail retry/status UI

Acceptance criteria:

- a committed Sale can send one PDF to its Customer
- queued, sent, delivered/read where available, and failed states are visible
- transient worker/provider failures retry safely
- permanent failures do not loop forever
- completing a Sale remains successful when WhatsApp is offline

### Phase 5 — Customer conversation model and WhatsApp-style UI

Deliverables:

- inbound message ingestion from Baileys
- customer/phone matching and manual attachment flow
- conversation list and selected-customer thread UI
- text message sending
- document message rendering and safe PDF download/view
- unread counts and last-message timestamps

Acceptance criteria:

- inbound and outbound messages are stored once
- duplicate provider events are idempotent
- a cashier can open a Customer and see the correct Store/account conversation
- unmatched conversations cannot expose another tenant’s data
- UI handles disconnected, empty, loading, failed, and retry states

### Phase 6 — Multi-account scaling and operations

Deliverables:

- account partitioning across worker processes
- worker leases and graceful shutdown
- per-account queue limits and concurrency rules
- metrics, structured logs, health endpoints, and operator diagnostics
- bounded load test for the agreed initial account count
- backup/restore and session-loss recovery procedure

Acceptance criteria:

- one account’s failure does not block other accounts
- queued messages survive API/worker restart
- queue age and failed-account alerts are actionable
- measured resource usage is recorded before selecting the 50-account deployment size

### Phase 7 — Rollout and production release

Deliverables:

- deployment configuration for API, worker, Redis, storage, and persistent session data
- secrets/configuration checklist
- migration and rollback procedure
- pilot rollout with one internal Store
- support/runbook documentation
- release evidence and known-risk report

Acceptance criteria:

- pilot completes bill, PDF send, reconnect, retry, and conversation checks
- no unverified hardware, deployment, migration, or account-scale claim is marked complete
- production rollout has an explicit rollback path
- Baileys unofficial-client risk is documented and approved by the product owner

## Validation commands

The implementation should use the narrowest relevant checks during each phase,
then the full relevant checks at final release:

```bash
bun test apps/backend/src
bun run --cwd apps/backend build
./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json
git diff --check
```

Additional worker-specific tests and load commands will be added with the
worker rather than hidden behind a generic root command.

## Open decisions before implementation

- Confirm one WhatsApp account per Store as the first-release ownership rule.
- Confirm whether invoice sending is enabled by default or selected per bill.
- Confirm whether account linking is admin-only or available to a Store Device administrator.
- Confirm customer opt-in wording and storage requirements.
- Confirm the initial pilot Store/account and the maximum pilot message volume.
- Confirm the deployment host has durable private storage and enough capacity for the worker pilot.

## Current status

Phase 0 plan review: PASS on 2026-08-11.

Review notes:

- The plan preserves the Sale-based billing model and does not introduce a duplicate Invoice domain.
- POS sending remains subject to Store Device scope; admin billing remains read-only.
- The plan follows the repository's migration, Hono, Zod, `ServiceResponse`, Redis, storage, and validation boundaries.
- Security, tenant isolation, idempotency, durable outbox behavior, worker isolation, and release evidence are explicit.
- The listed open decisions are visible and have first-release defaults; they are not being silently resolved by implementation.

Phase 1 implementation review adjustment:

- Persistence and shared contracts remain in Phase 1.
- Repository/service code is intentionally deferred to Phase 2 with its first authenticated caller, avoiding speculative generality.
- WhatsApp account, conversation, message, and outbox foreign keys retain history through lifecycle status instead of cascading destructive deletes.
- The invoice outbox now has a database-enforced unique key for one Sale/account/invoice send.
- Phone normalization checks use an escape-safe PostgreSQL pattern.

Phase 1 implementation review: PASS on 2026-08-11.

Focused validation:

- bun test packages/types/src/services/whatsapp.schema.test.ts — 3 passed.
- ./node_modules/.bin/tsc --noEmit -p packages/types/tsconfig.json — passed.
- bun run --cwd apps/backend build — passed.
- git diff --check and new-file whitespace checks — passed.

Known validation boundary:

- The migration was statically reviewed but was not applied to a live database in this phase. Live migration application and rollback evidence remain required before production release.

Phase 1 implementation and review are complete. Stop here pending approval for
Phase 2; no worker, route, PDF, or UI implementation has started.

Phase 2 plan review: PASS on 2026-08-11.

Phase 2 implementation decisions:

- The worker will use the stable @whiskeysockets/baileys 6.7.18 line, pinned explicitly. The current Baileys 7 line has documented breaking changes, so the worker will not consume an unpinned release candidate.
- The worker is a separate Node 20 ESM deployable. The API remains the system of record for tenancy and account metadata; the worker receives only scoped internal commands and reports connection state back through authenticated internal endpoints.
- Baileys authentication state will use an encrypted custom file store. Raw auth keys, QR values, and provider errors will not be logged or returned in error responses.
- The first linking flow is admin-only and one account per Store. The worker will support connect, reconnect, disconnect, QR/status retrieval, and provider-neutral text/document send primitives; invoice outbox wiring remains Phase 4.
- Account status callbacks and startup reconciliation are part of this phase so a worker restart does not silently lose connected accounts.

Phase 2 review boundary:

- No customer messaging route, PDF generation, invoice outbox dispatch, or conversation UI is included in this phase.

Phase 2 implementation review: PASS on 2026-08-11.

Review findings fixed:

- Worker bundle now leaves Baileys optional media peers external instead of failing the production bundle.
- Worker reconnect callbacks ignore stale sockets and clear queued reconnect timers before a manual retry.
- Encrypted auth-state file locks are cleaned up after each operation.
- Worker responses are validated at the API boundary, and account-linking API errors return their correct HTTP status.
- Existing account state remains visible in the admin linking screen when the worker is temporarily unavailable.
- Session references are non-secret logical paths; raw auth files remain encrypted and outside API DTOs.

Focused validation:

- Worker encrypted-state test and shared WhatsApp schema tests — 4 passed, 8 expectations.
- Worker typecheck — passed.
- Worker Node-targeted production bundle — passed; 3.83 MB bundled with optional Baileys peers externalized.
- Backend production bundle — passed.
- Web TypeScript check — passed.
- Scoped whitespace checks — passed.

Known validation boundary:

- A live WhatsApp account was not linked in this environment. QR scan, reconnect-after-restart, logout, and WhatsApp-side account behavior remain deployment/pilot checks and are not claimed as verified.

Phase 2 implementation and review are complete. Stop here pending approval for
Phase 3; PDF generation, invoice dispatch, and conversation work has not started.

Phase 3 plan review: PASS on 2026-08-11.

Phase 3 implementation boundary:

- The cashier explicitly requests an invoice send through an authenticated backend route for an already committed Sale. The POS WhatsApp action and send-status presentation remain Phase 4 UI work.
- The API will load the committed Sale Detail and its Sale Item Snapshots from the billing repository. It will never rebuild the PDF from current catalog or customer values.
- PDFKit will be pinned as a backend dependency and wrapped behind a small renderer module. Generated PDFs will be uploaded as private MinIO objects; no public or permanent URL will be created.
- The request requires a connected Baileys account for the Store and a Customer phone matching the existing international phone contract. Walk-in sales and malformed or missing phone numbers are rejected without creating a message or outbox row.
- Conversation creation is limited to the persistence needed by an outbound invoice. Inbound ingestion, conversation listing, text messaging, and thread UI remain Phase 5.
- PDF generation and object upload happen after the Sale transaction has committed. Failures return a visible error and leave the Sale completed. A deterministic object key plus database uniqueness and idempotency constraints make retries safe; an orphaned object is deleted when the database write fails.
- The API creates the message and outbox rows in one database transaction. Phase 4 owns consuming that outbox and sending through the worker; this phase will not dispatch WhatsApp messages.

Phase 3 review boundary:

- No Baileys send operation, retry/dead-letter worker loop, POS WhatsApp button, bill-detail status UI, inbound message ingestion, or text conversation feature is included in this phase.

Phase 3 implementation review: PASS on 2026-08-11.

Review findings fixed:

- Sale customer name and phone snapshots are persisted at Sale creation/commit time, so later Customer edits do not change the invoice artifact.
- PDF generation is isolated behind a backend renderer and uses Sale Item Snapshot values rather than live catalog data.
- Private PDF upload uses the existing MinIO boundary with a deterministic tenant-scoped key. The API does not expose a public URL.
- Conversation, document message, and invoice outbox rows are created in one database transaction with both an idempotency key and a database uniqueness constraint.
- Duplicate requests return the existing queued/sent state. A failed database write attempts to remove the newly uploaded object, while a concurrent successful request is preserved.
- The endpoint verifies authenticated organization/store scope, rejects walk-in or invalid-phone invoices, and leaves the committed Sale unchanged on PDF/storage failure.
- The first formatter pass rewrote unrelated legacy whitespace; those changes were removed before review. The final diff is limited to Phase 3 files and the dependency lock entries required by PDFKit.

Focused validation:

- bun install --frozen-lockfile --offline — passed.
- bun test apps/backend/src/modules/tenant/whatsapp/invoice-pdf.test.ts packages/types/src/services/whatsapp.schema.test.ts — 5 passed, 9 expectations.
- bun test apps/backend/src/modules/tenant/billing/billing.service.configured.test.ts — 30 passed, 188 expectations.
- bun run --cwd packages/types build — passed.
- bun run --cwd apps/backend build — passed.
- Focused backend TypeScript check found no errors in the Phase 3 files.
- git diff --check — passed.

Known validation boundary:

- The migration was statically reviewed but not applied to a live database in this environment.
- MinIO upload, private-bucket policy, retention lifecycle, and a real WhatsApp account send remain deployment/pilot checks for the later worker phase.

Phase 3 implementation and review are complete. Stop here pending approval for
Phase 4; the Baileys sender, POS WhatsApp action, and send-status UI have not
started.

Phase 4 plan review: PASS on 2026-08-12.

Phase 4 implementation decisions:

- The database outbox remains authoritative. The worker polls an authenticated
  internal API, and the API atomically leases one eligible invoice at a time.
  A Store WhatsApp account may have only one active processing lease, so its
  invoices cannot reorder or concurrently duplicate one another. Worker
  partitioning and multi-account concurrency remain Phase 6 scale work.
- The API reads the private PDF object and returns a bounded document payload to
  the worker. The worker does not receive storage credentials, and document
  bodies, phone numbers, provider errors, and bearer tokens must not be logged.
- A provider message id marks the document message `sent`. Baileys message
  acknowledgement events update `delivered` and `read` when the provider
  supplies them; unavailable acknowledgements do not block successful sending.
- Transient failures become `retryable` with bounded exponential backoff and
  jitter. Permanent failures become `dead_letter`. Retrying a bill reuses the
  existing message and outbox rows, preserving idempotency and avoiding a
  second invoice document.
- Admin and Device-scoped POS callers receive the same queue/status contract.
  POS completion remains successful when invoice queueing or the worker is
  offline; the UI reports the WhatsApp failure separately.

Phase 4 review boundary:

- Include invoice document dispatch, authenticated worker polling and result
  callbacks, acknowledgement status mapping, retry/dead-letter transitions,
  POS/admin queue actions, and bill-detail status/retry presentation.
- Exclude inbound message ingestion, free-form text messaging, conversation
  listing/thread UI, multi-worker partitioning, load testing, and production
  rollout work reserved for later phases.

Phase 4 implementation review: PASS on 2026-08-12.

Review findings fixed:

- The worker uses shared Zod contracts for bounded invoice jobs and sanitized
  result/status callbacks. Its production package now declares the workspace
  types dependency explicitly.
- The API atomically leases eligible outbox rows, serializes active work per
  WhatsApp account, resets expired leases, and transitions messages/outbox rows
  through sent, retryable, and dead-letter states without creating duplicate
  rows on retry.
- Private PDF bytes are read only by the API and are bounded before being sent
  over the authenticated worker channel. Storage credentials and document
  bodies are not exposed in logs.
- Baileys provider acknowledgements map to delivered/read where available, and
  the worker briefly retries an acknowledgement callback when it races the
  initial send-result persistence.
- Sale completion and invoice queueing are separate UI operations. A WhatsApp
  queue failure is reported independently and cannot roll back a completed
  Sale. Admin and Device callers use separate authorization boundaries.
- The review found no repository coding-standard document to apply beyond the
  existing module and validation conventions. The diff contains no unrelated
  formatter churn.

Focused validation:

- bun install --frozen-lockfile --offline — passed.
- WhatsApp/PDF focused tests — 9 passed, 13 expectations.
- Configured billing service tests — 30 passed, 188 expectations.
- Worker typecheck and Node-targeted production bundle — passed; 4.15 MB
  bundle.
- Backend production bundle, services bundle, and web TypeScript check —
  passed.
- git diff --check — passed.

Known validation boundary:

- The WhatsApp migrations were not applied to a live database in this
  environment. MinIO private-object behavior, a real account send, provider
  acknowledgement delivery, restart recovery, and account-scale behavior
  remain deployment/pilot evidence.
- A project-wide backend TypeScript check still reports pre-existing unrelated
  catalog, billing-test, and seed-script errors; no Phase 4 file appears in
  that error set.

Phase 4 implementation and review are complete. Stop here pending approval for
Phase 5; inbound messages, text conversations, and WhatsApp-style thread UI
have not started.

Phase 5 plan review: PASS on 2026-08-12.

Phase 5 implementation decisions:

- The first conversation boundary is direct one-to-one WhatsApp chats with an
  E.164 phone JID. Group, broadcast, protocol, and unsupported-media events are
  ignored and never exposed through the tenant UI until a separate policy is
  approved.
- Inbound events are idempotent on `(whatsapp_account_id,
  provider_message_id)`. The API matches a Customer by exact organization and
  normalized phone. An unmatched contact is stored as a tenant-scoped
  conversation with no customer; manual attachment is allowed only when the
  selected Customer has the same phone number.
- Text and document sends share the existing durable outbox and lease/result
  callbacks. Retries reuse the existing message/outbox row, and the worker
  never receives storage credentials.
- Inbound documents are limited to the same bounded media size as invoice
  dispatch, uploaded to a private tenant/account key, and exposed only through
  an authenticated conversation attachment endpoint with a short-lived signed
  URL. No public media URL is stored or returned.
- The admin inbox and Device POS inbox use separate auth scopes but the same
  conversation/message contract. Loading, empty, disconnected, failed, and
  retry states are explicit. Polling is used for this phase; realtime fanout
  and multi-worker account partitioning remain later operational work.

Phase 5 review boundary:

- Include direct inbound text/document ingestion, exact customer matching and
  safe manual attachment, outbound text outbox dispatch, conversation/message
  APIs, private document download, unread/last-message updates, and the admin
  plus POS WhatsApp-style thread surfaces.
- Exclude group chats, broadcast messaging, media types beyond supported text
  and documents, realtime WebSocket delivery, multi-account scaling, load
  testing, and rollout/runbook work reserved for later phases.

Phase 5 implementation review: PASS on 2026-08-12.

Review findings fixed:

- The inbound insert targets the existing partial provider-message unique
  index explicitly, so duplicate provider events remain idempotent under the
  actual PostgreSQL migration rather than relying on an unmatched conflict
  target.
- Customer lookup and manual attachment compare normalized digits within the
  organization and Store-scoped conversation, allowing harmless phone-format
  differences without permitting cross-tenant attachment.
- Text messages use the same leased outbox and result transition as invoice
  documents. Provider acknowledgement updates now apply to outbound text and
  document messages, while the UI disables sending for non-connected account
  states and preserves read-only history.
- Inbound documents are uploaded privately before persistence, removed on
  duplicate or failed writes, bounded to 10 MB, and exposed only through the
  authenticated signed-URL endpoint. The worker receives no storage access.
- Admin and POS routes use separate existing auth scopes and the same shared
  schemas. Conversation reads, sends, customer attachment, and document
  access all re-check organization, Store, account, conversation, and message
  ownership at the repository boundary.
- The web inbox has explicit loading, empty, failed, retry, unmatched-contact,
  disconnected, queued/sent/failed, and attachment-opening states. Polling is
  bounded to the current conversation/account scope.

Focused validation:

- bun test packages/types/src/services/whatsapp.schema.test.ts
  apps/web/src/pages/pos-route-context.test.ts — 8 passed, 25 expectations.
- bun test apps/backend/src/modules/tenant/whatsapp/invoice-pdf.test.ts
  packages/types/src/services/whatsapp.schema.test.ts — 7 passed, 16
  expectations.
- Worker TypeScript check and Node-targeted production bundle — passed.
- Web TypeScript check — passed.
- Backend and services production bundles — passed.
- git diff --check — passed.

Known validation boundary:

- The WhatsApp migration was not applied to a live database in this
  environment. PostgreSQL query execution, MinIO private-object policy,
  signed URL behavior, a real inbound/outbound account, provider
  acknowledgements, and reconnect/restart behavior remain deployment/pilot
  checks.
- A project-wide backend TypeScript check still reports pre-existing unrelated
  billing-test, catalog-test, catalog-service, and seed-script errors; no
  Phase 5 file appears in that error set.

Phase 5 implementation and review are complete. Stop here pending approval for
Phase 6; multi-account scaling, realtime delivery, load testing, and rollout
operations have not started.
