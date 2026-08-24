# WhatsApp Cloud local test runbook

Date: 2026-08-23

This runbook tests the current Cloud API implementation without removing or
disabling the existing Baileys worker. Cloud messages are dispatched by the
backend; the worker remains required only for legacy QR-linked accounts.

## 1. Meta prerequisites

Use a separate Meta Developer App in Development mode and a Meta test WABA /
test business phone. Do not use a customer number for the first test.

Meta's Cloud API requires a Meta business portfolio, WABA, and business phone
number. Meta's Embedded Signup flow is intended for Tech Providers and
Solution Partners. Before release, Meta requires App Review and Advanced
Access for the relevant business permissions.

Primary sources:

- [Meta Embedded Signup collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)
- [Meta WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api)
- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)

### Create the test App

1. Open the Meta for Developers dashboard and create a Business-type App in
   Development mode.
2. Add the WhatsApp product.
3. In WhatsApp → API Setup / Getting Started, note the test WABA and test
   phone number. Add your personal test WhatsApp number as an allowed test
   recipient.
4. In App settings, copy the App ID and reveal/copy the App Secret.
5. Add Facebook Login for Business and create an Embedded Signup
   configuration for WhatsApp. Copy its Configuration ID.
6. Add the app domains/origins required by Meta. For local browser testing,
   use the HTTPS ngrok hostname described below when Meta does not accept
   localhost.
7. Add the Webhooks product and select the WhatsApp Business Account object.
   The callback URL and verify token are configured after ngrok starts.
8. Request/enable the permissions required by the test App. The Cloud API
   normally uses `whatsapp_business_management` and
   `whatsapp_business_messaging`; Embedded Signup release also requires the
   App Review / Advanced Access process for `business_management` and
   `whatsapp_business_management`.

For an internal test, Development mode and Meta test assets are sufficient.
App Review is required before onboarding arbitrary customer businesses or
releasing the flow publicly.

## 2. Configure the local environment

The following files are ignored and must not be committed:

- `apps/backend/.env`
- `apps/admin/.env`

Replace the placeholders already added locally:

```env
# apps/backend/.env
WHATSAPP_CLOUD_GRAPH_VERSION=v26.0
WHATSAPP_CLOUD_APP_ID=<Meta App ID>
WHATSAPP_CLOUD_APP_SECRET=<Meta App Secret>
WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN=<keep the generated local value>
WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET=<keep the generated local value>
WHATSAPP_CLOUD_CALLERS_ENABLED=true
WHATSAPP_CLOUD_OUTBOX_ENABLED=false

# apps/admin/.env
VITE_WHATSAPP_CLOUD_APP_ID=<same Meta App ID>
VITE_WHATSAPP_CLOUD_CONFIG_ID=<Embedded Signup Configuration ID>
VITE_WHATSAPP_CLOUD_GRAPH_VERSION=v26.0
```

Keep these backend-only values configured:

- `WHATSAPP_CLOUD_CREDENTIAL_KEYS_JSON`
- `WHATSAPP_CLOUD_CREDENTIAL_ACTIVE_KEY_VERSION`

The App Secret, onboarding secret, webhook verify token, and credential key
must never be placed in `apps/admin/.env` or browser code. Do not copy a
customer access token into `.env`; the Embedded Signup code exchange stores
the resulting credential through the encrypted database vault.

For sending, set this only after onboarding succeeds:

```env
WHATSAPP_CLOUD_OUTBOX_ENABLED=true
```

The local migration is already applied in the current database. For another
database, run from `apps/backend`:

```bash
bun --env-file=.env ../../node_modules/.bin/dbmate --no-dump-schema -d db/migrations up
```

## 3. Start the local services

Use separate terminals from the repository root.

### Backend

```bash
bun --env-file=apps/backend/.env --watch apps/backend/src/index.ts
```

Expected output includes port `8001`.

### Admin

```bash
bun run --cwd apps/admin dev
```

Expected output is normally `http://localhost:5173`.

### Legacy worker

Only required for existing Baileys accounts:

```bash
bun run --cwd apps/whatsapp-worker dev
```

Cloud API sends do not use port `8100`.

## 4. Expose the local app with ngrok

Expose port `5173`, not `8001`. Vite proxies `/api` to the backend, so the
Admin page and webhook share the same public origin.

```bash
ngrok http 5173
```

Or:

```bash
bunx ngrok http 5173
```

If ngrok asks for authentication, create an ngrok account and run its
`config add-authtoken` command once.

If ngrok gives:

```text
https://abc123.ngrok-free.app
```

use this Meta webhook callback URL:

```text
https://abc123.ngrok-free.app/api/webhooks/whatsapp
```

The backend route is `/api/webhooks/whatsapp` because the backend uses the
`/api` base path. In Meta's webhook verification form, use the exact value of
`WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN` from `apps/backend/.env`.

After changing the ngrok hostname, update Meta's app domain/origin and webhook
callback settings. A free ngrok hostname usually changes after restart.

## 5. Verify the webhook before connecting an account

From a browser or terminal, test the public verification route with the same
verify token:

```bash
curl -G 'https://abc123.ngrok-free.app/api/webhooks/whatsapp' \
  --data-urlencode 'hub.mode=subscribe' \
  --data-urlencode 'hub.verify_token=YOUR_LOCAL_VERIFY_TOKEN' \
  --data-urlencode 'hub.challenge=local-challenge'
```

Expected response:

```text
local-challenge
```

If it returns `Forbidden`, the token is different. If it returns
`Webhook is not configured`, the backend was not restarted with the correct
`.env`.

After verification, subscribe the App to the test WABA in Meta. The backend
also performs the WABA subscription step during Cloud onboarding.

## 6. Connect the Meta API Setup test account

Embedded Signup is currently blocked until Meta recognizes the app as an
approved Tech Provider. For local development, enable the protected manual
test path in the ignored files:

```env
# apps/backend/.env
WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED=true

# apps/admin/.env
VITE_WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED=true
```

Restart the backend and Admin, then open the organization's WhatsApp Accounts
page and click **Add API test account**. Enter the **WABA ID**, **Phone Number
ID**, and development access token shown in Meta → WhatsApp → API Setup.

The backend validates both IDs through Graph, subscribes the App to the WABA,
stores the token through the encrypted credential vault, persists a `cloud_api`
account, and synchronizes templates. It never returns or logs the token. The
manual form is unavailable in production and must not be used for customer
onboarding.

For Meta test numbers, add the recipient phone in API Setup → **To** before
sending. Do not call the phone registration endpoint unless Meta reports that
the number is not registered.

After the account appears as **Cloud API / Connected**, continue with Store
assignment below.

## 7. Connect the Cloud account through the Admin UI

1. Open:

   `http://localhost:5173/organizations/<ORGANIZATION_ID>/whatsapp/accounts`

2. Click **Connect with Meta**.
3. Complete Embedded Signup using the Meta test business/WABA and test phone.
4. Approve the requested test permissions.
5. Complete phone registration if Meta asks for the test phone PIN.
6. Wait for the success toast and reload the page.

The backend then:

1. Starts signed, organization-bound onboarding state.
2. Exchanges the authorization code server-side.
3. Stores the token as AES-GCM ciphertext.
4. Fetches and validates the WABA and phone.
5. Subscribes the App to the WABA.
6. Persists safe account metadata.
7. Synchronizes approved Meta templates.

The account card should show the phone number, **Cloud API**, and **Connected**.
The access token must never appear in the browser response or logs.

## 8. Link the Cloud account to a Store

1. Open the Store's WhatsApp page:

   `/organizations/<ORGANIZATION_ID>/stores/<STORE_ID>/whatsapp`

2. If no account is linked, choose the Cloud account and click **Link account**.
3. Confirm the page says it is shared with one Store in the organization.

The organization account can be linked to multiple Stores. Template bindings
and conversations remain Store-scoped.

## 9. Sync and map Meta templates

1. Open:

   `/organizations/<ORGANIZATION_ID>/whatsapp/templates`

2. Select the Store.
3. Open **Templates and links**.
4. Under **Meta Cloud templates**, choose the connected Cloud account.
5. Select one intent at a time: **Bill**, **Due reminder**, or **Promotion**.
6. Click **Sync Meta templates**.
7. Choose an approved Meta template and the matching local template.
8. Save the binding.

Use these categories:

- Bill: approved **utility** template with a document header for the invoice PDF.
- Due reminder: approved **utility** template.
- Promotion: approved **marketing** template.

The binding rejects the wrong WABA, unapproved templates, stale templates,
wrong categories, missing variables, and incompatible buttons/media. The test
WABA's pre-approved template can be used for a basic text test, but a real bill
test needs a document-capable approved template.

## 10. Record consent for the test customer

Cloud sends are blocked unless the customer has a phone and valid consent.
Utility messages require utility opt-in. Promotions require marketing opt-in,
and marketing opt-out or suppression always wins.

The current Admin customer form exposes **Do not send promotions**, but it does
not yet provide the complete explicit opt-in/history UI. For a test customer
only, use the authenticated browser session in DevTools while logged into the
Admin app:

```js
await fetch('/api/organizations/ORG_ID/customers/CUSTOMER_ID/whatsapp/consent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    kind: 'utility',
    state: 'opted_in',
    source: 'admin',
    wordingVersion: 'local-test-v1',
    evidenceReference: 'local-test',
    reason: 'Explicit consent for local test customer'
  })
});

await fetch('/api/organizations/ORG_ID/customers/CUSTOMER_ID/whatsapp/consent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    kind: 'marketing',
    state: 'opted_in',
    source: 'admin',
    wordingVersion: 'local-test-v1',
    evidenceReference: 'local-test',
    reason: 'Explicit consent for local test promotion'
  })
});
```

Do not use this to bypass consent for real customers. The consent endpoints
are:

- `POST /api/organizations/:organizationId/customers/:customerId/whatsapp/consent`
- `POST /api/organizations/:organizationId/customers/:customerId/whatsapp/suppression`
- `GET /api/organizations/:organizationId/customers/:customerId/whatsapp/consent`

## 10. Test a bill

1. Ensure the Store has a linked Cloud account.
2. Ensure the Store has an active bill local template and an approved Cloud
   bill binding with a document header.
3. Use a consented test customer with a valid international phone number.
4. Create/complete a sale for that customer.
5. From the bill/sale detail, choose **WhatsApp invoice**.
6. Set `WHATSAPP_CLOUD_OUTBOX_ENABLED=true` and restart the backend.
7. Watch the backend and Admin Cloud safety card.

The backend generates the PDF, stores private media, creates a short-lived
signed URL, builds the approved document template payload, and queues the
Cloud outbox item. Meta downloads the signed document URL while the URL is
valid.

Expected path: `queued` → `processing` → `sent`/`delivered`/`read`.

## 11. Test a due reminder

1. Use a test customer with an outstanding due bill and utility opt-in.
2. Open the sale detail or customer due action.
3. Click **Remind due**.
4. Confirm the Store's approved due-reminder Cloud binding exists.
5. Watch the outbox and webhook status updates.

If the message is blocked, the usual causes are missing utility consent,
missing binding, an inactive template, or a disconnected Cloud account.

## 12. Test a promotion

1. Confirm the Store has an approved marketing Cloud template binding.
2. Confirm the test customer has marketing opt-in and is not opted out or
   suppressed.
3. Open:

   `/organizations/<ORGANIZATION_ID>/whatsapp/promotions`

4. Select the Store.
5. Click **New promotion**.
6. Enter the required title and message. Image is optional; if supplied, it
   must be an image of 10 MB or less.
7. Use the approved promotion template body exactly; Cloud promotion sends do
   not accept arbitrary text when a Cloud account is selected.
8. Click **Queue promotion**.
9. Watch **Recent promotions** for queued, sent, delivered, read, and failed
   counts.

The Store has a one-promotion-per-hour cooldown. The promotion page also
supports pagination, automatic progress refresh, and stopping queued/sending
campaigns. Stopping never changes already delivered messages.

## 13. Test safety and delivery operations

On the Accounts tab, the Cloud safety card shows:

- period usage and configured quota;
- account and recipient limits;
- send interval and customer cooldown;
- retryable items and dead letters;
- uncertain/reconciling submissions;
- recent Cloud operations.

Use **Reconcile now** for stale uncertain submissions. Never manually retry a
`reconciling` item: its provider outcome is unknown and automatic resend could
duplicate a message. Retry is available only for definitively retryable rows.
Dead-lettering releases reserved quota and does not send the message.

## 14. Webhook and delivery checks

When a message is sent, Meta should POST signed status events to the ngrok
callback. Confirm:

1. Backend logs show the webhook request without exposing tokens or message
   bodies.
2. The Admin safety card/outbox status changes.
3. The sale detail shows invoice/due message status.
4. Promotion counters update from webhook status events.
5. Duplicate webhook deliveries do not create duplicate messages.

## 15. Troubleshooting

| Symptom | Check |
| --- | --- |
| Embedded Signup says not configured | Restart Admin after setting `VITE_WHATSAPP_CLOUD_APP_ID` and `VITE_WHATSAPP_CLOUD_CONFIG_ID`. |
| Backend says onboarding not configured | Restart backend with `WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET`. |
| Meta code exchange fails | Verify App ID, App Secret, Graph version, App mode, and allowed domain. |
| Webhook `403` | Meta verify token must exactly match `WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN`. |
| Webhook `401` | Backend App Secret must match the Meta App Secret used to sign the request. |
| Account connects but templates are empty | Click Sync and ensure the Meta templates are approved for the same WABA. |
| No approved Cloud binding | Map the Store-local template to an approved Cloud template. |
| Promotion has no recipients | Add marketing opt-in and remove suppression/marketing opt-out for the test customer. |
| Bill/due is blocked | Add utility opt-in and verify the correct Store binding. |
| Invoice media fails | Verify MinIO/private storage and signed URL reachability from Meta. |
| Outbox stays queued | Set `WHATSAPP_CLOUD_OUTBOX_ENABLED=true` and restart the backend. |
| Status is reconciling | Wait for provider evidence or use Reconcile now; do not resend blindly. |
| Promotion cannot be queued again | Wait for the Store's one-hour cooldown. |

## 16. Exit checklist for the local test

- [ ] Test App, test WABA, test phone, and test recipient are configured.
- [ ] App ID/Secret and Embedded Signup Config ID are in the correct env files.
- [ ] ngrok callback verification succeeds.
- [ ] Cloud account connects and remains connected after reload.
- [ ] Account is linked to the Store.
- [ ] Bill, due-reminder, and promotion templates are synced and mapped.
- [ ] Test customer has utility and/or marketing consent as appropriate.
- [ ] Bill invoice is delivered with its document.
- [ ] Due reminder is delivered.
- [ ] Promotion is queued and delivery counters update.
- [ ] Duplicate webhook and retry/reconciliation behavior are observed.
- [ ] No token, App Secret, or credential key appears in logs, browser data,
      DTOs, or Git.
