# Ganatri WhatsApp — Phase 4

Status: Complete with documented follow-ups
Phase: 4 — Organization Cloud connection

## Outcome

Allow the Organization creator to connect its own Meta Cloud WABA/phone using
Embedded Signup, with encrypted credentials and resumable provisioning.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 4.1 | Embedded Signup client flow | Phase 2, Phase 1 | Signed state and safe completion result |
| 4.2 | Server exchange and provisioning | 4.1 | Validated WABA/phone and encrypted credential binding |
| 4.3 | Account health and lifecycle | 4.2 | Refresh, revoke, registration, rotation, and failure states |
| 4.4 | Assignment compatibility review | 4.2–4.3 | Phone uniqueness and race tests; focused commit |

## Acceptance criteria

- Cancelled, incomplete, expired, replayed, and duplicate results are safe.
- WABA/phone identity must belong to the authenticated Organization.
- Temporary and permanent credentials never enter client storage or logs.
- Vault failure does not persist plaintext credentials.
- Old credentials remain active until replacement validation succeeds.
- Unregistered, suspended, revoked, and unhealthy phones cannot send.
- Each Store has only one linked Organization-owned phone.
- One Organization-owned phone may be linked to multiple Stores.
- The shared phone's default inbound Store is deterministic and auditable.

## Verification

- Provisioning service tests and route tests.
- Credential-vault failure and rotation rollback tests.
- Provider status refresh and webhook state tests.
- Concurrent phone assignment tests.
- Multiple-Store assignment and one-linked-number-per-Store tests.
- Admin/Store Console browser flow with no token exposure.

## 4.1 Subphase plan — Embedded Signup client flow

Status: Committed; review record retained

### User-facing outcome

An Organization administrator can start Meta Embedded Signup from the existing
Admin WhatsApp workspace and receive only a short-lived signed onboarding state
plus safe WABA/phone identifiers. Cancelled, incomplete, untrusted, malformed,
and timed-out browser messages do not reach the backend completion action.

### Scope

- Review and harden the existing Admin Embedded Signup message parser and
  completion controller; do not create a new app, route tree, or credential
  client.
- Keep the backend start response limited to signed state and expiry metadata.
- Validate Facebook message origin, event/type, WABA/phone presence, and
  single-settlement behavior in the browser seam.
- Preserve the existing backend state binding to Organization and user and
  atomic replay store; provider exchange, WABA/phone ownership validation,
  vault persistence, and resumable provisioning remain 4.2 scope.
- Ensure the client never stores or logs an access token, authorization code,
  PIN, or credential binding.

### Non-goals

- No Meta API exchange or credential-vault change.
- No Store assignment or account-health mutation.
- No production browser verification claim; static/client tests cover this
  subphase unless a browser session is available.

### Public seams and verification

- `readEmbeddedSignupSession(origin, data)` remains the pure browser message
  boundary.
- `embeddedSignupLoginOptions(configId)` remains the SDK option boundary.
- Run Admin Embedded Signup tests, backend onboarding state/result/route tests,
  Admin build, backend build, and diff/type checks.

### Exit gate

The client/start-state boundary is reviewed, edge cases are covered, and the
subphase is committed before 4.2 server exchange/provisioning work begins.

### Verification and review record

- Embedded Signup client, signed state, result, exchange, service, and route
  tests: 28 passed, 0 failed.
- Added coverage for incomplete finish events and Facebook lookalike origins.
- Admin production build: passed with the repository-local Vite binary.
- Backend production build: passed; `git diff --check`: passed.
- Spec review: the client receives only safe identifiers and the signed state;
  provider exchange and credential persistence remain in 4.2.
- Standards review: the existing pure message parser and SDK-option seam were
  extended without adding a second browser flow or exposing credentials.
- Admin typecheck remains a pre-existing baseline failure set in unrelated
  catalog/customer/report components; no new Embedded Signup diagnostic was
  introduced.

## 4.2 Subphase plan — Server exchange and provisioning

Status: In progress; plan reviewed and recorded

### User-facing outcome

After a valid Embedded Signup completion, the backend exchanges the one-time
authorization result, verifies the WABA and phone against Meta, stores only an
opaque encrypted-vault binding, and resumes safe provider work without
persisting plaintext credentials or invalid identity bindings.

### Scope

- Preserve the existing signed-state replay and idempotency seams from 4.1.
- Harden resumable provisioning cleanup: temporary credential bindings are
  revoked when WABA/phone identity validation fails or local attempt creation
  fails; resumable provider failures retain only the opaque binding needed for
  retry.
- Keep WABA and phone identity checks tied to the authenticated Organization,
  reject cross-Organization conflicts, and persist only safe account metadata.
- Add focused tests for invalid identity cleanup, vault failure, duplicate
  completion, and successful resumable provisioning.
- Do not add refresh/revoke/rotation UI or Store assignment changes; those are
  4.3/4.4 scope.

### Public seam and verification

`completeCloudAccountProvisioning` remains the service seam. Run its focused
tests, onboarding exchange/result tests, backend build/type diagnostics, and
database migration status checks. No access token may appear in returned DTOs,
logs, provisioning rows, or test snapshots.

### Exit gate

Server exchange and resumable provisioning cleanup are verified and committed
before account-health/lifecycle work starts in 4.3.

### Verification and review record

- Provisioning, exchange, result, state, route, and service tests: 35 passed,
  0 failed.
- Invalid WABA/phone identity now revokes the temporary vault binding and
  clears its resumable attempt reference; ordinary provider failures retain the
  opaque binding for safe resume.
- Backend production build: passed; `git diff --check`: passed.
- Spec review: no access token is returned or persisted in provisioning rows,
  identity mismatches cannot leave a usable temporary binding, and duplicate /
  replay behavior remains idempotent.
- Standards review: cleanup is injected through the existing provisioning
  repository seam, preserving the service's testability and avoiding a second
  credential-storage abstraction.

## 4.3 Subphase plan — Account health and lifecycle

Status: Committed; plan and review record retained

### User-facing outcome

Organization administrators can refresh, register, revoke, and rotate a Cloud
account safely. A phone is send-eligible only when Meta reports a registered,
verified, non-coexistence connected state; suspended, disconnected, unverified,
revoked, and Business-App phones remain blocked.

### Scope

- Add a dedicated token-rotation API/service seam that validates the replacement
  token against the existing WABA/phone before swapping the vault binding.
- Keep the old binding active until the replacement is validated and the DB
  reference swap succeeds; revoke the old binding only after success and clean
  up a replacement binding on swap failure.
- Project Meta phone health into Cloud account status and require the same
  health in Cloud template admission and outbox claiming.
- Preserve existing refresh, revoke, and phone-registration behavior and avoid
  Store assignment changes until 4.4.

### Verification and review record

- Cloud account service/repository/outbox lifecycle tests: 27 passed, 0 failed.
- Rotation tests cover successful swap, old-binding revocation, and failed
  replacement identity validation retaining the old binding.
- Health tests cover connected, disconnected, suspended, coexistence, and
  unverified states; unhealthy phones are excluded from queue/claim paths.
- Backend production build: passed; `git diff --check`: passed.
- Spec review: replacement validation precedes storage swap, credentials remain
  opaque, and unhealthy phones cannot send.
- Standards review: rotation reuses the existing vault/repository interfaces;
  no new credential format or public secret-bearing DTO was introduced.

### Exit gate

Account health and lifecycle are committed; 4.4 may now review assignment,
phone uniqueness, shared-number defaults, and race behavior.

## 4.4 Subphase plan — Assignment compatibility review

Status: In progress; plan reviewed and recorded

### User-facing outcome

An Organization Cloud phone can be reused by multiple Stores, each Store can
have only one linked Organization Cloud phone, and shared-number inbound
routing remains deterministic. Concurrent Store-link attempts return a clear
conflict instead of falsely reporting success for the losing account.

### Scope

- Review the existing `whatsapp_account_stores` constraints, deferred default
  trigger, assignment transaction, and unlink fallback ordering.
- Fix the Store-level assignment race and reject new historical/Baileys links;
  existing historical rows remain readable.
- Preserve first-linked default inbound Store behavior and oldest remaining
  assignment fallback on unlink.
- Add migration/repository contract coverage for uniqueness, default routing,
  row locks, and conflict detection. Do not add a new assignment table or
  alter queued message snapshots.

### Verification

- Focused assignment/migration tests and backend build/type diagnostics.
- Development migration status remains clean; existing account/assignment
  counts are not rewritten.
- Review the Admin link/unlink API path for Organization scoping and safe DTOs.

### Exit gate

Assignment compatibility and race-safe behavior are reviewed, verified, and
committed; Phase 4 then receives a phase-level validation and final review.

## Phase 4 final verification and review

- Phase commits: `69614db`, `e0a4e03`, `e3c5555`, and `26804c1`.
- Phase-level Cloud connection suite: 58 passed, 0 failed.
- Backend production build: passed.
- Admin production build: passed with the repository-local Vite binary.
- Development database: 155 migrations applied, 0 pending; no Phase 4
  migration was required.
- `git diff --check`: passed.
- Spec review: Embedded Signup state/replay, server exchange, encrypted-vault
  binding, resumable provisioning, cleanup, rotation, health gates, revoke,
  phone registration, multi-Store reuse, one-Store assignment, and
  deterministic default inbound routing are covered. Historical Baileys rows
  remain readable but cannot be newly linked.
- Standards review: existing Admin/backend/service boundaries were extended;
  no new application or credential format was introduced. Provider tokens are
  accepted only at backend seams and are absent from DTOs/logs/tests.
- Baseline limitation: Admin `check-types` still reports pre-existing errors
  in unrelated catalog, customer, report, vendor, and settings components; no
  new Embedded Signup/Cloud lifecycle diagnostic was found.
- Deferred follow-ups: browser/Meta live-account verification, Store policy
  assignment UI polish, and later template/bill-delivery phase behavior.

## Whole-phase review correction record

The complete Phase 4 diff was reviewed again after closeout. Confirmed issues
were fixed in the follow-up review commit:

- Token rotation was incorrectly hidden behind the development-only manual API
  setup flag; the production Admin workspace now exposes rotation for every
  provisioned Cloud account while keeping test-account creation gated.
- Assignment conflict handling now checks the Store-level conflict after the
  account-level insert race, so a losing concurrent link cannot report false
  success.
- New Store links reject historical Baileys accounts, while existing historic
  rows remain readable.
- Meta phone status now projects to a send-safe Cloud health state and both
  Cloud queue admission and outbox claiming require registered, verified,
  non-coexistence health.
- Review verification after the fixes: focused tests passed, backend/Admin
  builds passed, and the working tree remained scoped to Phase 4 files.
