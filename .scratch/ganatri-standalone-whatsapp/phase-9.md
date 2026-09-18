# Ganatri WhatsApp — Phase 9

Status: Complete with release-environment follow-ups
Phase: 9 — Promotions and operations

## Outcome

Organization Cloud Stores can create consent-safe, approved marketing
campaigns with bounded recipients and sender/policy isolation. Ganatri Utility
and disabled Stores never gain promotion capability.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 9.1 | Marketing admission and campaign creation | Phase 8, templates, consent | Approved binding, consent-filtered recipients, cooldown/quota-safe queueing |
| 9.2 | Campaign delivery operations | 9.1 | Progress, stop, retry, resend, and recipient actions are scoped and audited |
| 9.3 | Safety and operational visibility | 9.1, 9.2 | Quota/outbox/webhook health, audit, reconciliation, and redaction surfaces |

## Non-goals

- No marketing or promotion sends through `ganatri_utility` or `disabled` Stores.
- No unapproved, inactive, cross-Store, cross-WABA, or cross-Organization
  template selection.
- No new sender mode, pricing model, or separate campaign delivery engine.
- No Phase 9.2 operational actions or Phase 9.3 observability expansion during
  9.1.

## Verification

- Promotion admission and policy-matrix tests.
- Approved binding, consent/suppression, recipient cap, cooldown, quota, and
  idempotency tests.
- Admin promotion-dialog/dashboard tests for disabled, cooldown, no-eligible,
  and successful Cloud states.
- Backend/Admin typechecks, builds, focused WhatsApp regression, and
  `git diff --check`.
- Browser/live-provider verification remains a release follow-up unless an
  authenticated environment is available.

## Approved Phase 9 execution plan

### 9.1 Subphase plan — Marketing admission and campaign creation

Status: Complete; reviewed and ready to commit

User-facing outcome: An Organization administrator can open the existing
Promotions surface for an Organization Cloud Store, choose an approved
Store-bound marketing template, see the eligible-recipient/cooldown state, and
create one bounded campaign. The campaign is queued only for active Customers
with valid phones, marketing consent, and no suppression/opt-out.

Scope:

- Revalidate the current Store policy, WhatsApp entitlement, selected Cloud
  account, connected/verified phone, same-WABA approved promotion binding,
  active local promotion template, and exact body/variable mapping.
- Keep recipient selection backend-owned: active Organization Customers only,
  valid E.164 phone numbers, marketing opted in, not opted out, and not
  suppressed; preserve the 1,000-recipient bound.
- Preserve the existing Store cooldown and Cloud quota/idempotency seams, and
  make failed admission clean up any temporary campaign media/reservation.
- Verify the existing Admin promotion dialog and dashboard communicate policy
  denial, no eligible recipients, cooldown, queued count, and successful
  campaign creation with the shared UI primitives.
- Add focused tests for the observable admission matrix and current
  implementation gaps; do not redesign campaign delivery actions yet.

Acceptance criteria:

- Utility/disabled/non-Cloud Stores cannot create promotions, regardless of
  client input.
- A binding from another Store, WABA, account, or non-approved template is
  rejected before recipient queueing.
- Suppressed, opted-out, inactive, phone-less, and invalid-phone Customers are
  excluded before campaign creation.
- Cooldown and quota/idempotency failures do not leave orphaned campaign media
  or sendable recipient rows.
- The Admin Promotions surface exposes the correct loading, empty, blocked,
  cooldown, and success states for this slice.

Dependencies and public seams:

- `promotion.ts`, Cloud template admission/binding, policy resolver, consent,
  quota, and Cloud template outbox repositories.
- Existing Admin `WhatsAppPromotionDashboard` and `PromotionDialog`.
- Phase 8 Organization Cloud sender and Store scope boundaries.

Verification plan:

- Focused backend promotion/admission tests and existing Cloud template tests.
- Migration/schema contract checks where touched.
- Admin promotion dashboard/dialog tests.
- Backend/Admin typechecks and production builds, full WhatsApp regression,
  and `git diff --check`.

9.1 exit gate: promotion admission and campaign creation are Cloud-only,
approved-template-only, consent-safe, bounded, cooldown/quota/idempotent, and
reviewed/committed before 9.2 begins.

### 9.1 review and verification

- Campaign creation now resolves the exact current Store policy-selected Cloud
  account and verifies Organization ownership and Store assignment.
- Eligible recipients are limited to Customers with a Customer–Store
  association for the selected Store, active status, valid E.164 phone,
  marketing opt-in, no marketing opt-out, and no WhatsApp suppression.
- Existing approved promotion binding, same-WABA, active local-template,
  cooldown, quota, media-bound, and per-recipient idempotency checks remain in
  the queue path.
- Focused promotion admission and policy contract tests: 11 passed.
- Full WhatsApp regression: 304 passed, 3 skipped, 0 failed.
- Admin Organization WhatsApp/safety tests: 5 passed.
- Backend build, touched-file TypeScript diagnostics, and `git diff --check`:
  passed.
- Database-backed Customer–Store association verification remains an external
  development-database follow-up from Phase 8; the Store-scope query is
  covered by the 9.1 contract test.

### 9.2 Subphase plan — Campaign delivery operations

Status: Implementation in progress

User-facing outcome: Organization administrators can monitor campaign progress,
stop queued work, inspect recipient delivery states, and safely retry or resend
failed recipients. Every operation remains Organization/Store/campaign scoped
and preserves the original sender/template snapshot.

Scope:

- Revalidate the current Store policy and require recipient retry/resend work
  to belong to the policy-selected Organization Cloud account.
- Preserve existing campaign progress aggregation, recipient filtering,
  cooldown-aware resend protection, Cloud outbox retry/dead-letter transitions,
  and operator audit records.
- Keep stop, retry, and resend actions idempotent and fail closed for terminal,
  cancelled, cross-Store, retired-account, or non-Cloud work.
- Verify the existing Admin dashboard exposes queued/sending/sent/delivered/
  read/failed progress, recipient details, stop, retry, and resend feedback.

Non-goals:

- No new quota/health/audit dashboard; that belongs to 9.3.
- No campaign scheduling, segmentation builder, or new marketing message type.
- No change to the approved-template or recipient-admission rules from 9.1.

Acceptance criteria:

- Retry and resend reject a recipient whose outbox sender no longer matches the
  current Store policy-selected Cloud account.
- Stop cancels only pending/retryable campaign work within the Organization and
  releases its quota reservations.
- Recipient actions preserve campaign/store/account scope and write operator
  audit records where applicable.
- Admin progress and recipient action states remain consistent with backend
  status transitions.

Verification plan:

- Focused recipient-action and sender-policy contract tests.
- Existing Cloud outbox, recipient, resend-cooldown, and campaign dashboard
  tests.
- Backend/Admin typechecks and builds, full WhatsApp regression, and
  `git diff --check`.

9.2 exit gate: campaign progress, stop, retry, and resend are scoped,
idempotent, sender-safe, audited, reviewed, and committed before 9.3 begins.

### 9.2 review and verification

- Retry and resend now reject recipients whose original outbox account no
  longer matches the current Store policy-selected Cloud account.
- Existing stop, progress, recipient inspection, cooldown-aware resend,
  retry/dead-letter, and operator-audit seams remain in use.
- Focused operations and recipient tests: 4 passed.
- Full WhatsApp regression: 305 passed, 3 skipped, 0 failed.
- Backend build, touched-file TypeScript diagnostics, and `git diff --check`:
  passed.
- Admin campaign dashboard behavior remains covered by the existing component
  surface; browser verification remains a release follow-up.

### 9.3 Subphase plan — Safety and operational visibility

Status: Implementation in progress

User-facing outcome: Organization administrators can see bounded Cloud quota,
outbox, webhook, reconciliation, and operator-action health from the existing
Cloud sending controls surface. The surface exposes safe counters and times
only; it never displays payloads, tokens, message bodies, or credential data.

Scope:

- Add Organization-scoped webhook health counters for pending, processing,
  retryable, dead-letter, oldest-open, and last-received state.
- Add bounded summaries of Cloud outbox operator actions alongside existing
  quota/reconciliation/outbox controls.
- Keep operational actions permission/entitlement-protected and preserve
  existing safe redaction and reconciliation behavior.
- Verify the existing Admin Cloud sending controls card renders loading,
  healthy, warning, error, and redacted operational states.

Non-goals:

- No payload browser, message-body log, token/credential display, or raw
  webhook inspection.
- No new alerting provider, scheduled job, or deployment/runbook rewrite in
  this subphase.

Acceptance criteria:

- Safety responses include bounded webhook and operator-action summaries scoped
  to the Organization.
- Webhook health queries never return payload data.
- Admin shows webhook dead letters/open work and retry/dead-letter audit counts
  using existing semantic UI primitives.
- Existing quota, outbox retry/dead-letter, and reconciliation controls remain
  functional.

Verification plan:

- Webhook health and safety-schema tests.
- Full WhatsApp regression and Admin safety/dashboard tests.
- Backend/Admin typechecks and production builds, and `git diff --check`.

9.3 exit gate: bounded safety and operational visibility is implemented,
redacted, Organization-scoped, reviewed, and committed before Phase 9 closeout.

### 9.3 review and verification

- Cloud safety now exposes Organization-scoped webhook pending/processing/
  retryable/dead-letter counters, oldest open time, and last received time.
- Safety responses include bounded retry/dead-letter operator-action summaries;
  webhook payloads, message bodies, tokens, and credentials remain excluded.
- Admin Cloud sending controls show webhook open/dead-letter health and audit
  counts alongside quota, reconciliation, and outbox controls.
- Focused webhook/outbox/safety tests: 8 passed.
- Full WhatsApp regression: 306 passed, 3 skipped, 0 failed.
- Admin Organization/safety tests: 5 passed.
- Backend/Admin production builds, touched-file TypeScript diagnostics, and
  `git diff --check`: passed.
- Browser/live-provider verification and database-backed probes remain release
  environment follow-ups.

## Phase 9 closeout

Phase 9.1, 9.2, and 9.3 are complete and reviewed. Marketing campaigns are
Cloud-only, approved-template-only, Store-scoped, consent-safe, cooldown/
quota-bounded, and operationally visible without exposing sensitive payloads.
Ganatri Utility remains unable to perform promotion work.

Deferred/release follow-ups:

- Browser verification for Promotions and Cloud sending controls.
- Live Meta campaign delivery/status verification.
- Database-backed probe execution when the development database is reachable.
