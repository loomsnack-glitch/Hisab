# WhatsApp Cloud API Phase 2B normalization research

Date: 2026-08-21

Scope: define the smallest safe translation boundary from the durable Cloud
webhook receipt to Hisab's existing Store-scoped WhatsApp message model.

## Findings from first-party Meta material

1. A webhook envelope is rooted at `object = whatsapp_business_account`, with
   `entry[].id` identifying the WABA. Each change carries `value.metadata` and
   `metadata.phone_number_id`, which is the sender phone identity needed to
   resolve the internal Cloud account. The official payload reference shows
   this envelope and metadata shape:
   [Meta Webhook Payload Reference](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference).

2. An inbound message supplies a provider `id`, sender `from`, Unix-second
   `timestamp`, and a `type`. The documented message types include text, image,
   interactive, document, audio, sticker, and order. The provider message ID
   is also the ID used for later message operations:
   [Meta Messages Object](https://www.postman.com/meta/whatsapp-business-platform/folder/1dtuocp/messages-object).

3. Outbound status notifications identify the message with `statuses[].id`, the
   recipient with `recipient_id`, and the event time with `timestamp`. The
   documented statuses include `sent`, `delivered`, `read`, `failed`, and
   `deleted`; failed updates may include an `errors` array:
   [Meta Statuses Object](https://www.postman.com/meta/whatsapp-business-platform/folder/fuaee8l/statuses-object).

4. Meta explicitly warns that status notifications may arrive out of order and
   says the timestamp should be used to determine actual timing:
   [Meta Message Status Update Notifications](https://www.postman.com/meta/whatsapp-business-platform/request/rgtfq23/message-status-update-notifications).

## Consequences for Hisab

- Account routing must use both `entry[].id` and `metadata.phone_number_id`.
  Phone ID alone is not enough for a multi-WABA Organization model.
- Provider message IDs are the stable deduplication key for message/status
  normalization. The existing `whatsapp_messages` unique provider-ID index is
  the later database enforcement point.
- Cloud phone values arrive as digits in the webhook examples. The normalizer
  must convert them to Hisab's E.164 phone form before passing them to the
  existing conversation path.
- Text can map directly to the current message model. Media cannot be written
  as a complete Hisab message until its provider media ID has been downloaded
  into private storage; the first normalization slice must return an explicit
  deferred-media outcome.
- The current Hisab message status model has no `deleted` state. A deleted
  provider status must therefore be retained as an explicit ignored/deferred
  outcome until product behavior is defined, never coerced to `failed`.
- Status application must be monotonic: `read` dominates `delivered`, which
  dominates `sent`; an older event must not move a message backward. A failed
  status carries safe provider error metadata and is handled separately from
  delivery progression.

## Phase 2B boundary

Phase 2B will add a pure normalizer and pure status-transition rules with
fixtures. It will not claim receipt rows or write conversations/messages yet.
That database processor is the next slice, where leases, unknown-account
reconciliation, media jobs, and transaction boundaries can be tested against
the already-defined normalized event contract.
