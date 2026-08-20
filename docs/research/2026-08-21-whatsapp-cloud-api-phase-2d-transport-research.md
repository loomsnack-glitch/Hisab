# WhatsApp Cloud API Phase 2D: Outbound Transport Research

Date: 2026-08-21

## Decision

Add a typed Cloud outbound transport boundary before connecting the existing
outbox to Graph API. The boundary will build only explicit Cloud message
payloads, validate the provider acceptance ID, and classify failures as
accepted, retryable, permanent, or reconciling. It will not claim database
outbox rows or send production traffic yet.

The current outbox does not persist the approved Meta template binding,
template version, consent decision, or credential resolution result required
for safe business-initiated sends. Directly wiring it to Cloud now could send
local Hisab text as an unapproved template or retry a request whose acceptance
is unknown. Those concerns belong to the template/binding and quota phases.

## Provider contract

Meta's send-template example uses `POST /{phone-number-id}/messages` with a
`type: template` payload and returns a successful response containing a
`messages[].id` prefixed with `wamid`. The same endpoint supports the message
object variants used by the transport boundary. Media has a separate upload
flow and provider media IDs should be used when available; local-storage
upload/download orchestration remains out of this slice.

Sources:

- [Meta: Send Message Template Text](https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text)
- [Meta: Media collection](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ecb27be5-4d27-4763-bbee-6a8002c04bf3)
- [Meta: Get all templates](https://www.postman.com/meta/whatsapp-business-platform/request/hl0hxc0/get-all-templates-default-fields)

## Transport rules

1. Use E.164 recipient numbers and require a numeric Phone Number ID supplied
   by the account resolver; never accept a raw Graph URL from a caller.
2. Support explicit `text`, `template`, and provider-media-reference payloads
   only. Template sends require a non-empty name and language; component data
   is passed as structured parameters rather than concatenated JSON strings.
   Template image/document headers may use a provider media ID or a public
   media link; local-storage upload/download orchestration remains outside the
   boundary.
3. Treat a successful response without a valid `wamid` as a permanent protocol
   error, not as a successful send.
4. Treat network failure or timeout during a POST as `reconciling`, because the
   request may have reached Meta even though Hisab did not receive the result.
   Do not automatically retry that request.
5. Treat explicit provider 429/5xx and other retryable errors as retryable only
   when the client received a definitive error response. Treat policy,
   template, recipient, authorization, and validation errors as permanent.
6. Do not log access tokens, message bodies, recipient numbers, or full Graph
   responses in transport errors.

## Explicit non-goals

- no database outbox claim/complete wiring;
- no credential vault implementation or account provisioning;
- no template approval/binding schema, consent, quota, or cost ledger;
- no media upload or private-storage download orchestration;
- no worker interval, Cloud production send, or Baileys changes.

## Verification

Unit tests will cover payload construction, invalid input, accepted `wamid`
responses, malformed success responses, retryable HTTP errors, permanent
provider errors, and uncertain network/timeout failures. The existing Cloud
API client tests will remain green.
