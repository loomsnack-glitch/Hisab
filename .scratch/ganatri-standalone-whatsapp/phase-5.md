# Ganatri WhatsApp — Phase 5

Status: 5.1 committed; 5.2 next
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
