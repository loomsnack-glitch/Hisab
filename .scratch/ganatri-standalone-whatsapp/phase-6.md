# Ganatri WhatsApp — Phase 6

Status: Not started
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
