# Ganatri WhatsApp — Phase 3

Status: 3.3 committed; 3.4 next
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

## 3.2 Subphase plan — Platform sender/outbox representation

Status: Committed; review record retained

### User-facing outcome

Ganatri Utility bill/due work can be represented in the existing durable
WhatsApp delivery model without pretending that the platform sender is an
Organization account. Existing Organization Cloud and historical account rows
remain valid and continue using their current path.

### Scope

- Add an explicit platform sender kind and immutable, non-secret sender
  snapshot on `whatsapp_outbox`.
- Allow platform messages to be account-less and conversation-less while
  retaining the Store, recipient phone, customer, message, status, retry, and
  idempotency fields needed by the common delivery lifecycle.
- Add constraints and partial uniqueness rules so Organization-account rows
  keep their current invariants and platform rows cannot claim an account or
  omit their sender reference/snapshot.
- Add a backend repository seam that creates an idempotent platform template
  message/outbox pair. Admission, consent, and provider-template health remain
  the next subphase concerns.
- Keep Cloud queries naturally scoped to Organization account rows; do not
  route platform work through tenant account credentials.

### Public seam

`createPlatformTemplateOutbox(request)` persists a platform sender snapshot
containing only sender key, phone-number ID, WABA ID, Graph version, template
name/language, and policy version. It never accepts or stores a token.

### Verification

- Migration contract tests cover nullable account/conversation fields,
  sender-kind checks, platform uniqueness, and down migration cleanup.
- Repository tests cover create, idempotent replay, cross-Store key conflict,
  and rollback on failed outbox creation.
- Development DB migration status remains clean after applying the additive
  migration; pre-existing WhatsApp counts are unchanged.
- Existing Cloud focused tests/build remain green.

### Exit gate

The additive migration and platform outbox repository are reviewed, verified,
and committed. No tenant route or sender dispatcher consumes the new seam until
3.3 admission is complete.

### Verification and review record

- Focused migration/repository tests with the development database: 7 passed,
  0 failed.
- The real-DB probe verified account-less message persistence, immutable
  platform sender snapshot fields, idempotent replay, and transaction rollback.
- Development database: 153 migrations applied, 0 pending.
- Backend production build: passed; `git diff --check`: passed.
- Spec review: platform work is represented in the common message/outbox
  lifecycle, while the sender remains distinct from Organization accounts and
  no Cloud credential path can claim the platform rows.
- Standards review: the migration is additive, existing rows retain the
  Organization-account default, cross-scope message linkage is constrained,
  and the follow-up migration hardens the message sender check after the
  initial schema was applied.
- Deliberate follow-up: provider health, Store policy/entitlement, consent,
  fixed-template admission, and dispatcher consumption remain blocked to 3.3
  and later delivery work.

## 3.3 Subphase plan — Fixed bill/due admission

Status: Committed; review record retained

### User-facing outcome

Stores in `ganatri_utility` can queue only bill and due-reminder work through
the platform outbox. Store users cannot select a template, write free-form
text, create promotion work, or turn an Organization Cloud action into a
platform send. Disabled Stores remain blocked and Organization Cloud keeps its
existing admission path.

### Scope

- Add a pure Ganatri Utility admission matrix for bill, due reminder,
  promotion, text, reply, custom-template, and template-management intents.
- Resolve the current Store policy at queue time and fail closed when the
  policy is missing, disabled, or incompatible with the requested intent.
- For admitted bill/due work, resolve the backend platform configuration and
  create the account-less common-outbox record with the immutable policy and
  sender snapshot from 3.2.
- Preserve current Organization Cloud template/binding, consent, quota, and
  outbox code paths; do not broaden them to platform sends.
- Keep provider template existence/category/approval/placeholder health behind
  a distinct adapter seam so it can be verified and cached without allowing a
  caller to bypass the fixed name policy.

### Verification

- Negative matrix proves promotion, free-form, reply, custom-template, and
  template-management intents are rejected for Ganatri Utility.
- Bill/due admission rejects custom text and user-selected templates.
- Policy/configuration failures happen before an outbox row is written.
- Real-DB bill/due probe uses a rollback transaction and verifies platform
  sender snapshot plus policy version; existing Cloud-focused tests/build stay
  green.

### Exit gate

The fixed admission seam and bill/due queue integration are reviewed, verified,
and committed. Provider health implementation and platform dispatch remain
explicit next delivery seams, not implicit client bypasses.

### Verification and review record

- Admission negative matrix and Store-mode tests: 12 passed, 0 failed.
- Real development-DB platform outbox probe: 2 tests passed, including
  idempotent bill/due-shaped persistence and rollback coverage.
- Development database: 154 migrations applied, 0 pending.
- Backend production build: passed; `git diff --check`: passed.
- Spec review: Ganatri Utility queueing admits only bill/due intent, rejects
  custom text and user-selected templates, and records the current policy
  revision in the platform snapshot. Disabled and missing-policy Stores fail
  before queueing; Organization Cloud retains its existing path.
- Standards review: admission is pure and independently tested; configuration
  and repository errors return safe user messages; no token or provider
  payload enters a DTO. Platform invoice resend indexing was corrected in an
  additive follow-up migration before commit.
- Runtime note: one combined Bun test invocation hit a transient Bun 1.3.11
  process crash after the focused suite passed; the real-DB probe was rerun in
  isolation and passed.
- Deliberate follow-up: provider template health, platform dispatch/retry
  consumption, and template-management route guards remain explicit 3.4/
  delivery work.
