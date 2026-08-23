# WhatsApp Cloud local Meta setup

Date: 2026-08-23

## Decision

Create a Meta Developer App in Development mode for local testing. Use a test
WABA and test business phone first. Do not enable customer onboarding or
production sending until the App Review and Tech Provider requirements are
complete.

## Meta values required by this repository

| Repository variable | Where it comes from | Secret? |
| --- | --- | --- |
| `WHATSAPP_CLOUD_APP_ID` | Meta Developer App Dashboard, App ID | No |
| `WHATSAPP_CLOUD_APP_SECRET` | Meta Developer App Dashboard, App Secret | Yes; backend only |
| `VITE_WHATSAPP_CLOUD_APP_ID` | Same Meta App ID | No; browser-visible |
| `VITE_WHATSAPP_CLOUD_CONFIG_ID` | Facebook Login for Business / Embedded Signup configuration | No; browser-visible |
| `WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN` | Generate locally; use the same value in Meta webhook configuration | Yes |
| `WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET` | Generate locally; backend-only signing secret | Yes |
| `WHATSAPP_CLOUD_CREDENTIAL_KEYS_JSON` | Generate and store as backend deployment secret | Yes |

The backend exchanges the Embedded Signup authorization code with the App ID
and App Secret. It does not require a customer access token in `.env`; the
resulting customer credential is stored through the encrypted database vault.

## Meta setup sequence

1. Create a Meta Developer App in Development mode at the Meta for Developers
   dashboard.
2. Add the WhatsApp product and create/use the test WABA and test business
   phone number shown by Meta.
3. Configure Facebook Login for Business and create the Embedded Signup
   configuration. Copy its configuration ID into the Admin `.env`.
4. Add the local development domain/origin required by Meta. A localhost-only
   test may be limited by Meta's current SDK and app settings; use an HTTPS
   tunnel when Meta requires a public callback.
5. Configure the App webhook callback to the deployed or tunneled webhook
   route and enter the generated verify token. The callback must be HTTPS for
   a real Meta callback.
6. Add the permissions and app-review requests required for the intended
   Tech Provider flow. Meta's Embedded Signup collection currently calls out
   Advanced Access for `business_management` and
   `whatsapp_business_management` before release, and normal messaging uses
   `whatsapp_business_messaging`.

Primary sources:

- [Meta Embedded Signup collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)
- [Meta WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api)
- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)

## Local state after this setup

- `apps/backend/.env` contains generated local secrets and safe placeholders
  for the two Meta App values; it is ignored and must not be committed.
- `apps/admin/.env` contains safe placeholders for the App ID and config ID;
  it is ignored and must not be committed.
- Cloud callers and outbox remain disabled until real Meta values and a
  controlled test account are configured.
