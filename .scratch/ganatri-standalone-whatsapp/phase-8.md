# Standalone Ganatri WhatsApp — Phase 8

Status: Deferred
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
