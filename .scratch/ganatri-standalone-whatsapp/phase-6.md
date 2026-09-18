# Ganatri WhatsApp — Phase 6

Status: Complete with documented follow-ups
Phase: 6 — Bill and due delivery

## Outcome

Deliver bill and due reminders through the resolved Store policy for both
Ganatri Utility and Organization Cloud.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 6.1 | Policy-aware bill delivery | Phase 3, Phase 5 | Correct sender/template selected and queued |
| 6.2 | Policy-aware due delivery | 6.1 | Balance/consent/scope checks and safe queueing |
| 6.3 | Status, retry, and deliberate resend | 6.1–6.2 | No accidental duplicates; actionable failures |
| 6.4 | Delivery closeout review | 6.1–6.3 | Both modes pass acceptance matrix and commit gate |

## Acceptance criteria

- Disabled/unentitled Stores cannot queue messages.
- Ganatri Utility uses only fixed bill/due templates.
- Organization Cloud uses only an approved published Store default.
- Customer phone, utility consent, suppression, account health, and balance
  rules are checked before queueing.
- Duplicate requests are idempotent; explicit resend is separately audited.
- Template and sender snapshots remain immutable.
- Permanent policy/consent/mapping failures are not blindly retried.

## Verification

- Bill/due success and complete negative matrix.
- Timeout, rate-limit, permanent rejection, delayed webhook, and dead-letter tests.
- Policy switch during pending, sending, sent, delivered, and failed states.
- Admin, Store Console, and POS callers all resolve the same policy.
- Focused backend/UI tests, typecheck, build, and browser verification.

## 6.1 Subphase plan — Policy-aware bill delivery

Status: Complete; reviewed and committed

### User-facing outcome

When an authorized Admin, Store Console, or POS caller sends a completed Sale,
the backend resolves the Store's current WhatsApp policy exactly once and
queues the bill through the correct existing sender path. Ganatri Utility uses
the validated fixed platform template; Organization Cloud uses the Store's
approved published bill binding. A repeated ordinary request returns the
existing outbox result instead of creating a second message.

### Scope

- Review and harden the existing `queueInvoiceForStore` public service seam and
  its Admin, Store Console, and device callers.
- Verify Store entitlement, completed Sale state, Organization/Store scope,
  customer phone, current policy, sender health, and template readiness before
  queueing.
- Preserve the existing platform and Cloud outbox implementations, including
  immutable sender/template/policy snapshots and ordinary-request idempotency.
- Ensure a policy or sender change cannot reroute an already queued operation.
- Carry the admitted policy revision into the Cloud bill snapshot and require
  the same current Store policy/account again inside the enqueue transaction.
- Add behavior-focused tests for successful Ganatri Utility and Organization
  Cloud bill queueing plus disabled, unentitled, missing phone, invalid Sale,
  missing sender/template, and duplicate-request failures.

### Non-goals

- Due-reminder behavior belongs to 6.2.
- Provider retry, dead-letter, status reconciliation, and deliberate resend
  policy belong to 6.3 except where 6.1 must preserve their existing seams.
- No new WhatsApp delivery engine, sender type, Admin page, or UI language.
- No migration unless a concrete bill-delivery invariant cannot be enforced at
  the existing repository boundary.

### Dependencies and public seams

- Phase 3 platform sender admission/configuration and platform outbox.
- Phase 5 approved Cloud template bindings and Cloud template outbox.
- Current Store policy and Feature Entitlement resolvers.
- `queueInvoiceForStore`, `queueInvoice`, `queueInvoiceForDevice`, existing
  WhatsApp routes, and their shared service clients.

### Verification plan

- Focused bill/invoice, platform-outbox, Cloud-outbox, policy-admission, and
  relevant route/service tests.
- Assert exact sender/template/policy snapshot contents without logging secret
  or private provider data.
- Run `git diff --check`, backend type/build checks, and the Admin build if UI
  callers or shared client contracts change.
- Compare all failures with the recorded repository baseline; do not classify
  a new failure as pre-existing without evidence.

### Risks and rollback

- The existing bill path has both platform and Cloud branches; changes must
  keep their idempotency keys and outbox schemas compatible.
- Account/policy reads can race with a sender switch, so the queued snapshot
  must remain authoritative and no fallback sender may be selected.
- If a required invariant needs a new public decision or migration, stop at
  the 6.1 plan gate and record the decision instead of expanding scope.

### 6.1 exit gate

Both sender modes queue a valid completed-Sale bill through the shared policy
boundary, all negative and duplicate cases are covered, verification is fresh,
and the subphase is reviewed and committed before 6.2 begins.

### 6.1 review and verification

- Bill queueing now uses the account selected by the current Store policy rather
  than selecting an arbitrary assigned account.
- Cloud bill admission carries the policy revision into the immutable snapshot;
  the Cloud outbox transaction requires the same current Store policy, account,
  assignment, sender health, and approved binding while locking the policy row.
- Ganatri Utility continues to use its existing fixed-template/platform outbox
  path, including policy-revision and consent checks.
- Focused bill, platform admission/outbox, Cloud send/outbox, invoice, and
  policy contract suite: 48 passed, 1 existing database-dependent test
  skipped, 0 failed, 114 assertions.
- Backend production build: passed.
- Touched-file TypeScript check: passed; the repository-wide check retains
  unrelated pre-existing diagnostics outside this subphase.
- No migration was required; the existing development database baseline stays
  at 155 applied and 0 pending.
- Admin build was not rerun because this subphase changed no Admin/UI/shared
  client files.

## 6.3 Subphase plan — Status, retry, and deliberate resend

Status: Complete; reviewed and committed

### User-facing outcome

Admin, Store Console, and POS can see the real bill/due delivery state and take
the correct next action. Retry requeues only a retryable/dead-letter operation
using its immutable original snapshot. Deliberate resend creates a new
idempotency identity, is explicit in the UI/API, and records an operator action;
ordinary duplicate requests never create another message.

### Scope

- Resolve bill and due status/retry through the current Store policy and its
  selected sender, including Ganatri Utility platform outbox rows.
- Add due-reminder retry and deliberate resend service, routes, shared clients,
  and the existing billing detail controls for Admin and POS/device callers.
- Keep provider webhook status ordering, timeout reconciliation, bounded retry,
  dead-letter, and permanent-failure behavior in the existing outbox seams.
- Persist explicit resend actions with actor, Store, source outbox, new outbox,
  action, and request identity; do not mutate historical messages.
- Preserve sender/template/policy snapshots and prevent policy switches from
  rerouting queued work.

### Non-goals

- No new delivery worker or provider integration.
- No automatic resend after a provider failure; only bounded retry or explicit
  user action is allowed.
- No campaign/inbox retry redesign; Cloud safety controls remain their own
  Organization-level operator surface.

### Dependencies and public seams

- Existing platform/Cloud outbox status transitions and webhook reconciliation.
- `getInvoiceStatus`, invoice retry/resend, due status, and the shared billing
  detail dialogs.
- Existing Admin/POS service clients and query keys.
- A small delivery-operator audit migration/repository boundary for explicit
  resend actions.

### Verification plan

- Test status selection for both platform and Cloud senders, retryable versus
  terminal states, ordinary duplicate idempotency, and unique resend identity.
- Test due retry/resend routes and both user/device callers; verify the current
  policy account is always used.
- Test provider status ordering, timeout reconciliation, retry/dead-letter
  action guards, and immutable snapshots through existing focused suites and
  source contracts where DB-backed integration is unavailable.
- Run backend/Admin/POS builds as applicable, touched-file TypeScript checks,
  database migration status, and `git diff --check`.

### Risks and rollback

- A resend must never reuse an ordinary or prior resend idempotency key.
- Retry must not reconstruct content or silently follow a new sender/template;
  it reuses the stored outbox snapshot.
- If the audit migration cannot be applied cleanly, stop at the 6.3 gate rather
  than claiming resend completion.

### 6.3 exit gate

Both bill and due operations expose accurate status, bounded retry, and audited
deliberate resend for platform and Cloud modes; duplicate and policy-switch
cases are safe; all checks pass; and 6.3 is reviewed and committed before 6.4.

## 6.2 Subphase plan — Policy-aware due delivery

Status: Complete; reviewed and committed

### User-facing outcome

An authorized Admin, Store Console, or POS caller can send a due reminder only
when the selected Customer has completed Sales with a remaining balance in the
selected Store. The current Store policy determines the sender: Ganatri Utility
uses the fixed due template, while Organization Cloud uses the approved
published due-reminder binding. Consent, suppression, phone, sender health, and
template checks fail safely before a message is queued.

### Scope

- Harden the existing `queueDueReminderForStore` service seam and its user and
  device callers; do not create a second delivery path.
- Keep due-balance selection Store-scoped and completed-sale-only, including
  rejecting a requested `saleId` that is not among that Customer's current due
  Sales in the Store.
- Use the account selected by the current Organization Cloud Store policy and
  carry the policy revision into Cloud due-reminder queueing.
- Preserve the existing fixed Ganatri Utility template validation, platform
  outbox consent check, Cloud template admission, immutable snapshots, and
  daily/idempotent due-reminder keys.
- Add focused tests/contracts for both sender modes, no due balance, invalid
  Customer/Store/phone, consent/suppression, disabled/unentitled policy,
  missing sender/template, and policy/account scope.

### Non-goals

- Retry, dead-letter, status reconciliation, and deliberate resend behavior
  remain in 6.3.
- No change to the Customer/Sale balance model or payment allocation rules.
- No new UI surface or delivery engine; existing Admin, Store Console, and POS
  callers must continue using the shared service.
- No migration unless a concrete due-delivery invariant requires a schema
  boundary.

### Dependencies and public seams

- 6.1 policy-aware bill delivery and the shared Cloud policy lock.
- `billingRepository.getDueSalesByCustomerStore` as the authoritative due
  balance/scope read.
- `queueDueReminderForStore`, `queueDueReminder`, and
  `queueDueReminderForDevice`.
- Existing platform and Cloud outbox, consent, template, and policy services.

### Verification plan

- Run due text/component/PDF tests plus due service/policy contracts and the
  6.1 bill/outbox regression suite.
- Assert policy-selected account and revision are passed to Cloud queueing;
  assert no fallback account selection is possible.
- Run touched-file TypeScript diagnostics, backend build, `git diff --check`,
  and database status if no migration is introduced.
- Separate the existing platform outbox database-dependent skip and unrelated
  repository-wide typecheck failures from new 6.2 results.

### Risks and rollback

- Due reminders may cover one Sale or a Customer statement; idempotency must
  remain stable for the same due set and day without preventing a future
  deliberate resend.
- PDF/media preparation must clean up temporary storage when admission or
  queueing fails.
- A policy/account switch must never reroute an already admitted Cloud send;
  the transaction-level policy check remains authoritative.

### 6.2 exit gate

Both sender modes queue only valid Store-scoped due reminders with current
consent and immutable sender/template/policy snapshots, negative cases are
covered, verification is fresh, and the subphase is reviewed and committed
before 6.3 begins.

### 6.2 review and verification

- Due delivery now uses the Cloud account selected by the current Store policy;
  it cannot fall back to an arbitrary assigned account.
- Cloud due-reminder queueing carries the current policy revision through both
  user and device paths, allowing the shared Cloud outbox policy transaction
  to reject a sender/policy switch before insertion.
- Completed-sale and remaining-balance selection remains delegated to the
  Store-scoped billing repository; a requested Sale outside that due set is
  rejected before preparation.
- Existing platform/Cloud consent, suppression, phone, sender-health, fixed or
  published-template, idempotency, and media-cleanup boundaries remain in use.
- Focused due, bill, platform admission/outbox, Cloud send/outbox, and policy
  suite: 57 passed, 1 existing database-dependent test skipped, 0 failed,
  127 assertions.
- Backend production build: passed.
- Touched-file TypeScript check: passed; repository-wide diagnostics remain
  unrelated pre-existing baseline failures.
- `git diff --check`: passed; no migration was required and the development
  database remains at 155 applied and 0 pending.
- Admin build was not rerun because this subphase changed no Admin/UI/shared
  client files.

### 6.3 review and verification

- Invoice status/retry now resolves the current Store policy account; due status
  now reports Ganatri Utility platform outbox rows as well as Cloud rows.
- Due retry and deliberate resend are available through Admin and POS/device
  routes and shared clients; billing dialogs distinguish queue, retry, sending,
  and explicit resend states.
- Ordinary due requests retain their deterministic idempotency key; resend uses
  a separate request-scoped key and records the source/new outboxes, actor, and
  action in `whatsapp_delivery_operator_actions`.
- Provider status ordering, bounded retry, reconciliation, permanent failure,
  and dead-letter behavior remain in the existing outbox paths.
- Full WhatsApp suite: 293 passed, 3 known database-dependent tests skipped,
  0 failed, 753 assertions.
- Backend, Admin, and POS production builds: passed. Touched-file TypeScript
  diagnostics: passed. `git diff --check`: passed.
- Development database: 156 migrations applied, 0 pending; the new delivery
  operator-action migration is applied and represented in `db/schema.sql`.

## 6.4 Subphase plan — Delivery closeout review

Status: Complete; reviewed and committed

### Scope and exit checks

- Review all Phase 6 commits on Standards and Spec axes against the approved
  bill/due delivery contract.
- Run the complete WhatsApp regression suite, backend/Admin/POS production
  builds, touched-file TypeScript diagnostics, `git diff --check`, and database
  migration status.
- Verify both sender modes, policy/entitlement/consent/phone/balance gates,
  immutable snapshots, duplicate idempotency, provider status ordering,
  bounded retry, dead-letter/reconciliation, and explicit audited resend.
- Confirm Admin, Store Console, and POS/device callers use the same backend
  policy boundary and that no secrets or message bodies enter new audit/log
  records.

### Non-goals

- No Phase 7 migration/cutover work, inbox/reply work, or promotion redesign.
- No release claim for live Meta credentials, provider webhook delivery, or
  physical-device verification unless those environments are explicitly run.

### Exit gate

Phase 6 is complete with documented follow-ups only after all four subphases
are reviewed, verified, committed, and the worktree is clean.

## Phase 6 final verification and review

- Phase commits: `8c8d802` (6.1), `45efca5` (6.2), `46fb44c` (6.3), plus the
  final status-preservation closeout commit.
- Standards/spec review: both sender modes use the shared policy-aware outbox;
  current policy/account scope is enforced at queue and retry boundaries;
  status reads preserve historical outbox visibility after policy changes;
  ordinary duplicates remain idempotent; retries reuse immutable snapshots;
  explicit resends use new request-scoped identities and audited records.
- Full WhatsApp suite: 293 passed, 3 known database-dependent tests skipped,
  0 failed, 755 assertions.
- Backend, Admin, and POS production builds: passed.
- Touched-file TypeScript diagnostics: passed; unrelated repository-wide
  baseline diagnostics remain documented outside this phase.
- `git diff --check`: passed.
- Development database: 156 migrations applied, 0 pending.
- Remaining follow-ups: live Meta credentials/webhook delivery, real browser
  verification across Admin/Store Console, and physical-device verification
  remain release-environment gates; Phase 7 migration/cutover is next.
