# WhatsApp Cloud webhook hardening phase

Date: 2026-08-23
Branch: `feat/whatsapp`
Preceding commit: `c78ff84` (`feat: add WhatsApp Cloud account setup flow`)

## Goal

Make the Cloud webhook boundary match Meta's real payloads and keep unsupported
provider events durable and diagnosable. This phase is based on the official
Meta Cloud API payload examples and the live test WABA evidence from
2026-08-23.

## Sources

- [Meta Webhook Payload Reference](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference)
- [Meta Message Status Update Notifications](https://www.postman.com/meta/whatsapp-business-platform/request/rgtfq23/message-status-update-notifications)
- [Meta Messages Object](https://www.postman.com/meta/whatsapp-business-platform/folder/1dtuocp/messages-object)
- [Meta Webhook Subscriptions](https://www.postman.com/meta/whatsapp-business-platform/folder/ozgs3jn/webhook-subscriptions)
- [Meta Statuses Object](https://www.postman.com/meta/whatsapp-business-platform/folder/fuaee8l/statuses-object)

## Live evidence

- ngrok received Meta POST requests and forwarded them to the backend with
  HTTP `200` responses.
- The webhook receipt matched the provisioned Cloud account using:
  `waba_id=2630571170670792` and `phone_number_id=961003317102441`.
- Real status payloads contained `sent` and `delivered` events with WAMIDs
  ending in `==`.
- Those events were initially stored as `ignored/deferred_event` because the
  local identifier validator rejected the valid WAMID padding.

## Findings and disposition

| ID | Finding | Evidence / risk | Disposition |
| --- | --- | --- | --- |
| WH-001 | Provider message IDs were validated as local IDs. | Meta WAMIDs may contain base64 padding such as `=`; valid status and inbound events were deferred. | **Fixed in this phase** with an opaque, bounded provider-ID validator and regression tests. |
| WH-002 | Meta status values include `sent`, `delivered`, `read`, `failed`, and may include `deleted`. | The current database enum and message DTO support only the first four operational states. | **Documented follow-up**. Do not add `deleted` by casting it to `failed`; decide the product/database behavior in a migration phase. |
| WH-003 | Meta sends multiple inbound message families. | Official examples include text, image, sticker, audio, interactive, location, contacts, order, reaction, and unknown messages. Hisab currently persists text and defers media/unsupported types. | **Documented follow-up**. Add each family through the existing conversation/media seam with bounded retrieval and tests. |
| WH-004 | Media messages require a second provider call. | A webhook media object contains a provider media ID, not the file bytes. | **Documented follow-up**. Persist a durable media-retrieval task before exposing the message as complete. |
| WH-005 | The receipt stores one WABA ID and one phone ID for the whole POST. | The generic envelope uses an `entry[]` array. A multi-entry or multi-phone POST cannot be safely routed by the current single receipt row. | **Documented follow-up**. Either split receipts by entry/phone or reject only ambiguous batches with an explicit retry/dead-letter reason. |
| WH-006 | Webhook acknowledgement is separate from processing. | The route returns `200` after durable receipt persistence; replay processing happens asynchronously. | **Kept by design**. Operator diagnostics must expose pending, retryable, ignored, and dead-letter webhook receipts. |
| WH-007 | WABA subscription is required for events. | Meta documents explicit WABA subscription; phone-number-only configuration is insufficient. | **Acceptance check**. Provisioning and the runbook must verify the WABA subscription before live testing. |
| WH-008 | Status notifications can arrive out of order. | Meta explicitly says notification order may differ from actual timing. | **Already covered** by monotonic timestamp/status handling; retain regression coverage. |

## Phase acceptance criteria

- [x] Real Meta WAMIDs with `=` are accepted for inbound messages and status
  updates without weakening WABA, phone-number, or media-ID validation.
- [x] A regression test covers both inbound and status WAMIDs.
- [x] Webhook receipt routing remains keyed by the WABA and phone-number ID.
- [x] Unsupported status/message families remain durable and visible as
  deferred rather than being written as incomplete messages.
- [ ] A later media phase adds provider media retrieval and storage.
- [ ] A later schema phase decides and migrates `deleted` status semantics.
- [ ] A later envelope phase supports or explicitly rejects multi-entry
  routing without losing account identity.
- [ ] Controlled testing verifies a real inbound text message appears in the
  Store conversation after this validator fix.

## Verification commands

```text
bun test apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-webhook.normalizer.test.ts
./node_modules/.bin/tsc --noEmit -p apps/backend/tsconfig.json
git diff --check
```

The live Meta test remains required; local tests cannot prove WABA
subscription, provider delivery, or the tunnel's external reachability.

## Verification evidence

- [x] Focused normalizer tests: `10 passed`.
- [x] Full Cloud API test suite: `118 passed, 0 failed, 266 expect calls`.
- [x] `git diff --check` passes.
- [x] The backend hot-restarted after the validator change.
- [ ] A post-fix live replay is still pending because the local backend's
  database pool began returning `Connection closed` and `Idle timeout reached
  after 30s` while the worker was polling. This is an environment/runtime
  blocker, not a webhook payload-validation failure, and must be resolved
  before claiming end-to-end inbound-message acceptance.
- [ ] Full backend TypeScript check remains red on pre-existing unrelated test
  and repository-baseline errors; no new error was reported in the changed
  normalizer files.
