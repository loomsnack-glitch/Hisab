# Ganatri WhatsApp — Phase 8

Status: 8.2 complete; 8.3 deferred
Phase: 8 — Organization Cloud inbox and replies

## Outcome

Add Store-scoped customer conversations only for Organization Cloud senders.
Ganatri Utility replies remain internally retained and hidden.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 8.1 | Conversation list/history | Phase 7 | Store-scoped polling and message states |
| 8.2 | Customer matching and attachments | 8.1 | Exact-phone match and safe attachment access |
| 8.3 | Reply/service-window controls | 8.1, 8.2 | Replies obey permissions, consent, and window rules |

## Non-goals

- No Ganatri Utility inbox for Organization users.
- No cross-Store shared inbox.
- No free-form messaging outside an allowed customer-service window.

## Verification

- Store and Organization scope tests for conversation reads.
- Customer matching and attachment authorization tests.
- Service-window and reply-permission negative tests.
- Attachment URL redaction and expiry tests.
- Focused UI tests, typecheck, build, and browser verification before
  unsuspending this phase.

## Approved Phase 8 execution plan

### 8.1 Subphase plan — Store-scoped conversation list and history

Status: Complete; reviewed and committed

User-facing outcome: Organization users can review conversations only for the
selected Store when that Store uses an Organization-owned Cloud sender. Ganatri
Utility conversations remain internally retained and unavailable through
Organization inbox routes. POS conversation routes remain retired.

Scope:

- Require the current Store policy to be `organization_cloud` before resolving
  Organization-user or device conversation scope.
- Resolve the exact account selected by that policy rather than an arbitrary
  assigned account.
- Preserve Store, Organization, account, conversation, and message scope in
  list/detail/read/attachment route seams.
- Keep polling and monotonic message states from the existing inbox UI; do not
  add replies or customer matching in 8.1.
- Add backend contract tests for disabled, Ganatri Utility, missing policy,
  selected-account mismatch, cross-Store conversation, and authorized Cloud
  list/history behavior.

Non-goals:

- No customer matching or attachment redesign; those belong to 8.2.
- No reply/free-form sending or service-window behavior; those belong to 8.3.
- No cross-Store inbox, Organization-wide conversation merge, or POS inbox.

Dependencies and public seams:

- Phase 7 current Store policies and Admin Store Workspace route.
- `conversation.ts`, existing tenant conversation routes, Cloud webhook/message
  persistence, and Admin Store Workspace inbox embedding.
- Existing attachment authorization must remain read-only in 8.1.

Verification plan:

- Focused backend conversation-scope tests and Admin inbox/store-workspace UI
  tests.
- Assert Ganatri Utility and disabled policies fail closed without exposing
  conversation history.
- Run backend/Admin builds, touched-file typechecks, full WhatsApp regression,
  and `git diff --check`.
- Browser verification remains a release-environment follow-up unless a live
  authenticated environment is available.

8.1 exit gate: Cloud-only Store-scoped list/history behavior is enforced at the
backend boundary, tests/builds pass, and the subphase is reviewed and committed
before 8.2 begins.

### 8.1 review and verification

- Conversation scope now requires the current Store policy to be
  `organization_cloud`; disabled and Ganatri Utility Stores cannot expose an
  Organization inbox through direct routes.
- Conversation list/history/read/attachment scope resolves the exact policy
  selected Cloud account and verifies its Organization and Store assignment.
- Focused backend policy contract and Admin Store Workspace/inbox suite: 19
  passed, 148 assertions.
- Touched-file TypeScript diagnostics and `git diff --check`: passed.
- Browser/live-provider verification remains a release-environment follow-up;
  8.2 customer matching and attachment behavior has not started.

### 8.2 Subphase plan — Exact Customer matching and safe attachments

Status: Complete; reviewed and ready to commit

User-facing outcome: A Store's Organization Cloud inbox links a conversation
only to the Organization Customer with the exact normalized WhatsApp phone
number. Staff can explicitly attach that exact Customer, and authorized users
can open private inbound documents through short-lived signed URLs without
seeing storage keys or another Store's media.

Scope:

- Keep matching exact and phone-based; do not match by display name, partial
  phone, or an Organization Customer from another Organization.
- Record the Customer–Store relationship when a matched conversation becomes
  active and when staff explicitly attach a Customer, using the existing
  idempotent activity ledger.
- Require explicit attachment to remain within the current Store, Organization,
  selected Cloud account, conversation, and exact contact phone boundary.
- Keep attachment objects private; resolve the message only through all scope
  columns, require configured private storage, and return only a short-lived
  signed URL.
- Preserve the existing size-bounded, hashed object key and cleanup behavior
  for inbound documents.

Non-goals:

- No free-form replies, template replies, consent-window enforcement, or
  outbound attachment sending; those belong to 8.3.
- No fuzzy matching, automatic Customer creation, cross-Store Customer
  migration, or Organization-wide inbox.
- No change to Ganatri Utility visibility or the retired POS conversation
  route.

Dependencies and public seams:

- 8.1 Cloud-only Store conversation scope.
- `customer-store-association.repository.ts` and its idempotent activity
  ledger.
- `conversation.ts`, `whatsapp.repository.ts`, private storage signing, and
  the existing Admin inbox candidate/attachment controls.

Acceptance criteria:

- An exact phone match records a Store relationship with source
  `whatsapp_conversation` and an idempotent provider-message reference.
- Explicit attachment records source `explicit_attachment` and cannot attach
  a Customer with a different phone, Organization, Store scope, or account.
- Attachment lookup cannot cross conversation, message, Store, Organization,
  or account boundaries; no raw object key is returned.
- Signed attachment URLs expire in the existing five-minute window, and
  missing storage fails closed.

Verification plan:

- Focused association/repository tests and conversation policy contract tests.
- Attachment scope, private-storage, expiry, exact-phone, and cross-Store
  negative tests.
- Existing Admin inbox tests plus backend/Admin typecheck and builds.
- `git diff --check` and a final standards/spec review before the 8.2 commit.

8.2 exit gate: exact matching and Customer–Store activity are durable,
attachment access is private and Store-scoped, focused checks/builds pass, and
the subphase is reviewed and committed before 8.3 begins.

### 8.2 review and verification

- Exact Organization phone matching now records an idempotent
  `whatsapp_conversation` Customer–Store activity event in the same database
  transaction as the conversation message.
- Explicit Customer attachment now validates Organization, Store, account,
  conversation, and normalized phone equality, then records an idempotent
  `explicit_attachment` event with the authenticated actor where available.
- Attachment lookup remains private and fail-closed: all scope columns are
  required, the private bucket must be configured, and only a five-minute
  signed URL is returned.
- Focused 8.2 contract tests: 3 passed; Customer–Store repository test was
  skipped because the local database fixture was unavailable.
- Full WhatsApp regression: 298 passed, 3 skipped, 0 failed.
- Backend build, Admin build, touched-file TypeScript diagnostics, and
  `git diff --check`: passed.
- Existing Admin Organization WhatsApp test has one unrelated baseline failure
  (`ReferenceError: FileText is not defined`); it is outside the 8.2 diff and
  remains a release follow-up.
- Browser/live-provider verification remains a release-environment follow-up;
  8.3 reply and service-window behavior has not started.
