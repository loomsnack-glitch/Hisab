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
