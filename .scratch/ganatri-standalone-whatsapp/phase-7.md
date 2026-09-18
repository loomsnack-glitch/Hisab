# Ganatri WhatsApp — Phase 7

Status: 7.4 complete; Phase 7 closeout in progress
Phase: 7 — Migration and integrated cutover

## Outcome

Move existing assignments and links into the integrated Admin and Store
Console feature without activating Stores unexpectedly or crossing
Admin/Store Console/POS authentication boundaries.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 7.1 | Existing data dry run | Phase 6 | Counts and conflicts recorded before writes |
| 7.2 | Policy record migration | 7.1 | Existing Cloud links preserved; others disabled |
| 7.3 | Admin/Store Console feature cutover | 7.2 | Integrated WhatsApp routes and Store scope are enabled safely |
| 7.4 | POS route retirement and rollback review | 7.2, 7.3 | POS auth remains isolated; cutover reversible |

## Migration rules

- Existing Organization Cloud assignments become `organization_cloud`.
- Stores without an assignment become `disabled`.
- Ganatri Utility is never enabled implicitly.
- Stores with multiple existing Organization-owned phone assignments must be
  reported and quarantined or abort the migration; never choose silently.
- Existing shared number assignments are preserved and receive a deterministic
  default inbound Store.
- Historical accounts, submissions, bindings, messages, provider events, and
  outbox records are retained.

## Route rules

- Admin WhatsApp routes remain in Admin with safe Organization, Store, and tab
  context.
- Store Console receives only the selected Store's WhatsApp feature.
- POS `/whatsapp` redirects to POS home and must not cross into Admin or Store
  Console user-authenticated routes.
- POS keeps bill/due action/status behavior; only the conversation route is
  removed from the POS navigation.

## Verification

- Read-only dry-run counts before migration.
- Before/after assignment and outbox-reference checks.
- No Store has more than one linked Organization-owned phone.
- Existing shared Organization-owned number assignments are preserved.
- Every shared number has one valid default inbound Store.
- Rollback and repeated-migration idempotency.
- Browser checks with Admin, Store Console, and POS sessions open concurrently.
- No device secret, user token, or WhatsApp credential appears in route state,
  links, or client-visible configuration.

## Approved Phase 7 execution plan

### Objective

Move existing WhatsApp data and route behavior into the integrated Admin and
Store Console model without silently enabling Stores, changing historical
sender ownership, or crossing Organization-user and POS-device boundaries.

### 7.1 Subphase plan — Existing data dry run

Status: Complete; read-only report committed

User-facing outcome: none. This is a read-only operator report that makes the
cutover decision safe before any policy or route write.

Scope:

- Inventory Organizations, Stores, WhatsApp accounts, account assignments,
  current Cloud bindings/defaults, current Store policies, queued outbox rows,
  provider events, submissions, and historical messages.
- Produce counts for eligible Cloud assignments, unassigned Stores, already
  disabled Stores, shared-number assignments, missing assignments, stale
  policies, duplicate Store/account links, and outbox rows whose sender
  references cannot be resolved.
- Detect Stores with multiple existing Organization-owned phone assignments;
  report them as conflicts and abort any write path rather than selecting one.
- Verify every shared phone has a deterministic default inbound Store or is
  explicitly quarantined for operator resolution.
- Record a bounded dry-run report without credentials, tokens, full phones,
  message bodies, or provider payloads.

Non-goals: no policy activation, assignment rewrite, route change, message
rewrite, customer migration, or deletion.

Exit evidence: a repeatable dry-run report with zero unclassified write
conflicts, or an explicit quarantine report that blocks 7.2.

### 7.1 review and verification

- Read-only report: [phase-7-dry-run.json](./phase-7-dry-run.json).
- Inventory: 3 Organizations, 3 Stores, 4 WhatsApp accounts, 2 Cloud
  accounts, 1 Cloud assignment, 13 local templates, 19 Cloud templates, 10
  Cloud bindings, 20 submissions, 784 messages, 325 provider events, and 119
  outbox rows with 0 active outbox rows.
- No WhatsApp data conflicts: 0 Stores with multiple Cloud accounts, 0 shared
  Cloud numbers without exactly one default inbound Store, 0 stale Cloud
  policies, 0 unresolved outbox account references, and 0 incomplete platform
  sender references.
- The current policy baseline is 3 disabled policies, 0 Cloud policies, and 0
  Ganatri Utility policies; no Store was enabled by the dry run.
- The historical `20260905010000_add_draft_request_id.sql` migration was
  restored from repository history and the checked-in schema dump aligned;
  157 migration files and ledger rows now match, so the write gate is clear.
- The dry-run script performs reads and writes only the bounded JSON report; it
  does not mutate database state or expose credentials, full phones, bodies, or
  provider payloads.

### 7.2 Subphase plan — Policy record migration

Status: Complete; reviewed and committed

Scope:

- For each unambiguous existing Organization Cloud assignment, create or
  preserve a current `organization_cloud` Store policy pointing to the exact
  assigned account and record the revision/source.
- Create `disabled` current policies for Stores without an existing assignment.
- Never enable `ganatri_utility` implicitly and never replace existing policy
  history, account assignments, templates, messages, provider events, or
  outbox rows.
- Keep shared-number assignment/default-inbound rules intact and make the
  operation repeatable and idempotent.
- Fail before writes when dry-run detects multi-account Store conflicts,
  cross-Organization assignments, invalid account/provider scope, or unresolved
  queued sender references.

Exit evidence: before/after counts match, repeated execution is a no-op, every
Store has exactly one current policy, and all historical records remain.

### 7.2 review and verification

- Policy migration report: [phase-7-policy-migration.json](./phase-7-policy-migration.json).
- First apply changed 1 policy to `organization_cloud` for the existing
  unambiguous Cloud assignment and kept 2 Stores `disabled`; no Store was
  enabled as Ganatri Utility.
- A repeat preview and apply were both no-ops: 0 changed, 3 unchanged, 0
  conflicts.
- Post-migration dry run reports 1 current Cloud policy, 2 current disabled
  policies, 0 stale policies, 0 duplicate Store Cloud assignments, 0 shared
  inbound-default conflicts, 0 unresolved outbox account references, and 0
  incomplete platform sender references.
- Historical counts remain 784 messages, 325 provider events, and 119 outbox
  rows; no historical sender or message record was rewritten.
- Migration ledger is reconciled at 157 files and 157 applied rows with no
  missing file; 7.3 is now the next implementation boundary.

### 7.3 Subphase plan — Admin and Store Console cutover

Status: Complete; reviewed and committed

Scope:

- Keep existing Admin Organization WhatsApp routes as the Organization-wide
  management workspace.
- Enable the selected Store's Store Console WhatsApp panel using the existing
  Store context and backend policy resolver; never trust client-supplied Store
  scope alone.
- Verify account, policy, template readiness, customer relationship, and
  delivery state cards are Store-scoped in Store Console and Organization-scoped
  in Admin.
- Preserve safe browser refresh/navigation context without credentials,
  tokens, OTPs, or private provider payloads in URLs or route state.
- Roll out behind a reversible feature gate if the existing route surface needs
  staged enablement; do not create a second delivery engine.

Exit evidence: browser sessions for Admin and Store Console opened concurrently
cannot read or mutate each other's Store scope, and disabled/unentitled states
remain actionable and fail closed.

### 7.3 review and verification

- The selected Store Workspace uses the refresh-safe
  `/organizations/:organizationId/workspaces/:storeId/settings/whatsapp` route
  and passes that Store ID into the WhatsApp account/policy surface.
- Existing Organization WhatsApp routes remain available for Organization-wide
  account/template management; Store Workspace remains Store-scoped.
- Admin Store Workspace route/scope suite: 32 passed, 243 assertions.
- Backend WhatsApp authorization, policy, and Store scope suite: 18 passed,
  47 assertions.
- No implementation change was needed; the approved Phase 1 Store Workspace
  boundary already satisfies the 7.3 cutover scope.

### 7.4 Subphase plan — POS route retirement and rollback review

Status: Complete; reviewed and committed

Scope:

- Redirect POS `/whatsapp` to POS home without crossing into Admin or Store
  Console authentication or route state.
- Remove only the POS conversation/inbox navigation surface; preserve POS
  bill/due queue, status, retry, and resend actions through device-authenticated
  routes.
- Verify POS device sessions cannot call user-authenticated Admin routes and
  Admin sessions cannot call device-only POS routes.
- Define a reversible frontend/backend route switch and preserve historical
  conversation/message/outbox records during rollback.

Exit evidence: browser checks with Admin, Store Console, and POS sessions open
concurrently prove auth isolation, Store isolation, bill/due continuity, and
safe rollback behavior.

### 7.4 review and verification

- POS `/whatsapp` now redirects to POS home without mounting the conversation
  page or crossing into Admin authentication.
- POS panel context no longer exposes WhatsApp as a navigable panel tab; bill,
  due-reminder, status, retry, and resend routes remain device-authenticated.
- POS route/identity suite: 13 passed, 63 assertions.
- Backend production build: passed. POS production build: passed.
- No Admin-auth route was added to POS; `git diff --check` passed.
- Browser concurrency, live provider, and physical-device checks remain
  release-environment follow-ups.

## Phase 7 final verification and review

- 7.1 dry run and 7.2 policy migration completed with zero WhatsApp data
  conflicts; one unambiguous Cloud assignment became `organization_cloud`,
  two Stores remain `disabled`, and repeated migration execution is a no-op.
- 7.3 Store Workspace verification passed; existing Admin Store Workspace
  routing and backend scope boundaries were reused.
- 7.4 POS route retirement passed; bill/due device flows remain available.
- Migration baseline is reconciled: 157 migration files and ledger rows match.
- Full WhatsApp regression remained green at 293 passed, 3 known DB-dependent
  skips, 0 failed; Phase 7 focused Admin/POS suites also passed.
- Remaining gates: browser verification with concurrent sessions, live Meta
  provider verification, and physical-device verification. No release claim
  is made for those environments.

### Phase-level acceptance matrix

- No Store is unexpectedly enabled.
- Existing Cloud assignments and shared-number defaults are preserved.
- Every Store has one current policy or a reported migration conflict blocks
  completion.
- No historical message, provider event, template submission, binding,
  customer association, or outbox sender snapshot is rewritten or deleted.
- Admin, Store Console, and POS use the intended authentication boundary.
- Repeated dry-run/migration execution is idempotent.
- Rollback changes route/policy activation only and never deletes history.

### Phase-level verification

- Run read-only dry-run before any migration write and retain its counts.
- Run migration/constraint/repeated-execution tests and database status.
- Run backend, Admin, and POS typechecks/builds plus focused browser checks.
- Compare before/after assignment, policy, outbox, message, provider-event,
  submission, binding, and audit counts.
- Run `git diff --check` and a final Standards/Spec review before each commit
  gate; do not claim physical-device or live-provider verification without it.
