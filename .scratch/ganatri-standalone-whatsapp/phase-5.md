# Ganatri WhatsApp — Phase 5

Status: 5.3 implementation and verification in progress
Phase: 5 — Organization template lifecycle

## Outcome

Provide creator-only WABA template drafts, Meta submission, approval tracking,
and explicit Store binding/default publishing.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 5.1 | Draft persistence | Phase 4 | Saving a draft does not call Meta |
| 5.2 | Meta submission and status sync | 5.1 | Idempotent provider submission and safe statuses |
| 5.3 | Store binding and explicit publish | 5.2, Phase 2 | Approved revision becomes selected Store default only by action |
| 5.4 | Archive/rollback/audit review | 5.3 | Historical revisions preserved; focused commit |

## Rules

- Templates belong to Organization + WABA.
- Bindings/defaults belong to Store + sender/WABA + kind + language.
- Bill/due force `UTILITY`; promotion forces `MARKETING`.
- Authentication templates remain platform-owned.
- Pending/rejected/paused/disabled templates cannot send.
- Approval never replaces a live default automatically.
- Historical revisions are archived or rolled back, never hard-deleted.

## Verification

- Draft, submission, webhook, approval, rejection, and retry tests.
- Category, variable, sample, language, media, and naming validation tests.
- Concurrent default publish uniqueness tests.
- Cross-Organization/WABA/Store binding tests.
- Archive/rollback and audit-event tests.

## 5.1 Subphase plan — Draft persistence

Status: Committed; review record retained

### User-facing outcome

The Organization creator can save a validated Cloud template draft from the
existing Admin authoring dialog. Draft persistence stores the WABA/Store
context, kind, language, components, samples, and idempotency identity without
calling Meta or resolving a credential.

### Scope

- Add a dedicated backend draft-save seam and route separate from Meta
  submission.
- Reuse the existing component/name/language/kind validation and
  Organization/Store/WABA scope checks.
- Add the shared service client and Admin Save draft action.
- Preserve existing submission behavior; draft save cannot change a draft into
  a provider lifecycle state.

### Non-goals

- No Meta submission, provider upload, approval webhook, Store default publish,
  archive, or rollback behavior in this subphase.
- Header sample binary upload remains part of submission/provider flow; draft
  authoring retains the validated component/sample metadata.

### Verification and review record

- Template service/repository tests: 25 passed, 0 failed.
- Draft test proves the credential vault and provider client are not called.
- Backend production build: passed; Admin production build: passed;
  `git diff --check`: passed.
- Spec review: draft persistence is separate from Meta submission and remains
  WABA-scoped with optional Store origin.
- Standards review: the new seam reuses existing submission validation,
  service-client, route, and Admin dialog boundaries without a second template
  model.

### Exit gate

Draft persistence is committed; 5.2 may add idempotent Meta submission and
provider status synchronization.

### 5.1 review correction

The 5.1 review found that a creator editing a saved draft could receive the
older active draft instead of updating it. Draft requests now carry an optional
submission ID, update only an editable `draft` row scoped to the same
Organization/WABA, and preserve the no-Meta-call boundary. The Admin dialog
retains the draft ID after saving so later saves update the same draft.

- Latest focused template tests: 19 passed, 0 failed.
- Backend and Admin production builds: passed.

## 5.2 Subphase plan — Meta submission and status sync

Status: In progress; plan reviewed and recorded

### User-facing outcome

The creator can submit one saved draft idempotently to Meta. Provider approval,
rejection, pause, disable, and pending updates are applied by ordered webhook
identity without exposing credentials or accidentally moving a Store default.

### Scope

- Review and harden the existing submission claim/idempotency, provider upload,
  provider-template refresh, and failure-state transitions.
- Ensure provider status updates are matched by WABA/template identity and
  ordered by provider timestamp.
- Add focused tests for duplicate submission, stale status, approval, reject,
  pending, provider failure, and no credential/payload leakage.
- Preserve draft-only behavior and defer explicit Store publish to 5.3.

### Non-goals

- No automatic Store default replacement.
- No archive/rollback or new template component model beyond current
  validation.

### Verification

- Cloud template service, submission repository, provider client, and webhook
  processor tests.
- Backend/Admin builds and `git diff --check`.

### Exit gate

Meta submission and safe provider status synchronization are verified and
committed before 5.3 binding/publish work begins.

### Verification and review record

- Cloud template service, submission repository, provider client, and webhook
  processor tests: 36 passed, 0 failed.
- Active-name idempotency now returns a conflict when different content uses
  an existing active draft/submission; it never submits the older content.
- Existing claim/retry/status ordering remains covered, including approval,
  rejection, pending, pause, disable, and stale provider events.
- Backend production build: passed; Admin production build: passed;
  `git diff --check`: passed.
- Spec review: provider status changes do not publish Store defaults, provider
  credentials remain backend-only, and duplicate submissions stay idempotent.
- Standards review: the conflict is represented as a typed repository error
  and mapped through the existing safe service error boundary.

## 5.3 Subphase plan — Store binding and explicit publish

Status: In progress; plan reviewed and recorded

### User-facing outcome

Only an approved, correctly categorized Cloud template can become the selected
Store default. Publication is explicit, scoped to the Store's current Cloud
policy and WABA, and keeps Cloud/local default state aligned under concurrent
changes.

### Scope

- Reuse the existing binding/default repository and explicit publish actions.
- Enforce current Store `organization_cloud` policy/account scope at the
  database boundary, not only through UI or stale historical assignments.
- Keep one active Cloud default per Store/kind and synchronize the associated
  local template default on re-publish and rollback.
- Preserve approval/category/variable validation and defer archive/rollback
  lifecycle review to 5.4.

### Verification

- Focused binding/service tests and repository contract checks.
- Concurrent default uniqueness and cross-Organization/WABA/Store cases.
- Backend/Admin builds and `git diff --check`.

### Exit gate

Store binding and explicit publication are verified and committed before 5.4
archive/rollback/audit review begins.
