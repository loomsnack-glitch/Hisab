# Standalone Ganatri WhatsApp — Phase 9

Status: Deferred
Phase: 9 — Promotions and operational controls

## Outcome

Add marketing campaigns and advanced delivery operations only for
Organization-owned Cloud senders.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 9.1 | Approved marketing-template campaigns | Phase 5, Phase 7 | Consent-safe campaign queueing |
| 9.2 | Campaign delivery controls | 9.1 | Progress, cooldown, retry, resend, stop |
| 9.3 | Safety and operations dashboard | 9.1–9.2 | Quota, outbox, webhook, audit, and reconciliation views |

## Acceptance criteria

- Ganatri Utility cannot create or send marketing work.
- Marketing requires approved Store-bound templates and marketing opt-in.
- Suppressed customers are excluded before queueing.
- Retry, resend, stop, dead-letter, and reconciliation actions are creator-only,
  idempotent, bounded, and audited.
- Operational views expose safe metadata only.

## Verification

- Marketing-template approval and Store-binding tests.
- Consent, suppression, cooldown, pagination, and quota tests.
- Ganatri Utility negative tests for every marketing route.
- Retry, resend, stop, dead-letter, and reconciliation authorization tests.
- Focused UI tests, typecheck, build, and browser verification before
  unsuspending this phase.
