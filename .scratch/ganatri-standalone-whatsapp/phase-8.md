# Ganatri WhatsApp — Phase 8

Status: 8.1 complete; 8.2 and 8.3 deferred
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
