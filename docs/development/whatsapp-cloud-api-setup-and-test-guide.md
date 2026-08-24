# WhatsApp Cloud API setup and local test guide

This is the end-to-end setup for the Cloud API path in Hisab. It covers a
Meta test number first, then the Embedded Signup flow used for customer
onboarding. The existing Baileys worker is not required for Cloud API sends.
It remains required only for QR-linked accounts.

## What you need from Meta

Create or use a Business-type Meta Developer App in Development mode. Add the
WhatsApp product and use the test WABA and test business phone supplied by
Meta. From the App Dashboard, keep these values available:

| Value | Used by | Where it comes from |
| --- | --- | --- |
| App ID | Backend and Admin | Meta App Dashboard → App settings → Basic |
| App Secret | Backend only | Meta App Dashboard → App settings → Basic → Show |
| WABA ID | Manual test account form | WhatsApp → API Setup / Getting Started |
| Phone Number ID | Manual test account form | WhatsApp → API Setup / Getting Started |
| Development access token | Entered once in the Admin test-account form | WhatsApp → API Setup / Getting Started |
| Embedded Signup Config ID | Admin only | Facebook Login for Business → Configurations |

For the first message, add your WhatsApp number as a test recipient in Meta's
API Setup screen if Meta shows a recipient allow-list. Use an international
E.164 number, for example `919876543210`, without `+`, spaces, or dashes.

Meta's official Cloud API collection says that Cloud API requires a business
portfolio, WABA, and business phone number. It also documents the temporary
user token in the App Dashboard and the normal Cloud API permissions:
`whatsapp_business_management` and `whatsapp_business_messaging`.

## Environment files

Copy the checked-in examples to ignored local files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/whatsapp-worker/.env.example apps/whatsapp-worker/.env
```

The worker file is optional for a Cloud-only test. Never commit any of these
files. The App Secret, webhook verify token, onboarding state secret, and
credential key are backend-only secrets. The Admin file may contain the App ID
and Config ID because Vite exposes `VITE_*` values to the browser; it must not
contain an App Secret or access token.

### Generate the local secrets

Run these commands from the repository root and copy the outputs into
`apps/backend/.env`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
node -e "console.log(JSON.stringify({v1: require('node:crypto').randomBytes(32).toString('base64')}))"
```

Use the first output for `WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN`, the second for
`WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET`, and the JSON output for
`WHATSAPP_CLOUD_CREDENTIAL_KEYS_JSON`. Keep
`WHATSAPP_CLOUD_CREDENTIAL_ACTIVE_KEY_VERSION=v1`.

### Backend `.env`

These are the Cloud-specific values. Keep the other database, Redis, MinIO,
JWT, and email values from `apps/backend/.env.example`.

```env
BASE_PATH=/api
PORT=8001

WHATSAPP_CLOUD_GRAPH_BASE_URL=https://graph.facebook.com
WHATSAPP_CLOUD_GRAPH_VERSION=v26.0
WHATSAPP_CLOUD_APP_ID=<META_APP_ID>
WHATSAPP_CLOUD_APP_SECRET=<META_APP_SECRET>
WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN=<LONG_RANDOM_VALUE>
WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET=<DIFFERENT_LONG_RANDOM_VALUE>
WHATSAPP_CLOUD_CREDENTIAL_KEYS_JSON='{"v1":"<BASE64_32_BYTE_KEY>"}'
WHATSAPP_CLOUD_CREDENTIAL_ACTIVE_KEY_VERSION=v1

# Match the current local development/test environment.
WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED=true
WHATSAPP_CLOUD_CALLERS_ENABLED=true
WHATSAPP_CLOUD_OUTBOX_ENABLED=true
WHATSAPP_CLOUD_MEDIA_URL_TTL_SECONDS=86400
WHATSAPP_CLOUD_RECONCILIATION_TIMEOUT_SECONDS=3600
```

`WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED` exposes **Add API test account** in
Admin. It is a protected development/test path, not the production customer
onboarding path. `WHATSAPP_CLOUD_CALLERS_ENABLED` allows bill, due, and
promotion code to call Cloud sending. `WHATSAPP_CLOUD_OUTBOX_ENABLED` allows
queued Cloud messages to be dispatched by the backend. These three values now
match the working local `.env`; set them to `false` for a disabled or
production-safe baseline where appropriate.

### Admin `.env`

```env
BASE_API_URL=/api
VITE_WHATSAPP_CLOUD_APP_ID=<SAME_META_APP_ID>
VITE_WHATSAPP_CLOUD_CONFIG_ID=<META_EMBEDDED_SIGNUP_CONFIG_ID>
VITE_WHATSAPP_CLOUD_GRAPH_VERSION=v26.0
VITE_WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED=true
```

This matches the current local Admin `.env` and shows the API test-account
form. Set it to `false` when you want to test only Embedded Signup. Restart
Vite after changing any `VITE_*` value.

### Worker `.env`

The worker is unrelated to a Cloud API send. Keep it configured only if the
same local environment also tests QR-linked Baileys accounts. Run it with
Node 20+, not Bun, because it owns the WebSocket connection.

```env
WHATSAPP_WORKER_HOST=127.0.0.1
WHATSAPP_WORKER_PORT=8100
WHATSAPP_API_URL=http://127.0.0.1:8001/api
WHATSAPP_WORKER_TOKEN=<SAME_SHARED_TOKEN_AS_BACKEND>
WHATSAPP_AUTH_ENCRYPTION_KEY=<AT_LEAST_32_RANDOM_BYTES>
WHATSAPP_AUTH_STATE_DIRECTORY=./data/whatsapp-auth
```

## Apply the database migrations

Run this from `apps/backend` against the database named by
`apps/backend/.env`:

```bash
bun --env-file=.env ../../node_modules/.bin/dbmate --no-dump-schema -d db/migrations up
bun --env-file=.env src/scripts/verify-whatsapp-cloud-foundation.ts
```

The second command checks Cloud identity pairs, credential bindings, and
default Store assignments. A successful migration command is not proof that a
different database was migrated; run both commands against every target
database.

## Start the local services

Use separate terminals from the repository root:

```bash
bun --env-file=apps/backend/.env --watch apps/backend/src/index.ts
bun run --cwd apps/admin dev
```

The expected local URLs are:

- Backend: `http://localhost:8001/api`
- Admin: `http://localhost:5173`

Start the worker only for QR-linked accounts:

```bash
bun run --cwd apps/whatsapp-worker dev
```

## Configure the Meta webhook

Meta must be able to reach the callback over HTTPS. For local testing, expose
the Admin/Vite port so its `/api` proxy forwards the webhook to the backend:

```bash
ngrok http 5173
```

If ngrok gives `https://abc123.ngrok-free.app`, configure this callback in the
Meta App's WhatsApp Business Account webhook settings:

```text
https://abc123.ngrok-free.app/api/webhooks/whatsapp
```

Use exactly the backend value of
`WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN`. Verify it before continuing:

```bash
curl -G 'https://abc123.ngrok-free.app/api/webhooks/whatsapp' \
  --data-urlencode 'hub.mode=subscribe' \
  --data-urlencode 'hub.verify_token=<YOUR_VERIFY_TOKEN>' \
  --data-urlencode 'hub.challenge=local-challenge'
```

The response must be exactly `local-challenge`. Then subscribe the App to the
test WABA in Meta. Do not put the App Secret in the Admin env file.

## Connect the test account in Hisab

For the fastest local test:

1. Confirm the three backend Cloud flags and the Admin manual-setup flag are
   `true`, then restart Backend and Admin.
2. Open the organization's WhatsApp Accounts page.
3. Click **Add API test account**.
4. Enter the Meta **WABA ID**, **Phone Number ID**, and development access
   token.
5. Click **Connect test account**.
6. Confirm the account shows **Cloud API** and **Connected**.

The backend validates the WABA and phone identity with Graph, stores the
access token in the encrypted database credential vault, subscribes the App to
the WABA, persists the Cloud account, and synchronizes its templates. The
token should not be returned to the browser or printed in logs.

For the product onboarding path, set the manual flags to `false`, keep the
Admin App ID and Embedded Signup Config ID configured, and click **Connect
with Meta** instead. The code exchange happens in the backend and the
resulting credential is stored in the same vault.

## Sync and bind an approved template

1. Link the Cloud account to the test Store.
2. Open the Store's WhatsApp templates page.
3. Select the Cloud account and click **Sync Meta templates**.
4. Choose an approved Meta template for the correct language and category.
5. Bind it to the local Store template:
   - **Bill**: utility template; document header if sending an invoice PDF.
   - **Due reminder**: utility template.
   - **Promotion**: marketing template.
6. Save the binding and verify that the binding belongs to the same WABA and
   Store.

Do not test with a local template name alone. A Cloud send uses the approved
Meta template name, language, category, and component structure stored by the
binding.

## Test Meta directly before testing Hisab

This isolates Meta credentials from Hisab. Keep the token in the shell only;
do not add it to a committed file:

```bash
export WA_TEST_ACCESS_TOKEN='<META_DEVELOPMENT_ACCESS_TOKEN>'
export WA_PHONE_NUMBER_ID='<META_PHONE_NUMBER_ID>'
export WA_RECIPIENT_E164='919876543210'

curl -i "https://graph.facebook.com/v26.0/${WA_PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${WA_TEST_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data @- <<JSON
{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "${WA_RECIPIENT_E164}",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
}
JSON
```

A successful Graph response proves the Meta App, token, phone number ID, and
recipient are usable. It does not prove that Hisab's account, WABA binding,
template mapping, consent, outbox, or webhook processing is correct.

## Test the Hisab flow

Use one test customer with a phone number and the required consent:

- Bill and due reminder: utility opt-in.
- Promotion: marketing opt-in, with no marketing opt-out or suppression.

Then run one controlled test in this order:

1. Link the Cloud account to the Store.
2. Sync and bind one approved template.
3. Create or use one test customer.
4. Queue one bill, due reminder, or promotion from the Admin UI.
5. Confirm the outbox moves from `queued` to `processing` to `sent`.
6. Confirm webhook events update `delivered` and `read` when Meta sends them.
7. For an invoice, confirm Meta can download the signed document URL before it
   expires.

The backend dispatch loop runs inside the API process. Cloud sends do not use
the port-8100 worker. If an item remains `queued`, check that
`WHATSAPP_CLOUD_OUTBOX_ENABLED=true` was loaded by the backend process and
restart the backend after changing `.env`.

## Troubleshooting

| Symptom | First check |
| --- | --- |
| Admin says Cloud is not configured | Restart Admin after changing `VITE_*`; inspect the loaded Vite process, not only the file. |
| **Add API test account** is missing | Set `WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED=true` and `VITE_WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED=true`, then restart Backend and Admin. |
| Webhook verification returns `403` | The Meta verify token and backend `WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN` differ. |
| Webhook verification returns `404` | The callback is missing the `/api` base path or is pointed at the wrong port. |
| Graph returns `400` while connecting | Check WABA ID, Phone Number ID, Graph version, token permissions, and that the phone belongs to that WABA. |
| Direct Meta curl fails | Fix Meta credentials/recipient first; Hisab cannot repair a provider-level failure. |
| Account connects but no templates appear | Sync the same WABA again and confirm the templates are approved. |
| Promotion has no eligible recipients | Check customer phone, marketing opt-in, opt-out, and suppression. |
| Outbox stays queued | Enable `WHATSAPP_CLOUD_OUTBOX_ENABLED`, restart Backend, and inspect the outbox error/status. |
| Status is `reconciling` | Do not blindly resend; wait for provider evidence or use the Admin reconcile action. |
| App Secret appears in browser or logs | Stop the test, rotate the secret, and remove it from Admin/browser configuration. |

## Local exit checklist

- [ ] Backend and Admin env files contain the correct placeholders/values.
- [ ] Database migrations and the Cloud foundation verifier pass.
- [ ] Meta direct curl succeeds for the test recipient.
- [ ] Webhook verification returns the challenge.
- [ ] Hisab connects the Cloud test account.
- [ ] The account is linked to the test Store.
- [ ] One approved template is synchronized and bound.
- [ ] One controlled send reaches `sent` and webhook statuses are observed.
- [ ] No token, App Secret, credential key, or message body is committed or
      exposed in logs.

## Official Meta references

- [WhatsApp Cloud API collection (Meta, Postman)](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api)
- [WhatsApp Business Developer Hub](https://whatsappbusiness.com/developers/developer-hub/)
- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)

The repository-specific route and environment names in this guide are based
on the current Hisab code. Recheck Meta's current dashboard labels, Graph API
version, permissions, and policy before a production rollout.
