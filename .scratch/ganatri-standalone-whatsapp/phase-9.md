# Ganatri WhatsApp — Phase 9

Status: 9.1 complete; 9.2 next
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
