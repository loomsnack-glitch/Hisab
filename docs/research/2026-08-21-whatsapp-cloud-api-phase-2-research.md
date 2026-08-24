# Hisab WhatsApp Cloud API Phase 2 research

Date: 2026-08-21

Status: contract foundation implemented; runtime and controlled-provider gates
open.

Canonical status: [Cloud API migration plan](../development/2026-08-20-whatsapp-cloud-api-only-migration-plan.md)

Scope: Cloud API module and webhook implementation for Hisab. This note covers
webhook verification and authentication, WhatsApp webhook payloads, duplicate
and out-of-order handling, Graph API sending and pagination, media handling,
and the implications for the current repository.

Only first-party Meta material was used: Meta's official WhatsApp Business
Platform Postman collections and Meta's official Webhooks collection. The
Postman pages are the published API examples and references from Meta's own
workspace; they are not third-party provider documentation.

## Executive findings

1. The webhook has two different security flows. The setup `GET` validates a
   configured verify token and returns `hub.challenge`. Real event `POST`
   requests must be checked using `X-Hub-Signature-256` and the Meta App
   Secret against the unmodified request body.
2. A WhatsApp delivery is an envelope containing `entry[]`, `changes[]`, and a
   `value` object. A single request can contain several changes. Message and
   status arrays must therefore be processed item by item, not as one event per
   HTTP request.
3. Meta documents `wamid`/message IDs for correlating sends and status updates,
   but the official send examples do not expose a request idempotency-key
   parameter. A timeout after a `POST /messages` request is therefore
   ambiguous. Hisab must not blindly resend an ambiguous request.
4. Status webhook order is not guaranteed. `sent`, `delivered`, and `read`
   updates need monotonic state transitions based on the provider timestamp
   and an explicit terminal/error policy.
5. WABA phone-number and message-template collections can paginate. The
   response contains `paging.next`/`paging.previous` links; the Cloud client
   must follow `next` until completion or an explicit bounded page limit rather
   than returning only the first `data` page.
6. Media is a two-step asynchronous flow. A webhook supplies a media ID; Hisab
   must retrieve a short-lived media URL, download it with authorization, and
   store it privately. That work must not delay the webhook acknowledgement.

## Repository context

The migration plan defines Phase 2 as the Cloud API module and webhook phase.
Its required exit coverage is signatures, duplicates, out-of-order statuses,
tenant scoping, retryable/permanent errors, and dead lettering. It also says to
resolve Cloud accounts by `phone_number_id`, persist provider events before
processing, process media asynchronously, and use `reconciling` when a send
may have been accepted but the response is unknown.

Relevant plan sections:

- `Phase 2: Cloud API module and webhook`
- `Webhook design`
- `Outbound dispatch`
- `Idempotency`

Source: [Hisab Phase 2 migration plan](../development/2026-08-20-whatsapp-cloud-api-only-migration-plan.md)

The current branch now provides a useful contract foundation:

- `WhatsAppCloudApiClient` sends bearer-authenticated requests to the versioned
  Graph API and maps Graph error fields into a safe error object.
- Its current list methods return `data` only, so they do not yet expose or
  follow `paging.next`.
- `whatsapp_provider_events` is a durable leased inbox with a uniqueness key
  of `(whatsapp_account_id, provider_event_id)`, retryable/dead-letter states,
  and payload clearing after completion.
- Existing provider-event processing is shaped around a Baileys
  `providerMessageId`. Meta Cloud webhook delivery needs an envelope/event-key
  adapter before it can use this inbox safely.
- `whatsapp_accounts` now has Cloud WABA and phone-number ID fields. The
  webhook must resolve `metadata.phone_number_id` to an internal account and
  then carry the resolved organization/store scope through normalization.

The current application mounts authenticated tenant routes, worker-internal
routes, and a public Meta webhook route at `/webhooks/whatsapp`. Its global
device middleware adds or reads a browser device cookie, which is not an
authentication mechanism Meta provides; the webhook route must remain
independent of tenant auth, worker auth, and browser-device assumptions while
retaining request-size and operational logging controls.

## Implementation status

The webhook route, raw-body signature verification, bounded parsing, durable
Cloud receipt table, normalizer, receipt processor, and outbound transport
contracts are implemented with focused fixture tests. The Cloud client still
needs bounded pagination, credential binding, media orchestration, scheduler
wiring, and outbox integration. Meta setup and controlled-provider behavior
have not been verified. The repository-wide test gate is also still open.

## 1. Webhook verification and signature validation

### Verification `GET`

When a Webhooks callback is configured, Meta sends a request containing:

```text
hub.mode=subscribe
hub.verify_token=<configured verify token>
hub.challenge=<challenge>
```

The endpoint must verify that `hub.mode` is `subscribe`, compare
`hub.verify_token` with the server-side configured token, and return the
`hub.challenge` value as the successful response. A token mismatch must return
`403`; malformed or incomplete requests should not return the challenge.

The verify token is a webhook-configuration secret, not the App Secret and not
a customer access token. It is an application-level value because one Meta App
callback receives events for multiple WABAs. Do not store a separate verify
token in each Hisab Store or expose it in a browser response.

Source: [Meta Webhooks verification requests](https://www.postman.com/meta/messenger-platform-api/folder/22794852-b5d97624-14d8-4e67-a2e4-529add49ca58)

### Event `POST`

Meta signs event notification payloads with HMAC-SHA256 and sends the result in
the `X-Hub-Signature-256` header in the form:

```text
sha256=<lowercase hexadecimal digest>
```

The digest is computed from the raw request body and the App Secret. Hisab
must:

1. Read the raw bytes/text once.
2. Validate the header format and the `sha256=` prefix.
3. Compute HMAC-SHA256 using the configured Meta App Secret.
4. Compare the supplied and expected digests using a constant-time comparison.
5. Parse JSON only after signature validation succeeds.

Do not compute the digest from a parsed object followed by `JSON.stringify`.
That can change whitespace, escaping, property ordering, or Unicode
representation and produce a different signature. Meta's Webhooks guidance
also calls out its escaped-Unicode representation; retaining the exact raw
request bytes avoids normalizing the signed content before verification.

Missing, malformed, or mismatched signatures must be rejected before any
database write or Graph API call. The App Secret must never appear in logs,
error responses, provider-event payloads, or DTOs.

Source: [Meta Webhooks payload validation and `X-Hub-Signature-256`](https://www.postman.com/meta/messenger-platform-api/folder/22794852-b5d97624-14d8-4e67-a2e4-529add49ca58)

### Acknowledgement boundary

After authentication, the webhook handler should validate only the minimal
envelope needed to identify the WABA/phone-number account, persist an
idempotent event receipt, and return `200` quickly. Normalization, media
downloads, conversation creation, and Graph calls belong to the replay/worker
path.

This is an application reliability decision based on the documented webhook
delivery model: Meta sends an HTTP notification to the configured HTTPS
endpoint, while Hisab already has a durable provider-event inbox. The official
WhatsApp payload reference requires an internet-reachable HTTPS endpoint and
describes the notification as the delivery mechanism; it does not make a
database transaction or media download part of the callback response.

Source: [Meta WhatsApp webhook payload reference](https://www.postman.com/meta/whatsapp-business-platform/overview)

## 2. WhatsApp webhook payload shapes

### Common envelope

The documented envelope has this shape:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            }
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

The `entry` and `changes` arrays are important. The HTTP request is not the
deduplication unit and should not be assumed to contain exactly one message or
status. The normalizer should iterate every `entry`, every `change`, and then
every item in `value.messages`, `value.statuses`, or another supported event
array.

The `entry.id` is the WABA identifier. For account routing, the
`value.metadata.phone_number_id` is the stronger sender identity because the
same WABA can contain multiple phone numbers. Resolve that ID against
`whatsapp_accounts.cloud_phone_number_id` and verify the WABA relationship
before accepting the event.

Source: [Meta WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)

### Inbound message

The official Messages Object reference documents these core inbound fields:

- `from`: the customer's phone number;
- `id`: the unique incoming message ID;
- `timestamp`: the provider message timestamp;
- `type`: message type such as `text`, `image`, `interactive`, `document`,
  `audio`, `sticker`, or `order`.

Media messages include a media object with a provider media `id`, MIME type,
SHA-256 value, and optional caption or filename. Text and interactive messages
have type-specific nested fields and must be normalized without assuming every
message contains `text.body`.

Source: [Meta WhatsApp Messages Object](https://www.postman.com/meta/whatsapp-business-platform/folder/1dtuocp/messages-object)

### Outbound status

Meta's status notification example includes:

```json
{
  "id": "wamid...",
  "status": "sent",
  "timestamp": "1603086313",
  "recipient_id": "16315551234"
}
```

The documented status values include `sent`, `delivered`, `read`, `failed`,
and `deleted`. Some status payloads also contain conversation and pricing
metadata, including the conversation ID, expiration timestamp, origin,
pricing model, billable flag, and category. Failure statuses can carry provider
error details and must preserve the provider code/message for safe operator
diagnosis.

Meta explicitly warns that status notifications may not arrive in actual
message-time order. Hisab should apply a monotonic transition table, for
example:

```text
queued/sending -> sent -> delivered -> read
queued/sending -> failed
sent/delivered/read -> never move backward because an old event arrived
```

`failed` is a terminal delivery outcome for that message attempt. If a later
provider event is received, it must not overwrite a terminal failure unless a
future documented Meta event explicitly represents a correction.

Source: [Meta message status update notification](https://www.postman.com/meta/whatsapp-business-platform/request/rgtfq23/message-status-update-notifications)

### Other change fields

The webhook can carry more than customer messages and delivery statuses. The
Phase 2 inbox should preserve the authenticated raw envelope and classify
unsupported or future `field` values as durable, observable events rather than
silently dropping them. Template status, phone/account quality, and other
account notifications can be normalized in later handlers without changing
the ingress contract.

## 3. Idempotency, duplicates, and event identity

### What Meta gives us

For outbound messages, the response from `/{PHONE_NUMBER_ID}/messages`
contains a message ID prefixed with `wamid`. The same provider ID appears in
status webhooks and is the correct identity for joining sent messages to
delivery/read/failure updates.

For inbound messages, the webhook message `id` is the provider message ID.
For a media message, the nested media ID identifies the media object, not the
message itself; the message ID remains the message deduplication key.

Sources: [Meta send-message examples](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ba8d099d-007e-4b52-b9f2-3cf3c60e4fbc) and [Meta Messages Object](https://www.postman.com/meta/whatsapp-business-platform/folder/1dtuocp/messages-object)

### What Meta does not give us

The official Meta send examples show the `POST` endpoint, bearer
authentication, message body, and returned `wamid`; they do not document a
client-supplied idempotency-key field for the send request. This means a network
timeout after request submission cannot prove that Meta did not accept the
message.

This is an important implementation inference from the official request and
response contract, not a claim that Meta will never add such a feature. Until
Meta documents an idempotent send/reconciliation API, Hisab must treat an
unknown result as `reconciling` and require a provider-aware reconciliation or
operator decision. Retrying the same POST automatically can send a duplicate
bill or promotion.

### Recommended Hisab keys

Use separate keys for separate boundaries:

| Boundary             | Recommended key                                                               | Purpose                                                                                 |
| -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| HTTP webhook receipt | Hash of the authenticated raw body, or a canonical envelope key               | Avoid storing the same delivery repeatedly when the request has no explicit delivery ID |
| Inbound message      | `(whatsapp_account_id, provider_message_id)`                                  | Existing message uniqueness; handles repeated inbound deliveries                        |
| Outbound status      | `(whatsapp_account_id, wamid, status, provider_timestamp, error fingerprint)` | Prevent repeated status work while retaining a changed failure detail                   |
| Hisab command        | Existing application idempotency key                                          | Prevent duplicate button/campaign commands before dispatch                              |
| Outbox row           | Existing outbox ID and lease                                                  | Ensure one internal worker owns a dispatch attempt                                      |
| Media fetch          | `(whatsapp_account_id, media_id)`                                             | Avoid downloading the same provider object more than once                               |

The existing `whatsapp_provider_events` uniqueness key can support a derived
Cloud event key, but using only `provider_message_id` is insufficient for
status updates because one message legitimately produces multiple statuses.
The derived key must include the event kind and provider timestamp/status (and
failure fingerprint where relevant), or the inbox must store one envelope plus
separate normalized item keys.

This event-key design is a Hisab recommendation. Meta's documented payloads
provide the component IDs and timestamps but do not publish a universal
webhook-delivery ID in the WhatsApp examples.

### Tenant and account scoping

The webhook must not trust a Store, organization, or customer ID from the
payload. Resolve only from server-side relationships:

1. validate `object` and `entry.id`;
2. read `metadata.phone_number_id`;
3. find exactly one Cloud account by that ID;
4. verify its WABA and organization relationship;
5. select the assigned/default Store using Hisab's routing rules;
6. create/reuse the Store-scoped conversation;
7. insert the provider message/status under the resolved account and Store.

An authenticated event with an unknown phone-number ID must not create a new
account or conversation. The implementation should record an operator-visible
security/routing diagnostic without exposing the payload or token in logs. The
precise 2xx-versus-4xx response for an authenticated but unknown asset is a
Hisab operational decision; it should be chosen deliberately to avoid endless
provider retries while still detecting misconfiguration.

## 4. Graph API sending and error/retry semantics

### Send contract

The official collection uses:

```text
POST https://graph.facebook.com/{version}/{PHONE_NUMBER_ID}/messages
Authorization: Bearer <access token>
Content-Type: application/json
```

The body includes `messaging_product: "whatsapp"`, a recipient `to`, and a
message `type`; template messages include `template.name`, a language code,
and optional component parameters. A successful response includes a message
ID prefixed with `wamid`.

Template messages must refer to a Meta template created/approved for the WABA;
Hisab's local template preset is not itself a Meta-approved template.

Sources: [Meta Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api) and [Meta text template send example](https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text)

### Error mapping

Graph error responses expose structured fields such as `message`, `type`,
`code`, `error_subcode`, and `fbtrace_id`. Hisab should store the provider
code/subcode and trace ID in restricted operational metadata, while exposing a
safe user-facing category such as `authorization`, `invalid_recipient`,
`template_rejected`, `policy_blocked`, `rate_limited`, or `provider_unavailable`.

Do not classify every HTTP 4xx as retryable. Authorization, permission,
invalid phone-number, invalid template, policy, and malformed-payload errors
need correction or account action. Transport failures, provider 5xx responses,
and explicit rate-limit responses may be retryable, but a POST timeout after
submission is ambiguous and must enter `reconciling`, not an unconditional
retry loop.

The official collection documents the request/response contract and Graph
error metadata; it does not provide a universal guarantee that retrying every
5xx, 429, or network timeout is duplicate-safe. Therefore Phase 2 should:

- honor a `Retry-After` value if Meta provides one;
- use bounded exponential backoff with jitter for retryable failures;
- cap attempts and dead-letter with provider code and trace ID;
- stop retrying permanent/auth/policy/template errors;
- keep the original outbox intent and recipient snapshot for audit;
- distinguish `retryable` from `reconciling` in both storage and UI.

This conservative retry policy is an application safety inference from the
non-idempotent-looking send contract and returned `wamid` behavior. It is not a
substitute for a later Meta-supported reconciliation mechanism.

### Cloud client changes required by Phase 2

The current `WhatsAppCloudApiClient` should grow these seams:

- typed Graph error and response metadata, including `Retry-After` when
  present;
- paginated collection results and a bounded `collectAll` helper;
- `retrieveMediaUrl`, `downloadMedia`, and `uploadMedia` methods with separate
  binary/multipart handling;
- request correlation that logs only endpoint, internal account ID, HTTP
  status, provider code, and `fbtrace_id`—never bearer tokens or message body;
- a caller-controlled abort signal that can be combined with the timeout;
- an explicit distinction between a confirmed Graph rejection and an unknown
  result caused by timeout/connection loss.

## 5. Pagination for phone numbers and templates

Meta's official Cloud API collection says collection endpoints may paginate
and exposes `paging.next` and `paging.previous` links. The documented phone
number endpoint is:

```text
GET /{WABA_ID}/phone_numbers
```

It returns phone-number records such as `verified_name`,
`display_phone_number`, `id`, and `quality_rating`. The documented template
endpoint is:

```text
GET /{WABA_ID}/message_templates
```

It returns template records including name, components, language, status,
category, and ID.

Sources: [Meta Cloud API pagination and phone-number example](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api) and [Meta fetch message templates](https://www.postman.com/meta/whatsapp-business-platform/request/f7o759z/fetch-message-templates)

Implementation rules:

- Preserve the `paging.next` URL returned by Meta rather than reconstructing a
  cursor from undocumented fields.
- Follow only HTTPS Graph URLs on the configured Meta host; do not let a stored
  or remote `next` URL redirect the bearer token to an arbitrary host.
- Use a maximum page count and maximum item count per reconciliation run.
- Persist the last successful sync cursor/time so a failed sync can resume or
  restart safely.
- Treat an empty page as valid completion only when no `paging.next` exists.
- Upsert templates by the Meta template ID plus WABA identity; names are not
  globally unique because the same name can have multiple languages/versions.
- Do not replace the local approved/binding state with a partial first page.

The current client methods return `{ data }` but discard `paging`; this would
silently truncate a WABA with more than one page of phone numbers or templates.

## 6. Media considerations

### Inbound media

The webhook media message contains a provider media ID and metadata such as
MIME type, SHA-256, caption, and (for documents) filename. The official media
flow is:

1. `GET /{MEDIA_ID}` to retrieve a temporary media URL.
2. Download the returned URL with the authorized access token.
3. Validate the response MIME type, byte size, and SHA-256 against the
   provider metadata.
4. Store the bytes in Hisab's private attachment storage.
5. Save only the private storage reference and safe provider metadata in the
   message record.

The media URL expires after five minutes. The official collection says the
download request needs an access token and that a failed download may require
retrieving the media URL again; clicking the URL without authorization is not
the supported flow.

Sources: [Meta media endpoints and supported media types](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ecb27be5-4d27-4763-bbee-6a8002c04bf3), [retrieve media URL](https://www.postman.com/meta/whatsapp-business-platform/request/fpj02x0/retrieve-media-url), and [download media](https://www.postman.com/meta/whatsapp-business-platform/request/zsq66eh/download-media)

### Outbound media

For outbound media, use the Cloud API media upload endpoint:

```text
POST /{PHONE_NUMBER_ID}/media
```

Persist the returned Meta media ID and reference it in the appropriate message
payload. For media-header templates, construct the template component exactly
as required by the approved Meta template; a local public URL is not a
replacement for an approved template component.

Media uploads and downloads belong in the Cloud dispatcher/media worker, not
inside the webhook HTTP request. Apply allowlists and size limits before
uploading or storing bytes. The official collection lists, among others,
5 MB limits for JPEG/PNG images, 100 MB for supported documents, 16 MB for
audio/video, and 100 KB for stickers; the implementation should keep these
limits configurable and re-check the current Meta documentation before
production release.

Source: [Meta Media collection](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ecb27be5-4d27-4763-bbee-6a8002c04bf3)

## 7. Phase 2 implementation shape for Hisab

The next code slice should remain behind the new Cloud provider boundary and
leave the existing Baileys worker untouched. Recommended order:

1. Add pure signature helpers with tests for valid, missing, malformed,
   mismatched, Unicode, and tampered bodies.
2. Add a public webhook route with separate `GET` verification and `POST`
   raw-body handling. Mount it outside tenant auth and worker middleware.
3. Add Cloud envelope schemas that preserve unknown fields safely while
   validating the required routing fields and supported message/status items.
4. Add account lookup by `(organization_id, cloud_phone_number_id)` and verify
   the WABA relationship before writing an event.
5. Adapt the existing provider-event inbox to accept deterministic Cloud event
   keys and durable raw payloads, with duplicate receipt tests.
6. Normalize inbound messages using `message.id` and status updates using
   `wamid` plus a monotonic transition guard. Test multiple entries/changes in
   one request and duplicate/out-of-order deliveries.
7. Extend the Graph client with safe pagination and media methods. Test
   `paging.next`, truncated pages, media URL expiry, binary content, and
   provider errors without using real Meta credentials.
8. Add the Cloud dispatcher path for text/template/media outbox rows. Persist
   the returned `wamid`; map explicit errors; classify ambiguous timeouts as
   `reconciling`; and dead-letter only after bounded policy.
9. Add metrics for signature rejects, unknown phone-number IDs, duplicate
   receipts, event lag, normalization failures, media failures, retryable
   errors, reconciling rows, and dead letters.

### Minimum fixture matrix

- valid GET challenge;
- wrong verify token;
- valid signature over exact raw body;
- missing, malformed, and wrong signature;
- one request with multiple entries and changes;
- inbound text message;
- inbound image/document with media ID;
- duplicate inbound message;
- duplicate status;
- `read` received before `delivered`;
- failed status with provider error;
- unknown WABA/phone-number ID;
- explicit Graph 4xx permanent error;
- explicit 429/5xx retryable error;
- timeout before response with `reconciling` outcome;
- paginated phone numbers/templates;
- media URL refresh after expiry;
- event processing failure followed by retry and dead lettering.

## Source register

All sources below are Meta-owned official Postman collections or requests,
accessed on 2026-08-21:

- [Meta WhatsApp Business Platform Postman workspace](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [Meta WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Meta Webhooks collection and verification/signature guidance](https://www.postman.com/meta/messenger-platform-api/folder/22794852-b5d97624-14d8-4e67-a2e4-529add49ca58)
- [Meta WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Meta Messages Object](https://www.postman.com/meta/whatsapp-business-platform/folder/1dtuocp/messages-object)
- [Meta message status update notification](https://www.postman.com/meta/whatsapp-business-platform/request/rgtfq23/message-status-update-notifications)
- [Meta Messages collection](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ba8d099d-007e-4b52-b9f2-3cf3c60e4fbc)
- [Meta fetch message templates](https://www.postman.com/meta/whatsapp-business-platform/request/f7o759z/fetch-message-templates)
- [Meta Phone Numbers collection](https://www.postman.com/meta/whatsapp-business-platform/folder/ypba0gk/phone-numbers)
- [Meta Media collection](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ecb27be5-4d27-4763-bbee-6a8002c04bf3)
- [Meta retrieve media URL](https://www.postman.com/meta/whatsapp-business-platform/request/fpj02x0/retrieve-media-url)
- [Meta download media](https://www.postman.com/meta/whatsapp-business-platform/request/zsq66eh/download-media)
