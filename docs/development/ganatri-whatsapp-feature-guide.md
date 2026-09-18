# Ganatri WhatsApp Feature Guide

This guide explains the complete Ganatri WhatsApp feature in the Hisab
monorepo: behavior, architecture, environment setup, migrations, local
startup, Meta Cloud webhook testing, Admin routes, verification, and release
follow-ups.

## What was built

Ganatri WhatsApp is integrated into the existing Ganatri Admin and selected
Store Workspace. It does not create a separate WhatsApp delivery engine.

### Sender modes

| Mode | Behavior |
| --- | --- |
| `disabled` | No new WhatsApp work is allowed; history is retained. |
| `ganatri_utility` | Ganatri's backend sender sends only fixed bill and due-reminder utility templates. No marketing, free-form replies, or tenant template management. |
| `organization_cloud` | The Organization connects Meta WhatsApp Cloud through Embedded Signup and can use approved templates, inbox/replies, consent-safe promotions, and delivery operations. |

Every Store has one current policy. An Organization may connect multiple Cloud
numbers, and one Cloud number may serve multiple Stores. Queued work keeps its
original sender and policy snapshot; policy changes never silently reroute it.

## Feature list

### Accounts and templates

- Meta Embedded Signup, WABA/phone validation, encrypted credentials, phone
  registration, health, refresh, revoke, and token rotation.
- Same-Organization Store assignment and one current Organization sender per
  Store.
- Template draft, submission, sync, approval, pause, archive, rollback, and
  explicit Store publishing.
- Ganatri Utility templates remain fixed and backend/environment controlled.

### Bill and due delivery

- Store policy-aware sender selection.
- Utility-only bill/due delivery for Ganatri Utility.
- Approved Store-bound Cloud templates for Organization Cloud.
- Entitlement, phone, consent, suppression, account-health, and provider
  checks.
- Durable outbox, immutable snapshots, idempotency, delivery status, retry,
  and deliberate resend.

### Inbox and replies

- Store-scoped conversation list, search, history, unread counts, polling,
  timestamps, and delivery states.
- Exact normalized-phone Customer matching and explicit Customer attachment.
- Customer–Store activity history and private attachment access through
  short-lived signed URLs.
- Free-form Cloud replies only inside the 24-hour customer-service window.
- Suppressed Customers, disabled Stores, utility senders, expired windows, and
  cross-Store access are blocked.

### Promotions and operations

- Organization Cloud only; Ganatri Utility cannot send marketing.
- Approved Store/WABA/account-bound marketing templates.
- Active Store Customer relationship, valid E.164 phone, marketing opt-in,
  no opt-out, and no suppression required.
- Maximum 1,000 recipients per campaign, cooldown, quota, media bounds, and
  per-recipient idempotency.
- Campaign progress, recipient delivery states, stop, retry, resend, and
  cooldown-aware resend.
- Quota, outbox, webhook, reconciliation, alerts, and operator audit history.
- Operational surfaces never show webhook payloads, message bodies, tokens, or
  credentials.

## Architecture

```text
Ganatri Admin / Store Workspace
        |
        v
Hono Backend routes and policy authorization
        |
        +--> PostgreSQL policies, accounts, templates, conversations,
        |    messages, campaigns, consent, quota, outbox, webhook events
        +--> encrypted Cloud credential boundary
        +--> Cloud outbox dispatcher
                    |
                    v
              Meta WhatsApp Cloud API
```

The Backend owns authorization and admission. The browser never owns provider
tokens, App Secrets, credential keys, or raw private media keys.

## Prerequisites

- Bun 1.3 or the repository's configured Bun version.
- PostgreSQL, Redis, and MinIO/S3-compatible private object storage.
- A Meta Developer App and WhatsApp Business Account for Cloud testing.
- A public HTTPS webhook URL for Meta; ngrok works locally.

## Environment setup

Copy the examples and edit them locally. Never commit either `.env` file.

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/admin/.env.example apps/admin/.env
```

### Backend infrastructure

```env
BASE_PATH=/api
PORT=8001
DATABASE_URL=postgres://postgres:root@localhost:5432/ganatri?sslmode=disable
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=ganatri
JWT_SECRET=<long-random-secret>
OWNER_JWT_SECRET=<different-long-random-secret>
DEVICE_SECRET_ENCRYPTION_KEY=<dedicated-key-if-needed>
```

### Ganatri Utility sender

These values are backend-only:

```env
WHATSAPP_PLATFORM_PHONE_NUMBER_ID=<platform-phone-number-id>
WHATSAPP_PLATFORM_WABA_ID=<platform-waba-id>
WHATSAPP_PLATFORM_ACCESS_TOKEN=<backend-only-access-token>
WHATSAPP_PLATFORM_GRAPH_BASE_URL=https://graph.facebook.com
WHATSAPP_PLATFORM_GRAPH_VERSION=v22.0
WHATSAPP_PLATFORM_BILL_TEMPLATE_NAME=ganatri_bill
WHATSAPP_PLATFORM_DUE_TEMPLATE_NAME=ganatri_due
WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE=en_US
```

### Meta Cloud backend configuration

```env
WHATSAPP_CLOUD_GRAPH_BASE_URL=https://graph.facebook.com
WHATSAPP_CLOUD_GRAPH_VERSION=v26.0
WHATSAPP_CLOUD_APP_ID=<meta-app-id>
WHATSAPP_CLOUD_APP_SECRET=<backend-only-meta-app-secret>
WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN=<long-random-webhook-token>
WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET=<long-random-state-secret>
WHATSAPP_CLOUD_CREDENTIAL_KEYS_JSON='{"v1":"base64-encoded-32-byte-key"}'
WHATSAPP_CLOUD_CREDENTIAL_ACTIVE_KEY_VERSION=v1
WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED=true
WHATSAPP_CLOUD_CALLERS_ENABLED=true
WHATSAPP_CLOUD_OUTBOX_ENABLED=true
WHATSAPP_MAX_PENDING_OUTBOX_PER_ACCOUNT=1000
WHATSAPP_CLOUD_MEDIA_URL_TTL_SECONDS=86400
WHATSAPP_CLOUD_RECONCILIATION_TIMEOUT_SECONDS=3600
WHATSAPP_CLOUD_ESTIMATED_COST_MINOR=0
WHATSAPP_PROMOTION_COOLDOWN_ENABLED=false
```

### Admin browser configuration

Only browser-safe values belong in `apps/admin/.env`:

```env
BASE_API_URL=/api
VITE_WHATSAPP_CLOUD_APP_ID=<same-meta-app-id>
VITE_WHATSAPP_CLOUD_CONFIG_ID=<meta-embedded-signup-config-id>
VITE_WHATSAPP_CLOUD_GRAPH_VERSION=v26.0
VITE_WHATSAPP_CLOUD_MANUAL_SETUP_ENABLED=true
```

Never put the Meta App Secret, Cloud access token, credential key, webhook
verify token, or backend state secret in Admin environment variables.

## Migrations

Run from `apps/backend`:

```bash
bun --env-file=.env ../../node_modules/.bin/dbmate --no-dump-schema -d db/migrations status
bun --env-file=.env ../../node_modules/.bin/dbmate --no-dump-schema -d db/migrations up
bun --env-file=.env ../../node_modules/.bin/dbmate --no-dump-schema -d db/migrations status
```

The completed development checkpoint has 159 applied migrations and 0 pending;
always verify the actual target database before relying on that number.

## Start Backend and Admin

Backend:

```bash
bun run --cwd apps/backend dev
```

Admin, in another terminal:

```bash
bun run --cwd apps/admin dev
```

URLs:

```text
Backend: http://localhost:8001/api
Admin:   http://localhost:5173
```

The repository shortcut is also available:

```bash
bun run dev
```

## Meta Cloud local webhook

Start Backend and Admin, then expose the Admin/Vite proxy:

```bash
ngrok http 5173
```

If ngrok gives `https://abc123.ngrok-free.app`, configure Meta with:

```text
https://abc123.ngrok-free.app/api/webhooks/whatsapp
```

Use exactly `WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN`. Verify the callback:

```bash
curl -G 'https://abc123.ngrok-free.app/api/webhooks/whatsapp' \
  --data-urlencode 'hub.mode=subscribe' \
  --data-urlencode 'hub.verify_token=<YOUR_VERIFY_TOKEN>' \
  --data-urlencode 'hub.challenge=local-challenge'
```

The response should be `local-challenge`. Do not expose PostgreSQL, Redis,
MinIO, tokens, or private operational endpoints through ngrok.

## Admin routes

```text
/organizations/<organizationId>/whatsapp/accounts
/organizations/<organizationId>/whatsapp/templates
/organizations/<organizationId>/whatsapp/promotions
/organizations/<organizationId>/whatsapp/message-history
```

The Store Workspace embeds the Store-scoped WhatsApp panel. POS `/whatsapp`
remains device-scoped and is not reused by Admin.

## Recommended first run

1. Start PostgreSQL, Redis, and MinIO.
2. Apply migrations.
3. Start Backend and Admin.
4. Log in as the Organization creator/WhatsApp administrator.
5. Open Organization WhatsApp → Accounts.
6. Connect a Cloud number through Embedded Signup or the explicitly enabled
   local manual setup form.
7. Link the account to a Store and enable `organization_cloud`.
8. Sync Meta templates, create/submit a promotion template if needed, wait for
   approval, and publish the Store binding.
9. Use a test Customer with a valid E.164 phone and required consent.
10. Test a bill/due message, an inbound conversation, a reply inside 24 hours,
    and a controlled promotion.
11. Check message history, delivery state, Cloud sending controls, webhook
    health, quota/reconciliation state, alerts, and operator audit history.

## Promotion eligibility

A promotion is queued only when the current Store policy selects a connected,
verified Organization Cloud account; the selected binding belongs to the same
Store/WABA/account and is approved for marketing; and each recipient is active,
Store-associated, phone-valid, marketing-opted-in, not opted out, and not
suppressed. Cooldown, quota, media, and idempotency checks also apply.

Ganatri Utility and disabled Stores reject promotion attempts at the backend,
even if a client sends crafted input.

## Testing and builds

```bash
bun test apps/backend/src/modules/tenant/whatsapp
bun test apps/admin/src/pages/whatsapp-organization-page.test.tsx
bun test apps/admin/src/components/organizations/whatsapp-cloud-safety-card.test.tsx
bun run --cwd apps/backend build
bun run --cwd apps/admin build
```

The completed Phase 9 checkpoint recorded 307 WhatsApp tests passing, 3
database-dependent tests skipped, and both production builds passing.

## Security rules

- Never commit `.env` files or print their contents.
- Never expose tokens, App Secrets, credential keys, webhook secrets, OTPs, QR
  values, full phone numbers, message bodies, PDFs, or object-storage keys.
- Keep Cloud credentials backend-only.
- Treat signed media URLs as temporary capabilities.
- Never manually mark provider sends successful; use provider IDs and durable
  reconciliation.
- Never bypass Store policy, entitlement, consent, suppression, or approved
  template checks from the client.

## Known release follow-ups

- Browser verification of Admin and Store Workspace layouts and states.
- Live Meta Cloud onboarding, campaign delivery, webhook, and status testing.
- Database-backed probe execution when the configured development database is
  reachable.

## Related documentation

- [Cloud API setup and test guide](whatsapp-cloud-api-setup-and-test-guide.md)
- [WhatsApp operations runbook](whatsapp-operations-runbook.md)
- [Phase 8 record](../../.scratch/ganatri-standalone-whatsapp/phase-8.md)
- [Phase 9 record](../../.scratch/ganatri-standalone-whatsapp/phase-9.md)
- [Feature specification](../../.scratch/ganatri-standalone-whatsapp/spec.md)
