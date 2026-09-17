# Ganatri WhatsApp — Phase 2

Status: Phase 2.3 verified; commit gate pending
Phase: 2 — Policy, authorization, and Customer association foundation

## Outcome

Persist the Store WhatsApp mode and assignment history, enforce the creator/
administrator boundary, and make entitlement/policy resolution authoritative
for every later sender operation.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 2.1 | Creator/administrator authorization seam | Phase 1 | Unauthorized management actions are denied server-side |
| 2.2 | Store configuration/history schema | 2.1 | One current configuration and mode/sender constraints |
| 2.3 | Policy transitions and entitlement | 2.2 | Atomic enable/disable/switch operations and denial reasons |
| 2.4 | Store-Customer association schema and event seams | 2.1, 2.2 | Migration origin, creation origin, activity source, and timestamps are durable |
| 2.5 | Audit and policy contract review | 2.1–2.4 | Race tests, association tests, API tests, status update, focused commit |

## Approved behavior

- `disabled` has no sender and rejects new work.
- `ganatri_utility` references only the Ganatri platform sender.
- `organization_cloud` references a same-Organization Cloud account.
- Both modes require WhatsApp Store Entitlement.
- Only the Organization creator/administrator manages WhatsApp.
- Each Store has one linked Organization-owned number.
- One Organization-owned number may be linked to multiple Stores.
- Each shared number has one default inbound Store.
- Ganatri's platform phone is a platform-level outbound utility exception.

## Acceptance criteria

- A policy read returns mode, sender, entitlement, allowed kinds, and version.
- Policy transitions are atomic, auditable, and concurrency-safe.
- Cross-Organization account/Store references are rejected.
- Historical configurations remain readable.
- Switching never rewrites or reroutes queued messages.
- Store-Customer associations are unique per Organization, Customer, and Store.
- Association updates retain first-seen, last-activity, and provenance data;
  each qualifying event is also recorded in append-only, idempotently deduped
  activity history.

## Verification

- Authorization matrix and cross-tenant tests.
- Database constraint and concurrent transition tests.
- Entitlement allowed/denied tests for both modes.
- Queued sender snapshot invariance test.
- Customer association creation, migration, repeated-event, source-history, and
  last-activity tests.
- Typecheck, focused backend tests, migration audit, and diff review.

## 2.1 Subphase plan — creator/administrator authorization seam

Status: Phase 2.2 plan reviewed; migration verified; commit pending

### User-facing outcome

Only the Organization creator/administrator can perform WhatsApp management
mutations through authenticated tenant routes. Read operations retain the
existing Organization access behavior. Unauthorized requests fail before a
WhatsApp service or provider operation runs.

### Scope

- Add a reusable WhatsApp management authorization decision and middleware.
- Use the existing creator-scoped Organization access repository boundary.
- Apply the guard to authenticated WhatsApp mutation methods, including Cloud
  onboarding, account linking, template, consent, delivery, conversation, and
  promotion mutations.
- Preserve existing 400 responses for invalid Organization identifiers.
- Add behavior tests for creator allow, unauthorized deny, invalid scope, and
  read-method pass-through.

### Non-goals

- No membership-role schema or new role model; creator is the current
  administrator until Organization roles exist.
- No changes to read authorization, POS Device Authentication, Platform Console,
  sender policy, Store configuration, Customer associations, or provider code.
- No database migration.

### Public seam

`whatsappAdministratorMutationMiddleware` is the single route-level seam. It
checks only authenticated user requests and only mutating HTTP methods. The
decision returns a safe denial response without exposing Organization data.

### Verification plan

- Unit-test the authorization decision and middleware with injected Organization
  lookup behavior.
- Verify the WhatsApp router registers the middleware after `authMiddleware`.
- Run focused authorization and existing WhatsApp backend tests.
- Run backend typecheck and `git diff --check`.

### Rollback

Remove only the new authorization module, its tests, and the single WhatsApp
router middleware registration. Existing service and route behavior remains
otherwise unchanged.

### 2.1 Review result

- Standards review: passed. Authorization is isolated in one reusable module,
  uses the existing Organization repository seam, and is registered after
  authentication without changing Platform Console or POS middleware.
- Specification review: passed. Mutating authenticated WhatsApp routes require
  creator/administrator access; reads remain unchanged; invalid scope is
  rejected before service access.
- Verification passed: 6 focused authorization tests and the backend production
  build.
- Full backend typecheck remains a pre-existing baseline failure set; the new
  authorization module does not appear in the remaining diagnostics.
- The organization-setup test is blocked by missing MinIO endpoint
  configuration in the test environment; authorization and onboarding route
  tests themselves pass.
- Phase 2.2 must not start until this subphase commit gate is resumed.

## 2.2 Subphase plan — Store configuration/history schema

Status: Plan reviewed; implementation and verification complete

### User-facing outcome

Every Store has a durable WhatsApp policy history with one current policy row.
The policy records whether the Store is disabled, uses Ganatri Utility, or uses
an Organization Cloud account, without changing existing accounts, messages,
outbox rows, or assignments.

### Scope

- Add an additive `whatsapp_store_policies` migration and mode enum.
- Persist Organization/Store scope, mode, optional Organization Cloud account,
  revision, effective timestamps, and actor metadata.
- Enforce one current policy per Store and one revision per Store history.
- Enforce composite Organization/Store and Organization/account foreign keys.
- Enforce that only `organization_cloud` carries an account reference; disabled
  and Ganatri Utility policies carry no tenant account.
- Backfill existing Stores with revision-one `disabled` policies without
  changing existing WhatsApp account assignments or delivery records.
- Add migration-contract tests and verify the migration against the development
  database.

### Non-goals

- No policy transition service or resolver; that is Phase 2.3.
- No automatic policy enablement for existing or new Stores beyond the safe
  disabled backfill.
- No sender/account replacement, entitlement logic, Customer associations,
  provider, UI, POS, or existing WhatsApp table rewrite.

### Public seam

The database policy history is the durable seam for later policy reads and
transitions. Historical rows are retained; Phase 2.3 will own serialized
transitions and current-row updates.

### Verification plan

- Test migration structure, backfill intent, constraints, and reversible down
  migration.
- Run `dbmate status` before and after applying the development migration.
- Confirm existing WhatsApp account, assignment, message, and outbox counts are
  unchanged.
- Run focused backend tests, backend build, and `git diff --check`.

### Rollback

Use the migration down path only before dependent policy transitions exist. It
drops only the new policy table/type and does not touch existing WhatsApp data.

### 2.2 Review result

- Standards review: passed. The migration is additive, tenant-anchored with
  composite foreign keys, and reversible without altering existing WhatsApp
  tables or records.
- Specification review: passed. Each existing Store received a revision-one
  `disabled` policy; mode/account consistency and one-current-row constraints
  are persisted for later transitions.
- Verification passed: 4 migration-contract tests, development migration
  application, and backend data/constraint inventory.
- Development database result: 149 migrations applied, 0 pending.
- Existing data counts remained unchanged: 4 WhatsApp accounts, 1 account
  assignment, 784 messages, and 119 outbox rows.
- Phase 2.3 must not start until this subphase commit gate is complete.

## 2.3 Subphase plan — policy transitions and entitlement

Status: Plan reviewed; implementation in progress

### User-facing outcome

An administrator can read and deliberately change a Store's WhatsApp mode.
Non-disabled modes require the Store WhatsApp Entitlement. Organization Cloud
mode requires a same-Organization Cloud account already linked to that Store.
Every transition creates a new policy revision and leaves queued message data
untouched.

### Scope

- Add shared policy mode, sender, entitlement, and version contracts.
- Add policy repository reads and a serialized current-row replacement
  transaction using row locks and immutable revisions.
- Add policy read and update tenant routes plus shared service-client methods.
- Add safe default-disabled initialization for Stores created after migration.
- Validate same-Organization Cloud account/provider/Store assignment and lock the
  assignment during the transition.
- Return structured denial reasons for missing entitlement, invalid sender, and
  missing Store policy.

### Non-goals

- No sender dispatch changes, outbox rewrites, template lifecycle, Customer
  association, inbound routing, POS behavior, or Platform Console changes.
- No automatic fallback between sender modes.
- No pricing or usage billing behavior.

### Invariants

- At most one open policy row exists for an Organization/Store.
- Policy revisions increase monotonically for a Store.
- Disabled and Ganatri Utility policies have no tenant account reference.
- Organization Cloud policies reference a linked Cloud account from the same
  Organization.
- A policy transition never updates existing message or outbox rows.

### Verification plan

- Test request/response contracts, capability mapping, entitlement denial, and
  same-Organization/Store assignment checks.
- Test the repository transaction path and policy revision behavior against the
  development schema without changing existing message/outbox data.
- Run focused backend/service tests, backend build, migration status, and
  `git diff --check`.

### Rollback

Disable policy update routes and revert only the Phase 2.3 policy objects and
additive default-initialization migration. Existing account, message, and
outbox records remain intact.

### 2.3 Review result

- Standards review: passed. Policy contracts, repository, service, client
  methods, routes, and default initialization are isolated and reuse existing
  tenant, entitlement, account, and API boundaries.
- Specification review: passed. Policy reads expose mode, sender, entitlement,
  allowed kinds, and version; non-disabled modes require entitlement; Cloud
  policies require a same-Organization account linked to the Store.
- Verification passed: 16 focused tests across backend policy service,
  migration contracts, shared schemas, and service-client endpoints.
- Backend production build passed.
- Development database result: 150 migrations applied, 0 pending. Existing
  counts remained unchanged: 3 Stores, 3 policies, 4 accounts, 1 assignment,
  784 messages, and 119 outbox rows.
- A rollback-only new-Store probe confirmed the trigger creates a revision-one
  `disabled` policy and leaves no test row.
- The policy transition locks the current row and Store account assignment so
  a concurrent unlink cannot leave a newly selected Cloud policy unvalidated.
- Full backend typecheck remains a pre-existing baseline failure set; no new
  policy-file diagnostics remain.
- Phase 2.4 is the next subphase after this commit gate.
