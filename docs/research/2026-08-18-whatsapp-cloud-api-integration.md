# WhatsApp Cloud API integration plan

Date: 2026-08-18

This note explains how to add Meta's official WhatsApp Business Platform Cloud
API to Hisab without breaking the existing QR/Baileys integration. It is a
design and research note only; it does not change application behaviour or the
database.

## Recommendation

Add Cloud API as a second WhatsApp provider behind the existing messaging
boundary. Keep Baileys accounts working during the rollout, and migrate a
Store/account only after a controlled Cloud API test succeeds.

Do not replace the current QR worker in one step. Cloud API has no QR socket
session: it sends through Meta's Graph API, receives messages and delivery
statuses through HTTPS webhooks, and identifies a sender by Meta's phone
number ID.

For Hisab's multi-organization model, the production onboarding path should be
Meta Embedded Signup. A manual WABA/phone-number configuration can be used for
the first internal pilot only.

## What Meta requires

Each Cloud API sender needs:

- a Meta business portfolio;
- a WhatsApp Business Account (WABA);
- a registered business phone number and its phone-number ID;
- a system-user access token with the required WhatsApp permissions;
- a public HTTPS webhook endpoint;
- approved Meta message templates for business-initiated messages.

Meta's official Cloud API collection documents the `/PHONE_NUMBER_ID/messages`
send endpoint, the WABA and phone-number assets, system/user access tokens,
and the `whatsapp_business_management` and `whatsapp_business_messaging`
permissions. [Meta Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)

Because Hisab onboards customer organizations, the App must go through App
Review and request Advanced Access for the management permissions used by
Embedded Signup. [Meta Embedded Signup collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)

The WABA must be subscribed to the App before its phone-number events arrive
at the configured webhook. Subscription is per WABA, not once per phone
number. [Subscribe an App to a WABA](https://www.postman.com/meta/whatsapp-business-platform/request/c1ai24q/subscribe-to-your-waba)

Meta's webhook setup requires an internet-facing HTTPS callback URL and verify
token. One App can use one configured callback endpoint, and that endpoint can
receive events for multiple WABAs. [Meta webhook setup](https://www.postman.com/postman/brewing-postman-flows/folder/wtcx48v/step-2-set-up-webhooks)

## Current Hisab architecture

The current seam is already useful:

- `whatsapp_accounts` has a `provider` enum containing `baileys` and
  `cloud_api`.
- `whatsapp_account_stores` allows one organization account to be assigned to
  multiple Stores.
- `whatsapp_messages`, `whatsapp_outbox`, conversations, provider-event
  inboxing, retries, dead lettering, and delivery status tracking already form
  the durable messaging pipeline.
- `apps/whatsapp-worker` owns the Baileys sockets and currently dispatches
  every claimed outbox job through `BaileysAccountManager`.
- `apps/backend/src/services/notifications/whatsapp.service.ts` is an older
  direct Cloud API path used for OTP/invites and has global environment-based
  credentials. It is not suitable for multi-organization customer accounts.

Relevant code: `packages/types/src/services/whatsapp.schema.ts`,
`apps/backend/db/migrations/20260811100000_create_whatsapp_messaging_foundation.sql`,
`apps/backend/db/migrations/20260816170000_organization_whatsapp_accounts.sql`,
`apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.ts`, and
`apps/whatsapp-worker/src/provider/baileys-account-manager.ts`.

## Target design

### Provider interface

Create one deep provider interface around the existing outbox operations:

- `sendText`;
- `sendDocument`;
- `sendImage`;
- `sendTemplate`;
- `getStatus`/`refreshStatus`;
- inbound event normalization.

Implement two adapters:

1. `BaileysAdapter`: wraps the current account manager and QR/session logic.
2. `CloudApiAdapter`: calls Meta Graph API, uploads media to Meta when needed,
   sends approved templates, and maps Graph responses/errors to Hisab's
   existing message/outbox statuses.

Callers should continue to queue a Store-scoped outbox row. They should not
know whether the account is Baileys or Cloud API. This keeps the provider
choice local to one seam and prevents bill, reminder, promotion, and inbox
features from growing separate implementations.

### Dispatch placement

Keep the current Node worker dedicated to Baileys initially. Add a small
Cloud API dispatcher that claims only `cloud_api` outbox rows using the same
lease, retry, idempotency, and result-update logic. The dispatcher can run in
the backend process first, because Cloud API credentials should remain in the
backend's protected credential store and do not need to be copied into the
QR worker.

The outbox claim query must filter by provider. Without that filter, the
existing Baileys worker could claim a Cloud API row and report a misleading
"not connected" error.

### Account and credential data

Keep the existing organization account and Store-assignment model, but add a
provider-specific credential record rather than putting tokens in the browser
or ordinary `.env` values:

- `whatsapp_account_id`;
- Meta WABA ID;
- Meta phone-number ID;
- optional Meta business portfolio ID;
- encrypted system-user access token or a reference to a secret manager;
- token expiry/rotation metadata;
- last provider health result and provider error metadata.

The human display phone number remains on `whatsapp_accounts`. Meta phone
number ID and WABA ID are separate identifiers and must not be substituted for
the customer's phone number.

The same physical number must not be silently registered as both a QR/Baileys
account and a Cloud API account. Existing Baileys auth state is not a Cloud
API credential. A migration must be an explicit, provider-aware operation.

### Webhook and inbound flow

Add an HTTPS Meta webhook route to the backend. It should:

1. answer Meta's verification challenge;
2. validate the request signature/secret and reject unauthenticated payloads;
3. persist the raw event into the existing durable provider-event inbox;
4. resolve `phone_number_id` to the Cloud API account;
5. normalize inbound messages and statuses into the existing message model;
6. acknowledge quickly and process media asynchronously.

Meta webhook payloads are WABA-scoped and contain message/status changes under
the `whatsapp_business_account` object. [Meta webhook payload and subscription documentation](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)

For inbound media, persist the provider media ID first and fetch the bytes from
Meta into private storage in the processor. Do not put large media base64 data
inside the webhook request or provider-event payload.

The existing Store-scoped conversation key remains essential:
`(whatsapp_account_id, store_id, external_chat_id)`. An account assigned to
multiple Stores needs an explicit default inbound Store, as the current model
already supports; otherwise the same Cloud API message cannot be routed
deterministically.

### Templates and the current UI

The current Hisab templates are local message bodies. They are not automatically
Meta-approved templates. For Cloud API, maintain two concepts:

- a Hisab template preset: the friendly Store-facing name, token mapping, and
  preview;
- a Meta template binding: Meta template name, language, category, component
  structure, approval status, and parameter mapping.

The send flow should choose the Meta binding for the provider. Bills, due
reminders, and promotions should normally use separate approved Utility or
Marketing templates. A free-form custom body/media send is only valid while
the customer's rolling 24-hour customer-service window is open; outside that
window, the send must use a template. [Meta status/window documentation](https://www.postman.com/meta/whatsapp-business-platform/folder/fuaee8l/statuses-object)

Meta's official collection supports fetching, creating, editing, and deleting
WABA message templates, and supports text, media-header, and interactive
templates with call-to-action or quick-reply buttons. [Meta templates collection](https://www.postman.com/meta/whatsapp-business-platform/folder/lczy75a/templates)

The simple UI should therefore show:

- Cloud API account status and phone number;
- synced Meta template status (`Approved`, `Pending`, `Rejected`, `Paused`);
- one mapping for Bill, Due reminder, and Promotion;
- a preview with sample values;
- a clear warning when a custom message is unavailable outside the 24-hour
  window.

The existing reusable links can be mapped to approved dynamic URL buttons, but
the final URL/button structure must match the Meta template. A local link does
not bypass Meta template approval.

## Phased implementation

### Phase 0: Meta pilot

- Create a Meta App and test WABA/phone number.
- Configure the HTTPS webhook.
- Use a system-user token, never the temporary 24-hour token for production.
- Send a text, document, image, and approved template to controlled test
  numbers.
- Capture exact Graph API errors and webhook payloads.

### Phase 1: provider foundation

- Add provider-neutral dispatch types and a Cloud API adapter.
- Add encrypted Cloud API credential storage and account metadata.
- Filter Baileys outbox claims by provider.
- Add Cloud API outbox claiming, retries, rate limits, and result updates.
- Reuse the existing provider-event inbox and dead-letter path.

### Phase 2: Cloud API onboarding

- Add a `Connect Cloud API` flow using Embedded Signup.
- Exchange the returned code server-side.
- Discover the WABA and phone-number IDs.
- add/verify the required system user permissions;
- register the phone number when required;
- subscribe the WABA to the App;
- persist the encrypted credential and sync approved templates.

Meta's Embedded Signup flow explicitly covers assigning system users, phone
registration, WABA subscription, and template discovery after onboarding.
[Embedded Signup required endpoints](https://www.postman.com/meta/whatsapp-business-platform/folder/k77cwzj/step-2-integrate-with-required-endpoints)

### Phase 3: feature migration

- Route bill PDFs through a Cloud API document template.
- Route due reminders through a Utility template.
- Route promotions through a Marketing template with opt-in enforcement.
- Map template variables and dynamic link buttons server-side.
- Sync delivery/read/failed status events and display them in the existing
  message UI.

### Phase 4: controlled rollout

- Enable Cloud API for one internal organization and one Store.
- Test inbound messages, bill delivery, due reminders, promotions, media,
  retries, duplicate webhooks, token rotation, revoked numbers, and Store
  routing.
- Compare outbox/provider-event metrics against the Baileys path.
- Only then expose Cloud API onboarding to customer organizations.

## Important product constraints

- Proactive messages require customer opt-in; add/verify opt-in and opt-out
  state before enabling promotions.
- The 24-hour customer-service window changes whether a free-form message is
  legal; the UI must not promise that any custom text can always be sent.
- Template approval, quality status, messaging limits, and Meta billing are
  provider concerns; show their state rather than treating a queued message as
  delivered.
- Do not use the existing global `WHATSAPP_API_TOKEN` for multi-tenant Cloud
  API accounts. It is appropriate only for the old fixed OTP/invite path until
  that path is migrated separately.
- Do not expose Meta tokens, webhook secrets, phone-number IDs, or raw webhook
  payloads in logs.

## Decision needed before implementation

The recommended production model is: each Organization connects its own WABA
and phone number through Embedded Signup, while Hisab stores the encrypted
credential and assigns that account to one or more Stores. The first pilot can
use one manually configured Cloud API test account to validate the adapter
before building self-serve onboarding.
