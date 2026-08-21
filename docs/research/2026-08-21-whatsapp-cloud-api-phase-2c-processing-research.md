# WhatsApp Cloud API Phase 2C: Receipt Processing Research

Date: 2026-08-21

Status: processor contract implemented; scheduler and production runtime gate
open.

Canonical status: [Cloud API migration plan](../development/2026-08-20-whatsapp-cloud-api-only-migration-plan.md)

## Decision

Build a bounded database processor for the durable Cloud webhook receipt table.
The processor claims rows with a lease, re-resolves the Cloud account from the
WABA/phone-number route, normalizes the stored payload, and applies only the
already-supported inbound text and outbound status events. It must classify
unsupported or malformed events as ignored, and transient account/message
lookup failures as retryable or dead-lettered. Startup scheduling, media
download, Graph API calls, and template synchronization remain later slices.

## Provider contract

Meta's status notification example contains the message ID, status,
Unix-second timestamp, and recipient ID. Meta also explicitly warns that
status notifications may arrive out of order, so the provider timestamp is the
ordering input rather than webhook arrival order.

Sources:

- [Meta WhatsApp Cloud API: Message Status Update Notifications](https://www.postman.com/meta/whatsapp-business-platform/request/rgtfq23/message-status-update-notifications)
- [Meta WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform)

## Processing rules

1. Claim `pending`, due `retryable`, and expired `processing` rows with
   `FOR UPDATE SKIP LOCKED`; increment the attempt count and set a bounded
   lease.
2. Resolve the account again by `(waba_id, phone_number_id)` on every claim.
   This handles receipts accepted before account provisioning completed and
   avoids trusting a stale nullable foreign key.
3. Normalize the raw receipt. Every malformed, media, or unsupported item is
   represented by the Phase 2B deferred event and is marked `ignored`; it is
   not retried forever.
4. Inbound text uses the existing Store-scoped conversation/message writer
   through a direct processor entry point, without creating a legacy
   `whatsapp_provider_events` row.
5. Outbound statuses update only matching outbound messages for the same
   Cloud account. A provider timestamp column prevents an older status from
   overwriting a newer one; the existing monotonic status rules prevent
   `read` or `delivered` from regressing.
6. Unknown accounts and status events whose outbound message has not arrived
   yet are retryable. Exponential backoff is capped, and exhausted attempts
   become `dead_letter` with a bounded safe error.
7. Completed receipts may clear their raw payload; dead-letter and retryable
   rows retain bounded error metadata for operations. No provider credential or
   signature is logged.

## Explicit non-goals

- no worker interval or startup reconciliation wiring;
- no Graph API request, media download, or media storage;
- no template synchronization or Embedded Signup;
- no migration execution against a target database;
- no changes to the existing Baileys provider-event replay path.

## Verification

The processor has focused tests for leasing classification, unknown-account
retry, deferred-event ignoring, text dispatch, status dispatch, and retry to
dead-letter behavior. Focused tests pass. Scheduler wiring, media handling,
production database verification, and the repository-wide test gate remain
open; current full-suite failures are tracked in the canonical migration plan.
