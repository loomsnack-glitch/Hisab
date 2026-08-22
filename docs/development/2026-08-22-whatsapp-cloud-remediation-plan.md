# WhatsApp Cloud API remediation plan

Date: 2026-08-22
Source review: [`docs/reviews/2026-08-22-whatsapp-cloud-api-full-review.md`](../reviews/2026-08-22-whatsapp-cloud-api-full-review.md)
Branch: `feat/whatsapp`

## Working rule

Each phase runs the same bounded loop:

1. Research the relevant code, database state, and existing tests.
2. Write the phase acceptance criteria before editing.
3. Implement the smallest production-grade change at the existing seam.
4. Run focused tests and type checks.
5. Review the diff against repository standards and the migration specification.
6. Record evidence and remaining blockers here.
7. Commit only after the user explicitly approves the reviewed phase.

No phase may enable Cloud sending, remove Baileys/QR/port `8100`, or claim a live provider gate without controlled evidence.

## Phase status

| Phase | Scope | Status | Exit condition |
| --- | --- | --- | --- |
| 1 | Shared contracts and state-transition correctness | **Committed in `20fe26e`** | Template DTOs accept Cloud values; late/duplicate failures cannot corrupt terminal delivery state; Cloud health cannot cast invalid legacy enums. |
| 2 | Unknown-submission reconciliation | **In progress** | Stale `reconciling` work has bounded recovery and quota/campaign accounting; metrics and operator-safe actions remain. |
| 3 | Runtime credentials and deployment configuration | Blocked on infrastructure decision | A real secret-manager adapter and private media configuration are assembled in the default runtime, documented, and covered by assembly tests. |
| 4 | Data invariants and template mapping | **Committed in `20fe26e`** | WABA/template relationships are database-enforced; bindings persist an explicit mapping and reject stale local templates. |
| 5 | Admin operator workflow | **In progress** | Cloud template sync/binding is reachable without raw provider identifiers; usage/safety, consent, and provider-health surfaces remain. |
| 6 | Controlled acceptance and release readiness | Pending | Target-DB checks, live test WABA checklist, baseline typecheck cleanup, documentation update, staged rollout, and rollback evidence are complete. |
| 7 | Baileys retirement | Intentionally blocked | Only starts after Phase 6 passes; removes QR/Baileys/auth-state/worker/port `8100` through a separate release. |

## Phase 1 — Shared contracts and state transitions

### Findings in scope

- WAC-002: shared schemas omit `template`.
- WAC-004: late failure side effects can contradict delivered/read state.
- WAC-005: Cloud health can cast `suspended` into the legacy enum and leave `needs_action` stale.

### Acceptance criteria

- `WhatsAppMessageDTOSchema` and `WhatsAppOutboxKindSchema` accept the values written by the Cloud migrations and outbox.
- A failure status after `delivered` or `read` does not dead-letter the outbox, release quota, or fail the campaign.
- Duplicate failures do not repeat campaign/quota side effects.
- A failure for a non-terminal message updates the message and only changes outbox state when the outbox is still non-terminal.
- Cloud health updates never cast a Cloud-only status into `whatsapp_account_status_enum`.
- `needs_action`, `suspended`, and `failed` block sending through a consistent compatibility status.
- Focused Cloud/WhatsApp tests, package types, Admin types, and `git diff --check` pass.

### Implementation loop

- [x] Research current schemas, SQL status transitions, and Cloud health enums.
- [x] Define acceptance criteria.
- [x] Implement.
- [x] Verify: 130 WhatsApp tests pass; package types/Admin types pass; `git diff --check` passes.
- [x] Review: no new Phase 1 correctness finding; commit remains user-gated.
- [ ] User approval and commit.

## Phase 2 — Unknown-submission reconciliation

### Scope

- Add an explicit age/deadline for `reconciling` rows.
- Add a reconciliation sweep separate from ordinary dispatch.
- Preserve duplicate-send safety: never automatically resend an unknown submission without provider evidence.
- Settle or release quota according to the final disposition.
- Update campaign recipient/campaign status atomically.
- Expose counts and oldest age in safety/operations metrics.
- Add operator-safe replay/dead-letter actions with authorization and audit evidence.

### Current evidence

- [x] `reconciling` rows older than the bounded timeout are resolved without automatic resend.
- [x] Delivered/read rows settle quota and campaign state; unresolved rows are dead-lettered and release quota.
- [x] Sweep runs from the backend runtime every 60 seconds when Cloud outbox sending is enabled.
- [ ] Add operator metrics and authenticated replay/dead-letter controls.

### Next loop: operator observability and bounded manual recovery

Acceptance criteria:

- The safety response reports Cloud outbox rows currently reconciling, oldest reconciliation age, retryable rows, and dead letters.
- An authorized organization user can trigger one bounded stale-reconciliation sweep for that organization.
- The manual action never resends an uncertain submission and is safe to repeat.
- The Admin safety card displays the summary, warning state, and action result without exposing provider credentials or IDs.
- Focused backend/Admin/shared-type checks pass, and the slice is committed independently.

Evidence:

- [x] Organization-scoped summary and bounded reconciliation action are implemented; unresolved submissions are never resent.
- [x] Admin safety card exposes only counts, age, and action status.
- [x] 133 WhatsApp tests pass; Admin and shared-type checks pass; changed Cloud files have no TypeScript errors.

## Phase 3 — Runtime credentials and deployment configuration

### Scope

- Select and implement the approved secret-manager adapter; do not replace it with a plaintext database or ad hoc environment token map.
- Wire the adapter into the default onboarding, refresh, template-sync, and outbox runtime.
- Add readiness validation for backend Graph/app/webhook settings and Admin Embedded Signup settings.
- Document private media storage and signed URL requirements.
- Add assembly tests without logging credential material.

### External decision required

The repository currently defines only the vault port and an unavailable fallback. A production secret-manager choice, credentials, key rotation policy, and deployment wiring cannot be safely invented by a code-only change.

## Phase 4 — Data invariants and template mapping

### Scope

- Enforce that a binding's Cloud asset belongs to the same WABA selected by the binding.
- Enforce approved/category-compatible bindings at creation or label them explicitly as unusable.
- Replace positional local-token mapping with an explicit mapping contract or reject mismatched provider definitions.
- Add order-difference, button, media, and version-change tests.

### Current evidence

- [x] Composite WABA/template/Organization database foreign key applied in migration `20260822180000`.
- [x] Binding creation accepts only approved, category-compatible assets assigned to the Store.
- [x] Binding migration `20260822190000` stores the local body snapshot and placeholder mapping; legacy active bindings are safely deactivated for rebind.
- [x] Send builders use the persisted mapping and reject changed local templates or incomplete mappings.
- [x] Mapping, button, media, and reordered-token tests pass.

## Phase 5 — Admin operator workflow

### Scope

- Accounts: status, quality, Meta limit, business name, Store assignments, action state.
- Templates: sync assets, approval/category/language, mapping, preview, binding, and safe refresh.
- Usage: Hisab quota, Meta snapshot, current period, budget, reconciliation warnings.
- Campaigns: opt-in count, cooldown/limit warnings, queue progress, failure reasons, and stop action.
- Consent: explicit history/suppression workflow where authorized.
- Remove raw WABA/Phone Number IDs from normal UI.

### Current evidence

- [x] Templates tab now syncs approved Meta assets and binds them to Store-local message templates.
- [x] The raw WABA identifier was removed from the normal account card.
- [x] Accounts tab now shows organization Cloud usage, quota snapshots, and reconciliation warnings.
- [x] Promotion dashboard exposes a confirmation-gated Stop action only when the Store uses a Cloud account.
- [ ] Add consent, provider-health, preview, and clearer binding/remap feedback.

## Phase 6 — Controlled acceptance and release readiness

Run the plan's live test-WABA checklist for bill, due reminder, promotion/media, inbound reply, duplicate webhook, status ordering, uncertain submission, quota rejection, campaign stop, reconnect/reload, and legacy-account preservation. Record target DB integrity and rollback evidence.

## Phase 7 — Baileys retirement

Keep this phase blocked until Phase 6 is complete. Retirement must be a separate release with an account migration inventory, outbox freeze/drain plan, historical-data verification, and production monitoring/runbook evidence.
