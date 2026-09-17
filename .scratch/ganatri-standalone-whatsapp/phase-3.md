# Ganatri WhatsApp — Phase 3

Status: 3.1 committed; 3.2 next
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

## 3.1 Subphase plan — Validated platform configuration

Status: Committed; review record retained

### User-facing outcome

The backend has one fail-closed configuration boundary for the Ganatri-owned
sender. It can report safe health metadata without returning credentials, and
future tenant bill/due code does not read raw environment variables.

### Scope

- Add a backend-only configuration reader for the platform phone number,
  WABA identity, access token, Graph endpoint/version, template language, and
  fixed bill/due template names.
- Accept the existing `WHATSAPP_API_URL` and `WHATSAPP_API_TOKEN` only as
  compatibility fallbacks while the explicit platform variables are adopted.
- Validate identifiers, URL/protocol, Graph version, language, template-name
  shape, and token presence; return a safe incomplete/invalid result instead
  of starting a sender with partial configuration.
- Expose only redacted metadata from the health projection: configured state,
  missing/invalid field names, endpoint/version, language, and template names.
- Do not perform provider calls, change OTP/invitation behavior, or add a
  tenant send route in this subphase.

### Public seam

`readWhatsAppPlatformConfig(env)` returns a discriminated configuration result
for backend callers. `getWhatsAppPlatformConfigHealth(env)` returns metadata
that is safe to expose to an operator-facing health surface. Neither result
contains the access token.

### Verification

- Missing explicit configuration fails closed and reports field names only.
- Valid explicit configuration produces the expected endpoint and safe health
  projection.
- Legacy API URL/token fallback remains parseable without changing existing
  notification callers.
- Invalid URL, version, phone/WABA identifiers, language, template names, and
  blank token are rejected.
- Tests prove the token and raw environment object cannot appear in the health
  projection or error details.

### Exit gate

The platform configuration module and focused tests are committed; no sender
or tenant delivery code consumes it until the next subphase.

### Verification and review record

- Focused configuration tests: 6 passed, 0 failed.
- Backend production build: passed.
- `git diff --check`: passed.
- Spec review: explicit platform credentials, WABA identity, Graph endpoint /
  version, language, and fixed bill/due names are backend-owned; tenant
  delivery code has not been enabled early.
- Standards review: environment access is isolated behind an injected pure
  reader, failures contain field names only, and the health projection has no
  credential field. Legacy URL/token support is compatibility-only.
- Deliberate follow-up: provider existence/approval/category/variable health
  checks belong to 3.2/3.3 when the sender adapter has a provider client.
- No database, route, OTP, invitation, or existing tenant delivery behavior
  changed in this subphase.
