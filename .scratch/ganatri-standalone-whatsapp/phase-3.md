# Standalone Ganatri WhatsApp — Phase 3

Status: Not started
Phase: 3 — Ganatri Utility sender

## Outcome

Use the existing Ganatri WhatsApp account for platform OTP, invitations, bills,
and due reminders while allowing Store utility delivery only through two fixed
environment-selected templates.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 3.1 | Validated platform configuration | Phase 2 | Backend-only sender and template health contract |
| 3.2 | Platform sender/outbox representation | 3.1 | Platform messages fit existing durable delivery schema |
| 3.3 | Fixed bill/due admission | 3.2 | Promotions, text, custom templates, and replies rejected |
| 3.4 | Redaction and hidden inbound handling | 3.1–3.3 | Sensitive logs removed; internal reply policy verified |

## Configuration scope

The backend owns phone ID, token, WABA identity, template names, language,
variable mapping, Graph version, and provider health. The browser receives only
safe status metadata.

## Acceptance criteria

- Only configured bill and due templates can be used for tenant utility sends.
- Templates must be approved, enabled, correctly categorized, and variable-safe.
- Ganatri Utility rejects promotion, free-form, custom-template, and reply sends.
- Utility messages use the same outbox, retry, reconciliation, and audit path.
- Platform inbound replies are retained internally, hidden from Organizations,
  and not automatically answered.
- Existing OTP/invitation behavior remains compatible without sensitive logs.

## Verification

- Missing/invalid env configuration tests.
- Sender-reference and outbox persistence tests.
- Fixed-template allowlist and negative-admission matrix.
- Credential/OTP/PII log audit.
- Provider retry, dead-letter, event replay, and idempotency tests.

## Blockers to resolve inside this phase

- Exact schema representation for a platform sender, because the current
  outbox requires `whatsapp_account_id` and Store-scoped message references.
- Internal retention/ownership model for hidden platform replies.
