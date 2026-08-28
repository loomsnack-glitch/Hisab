# WhatsApp Cloud invoice links

This runbook covers bill/invoice and due-reminder templates only. Promotion
templates use a separate workflow.

## Required backend configuration

Set these values in `apps/backend/.env`:

```dotenv
BASE_PATH=/api
WHATSAPP_CLOUD_CALLERS_ENABLED=true
WHATSAPP_CLOUD_OUTBOX_ENABLED=true
WHATSAPP_PUBLIC_INVOICE_LINK_SECRET=<at-least-32-random-characters>
WHATSAPP_PUBLIC_INVOICE_BASE_URL=https://api.example.com/api/public/whatsapp/invoices
```

`WHATSAPP_PUBLIC_INVOICE_LINK_SECRET` must stay backend-only. The base URL must
be HTTPS, publicly reachable by the customer's phone, and include the backend
base path when the reverse proxy does not add it. The public page has no login;
the token is the access credential.

## Database migration

From `apps/backend`, verify the configured database first:

```bash
bunx dbmate --no-dump-schema -d db/migrations status
```

Apply pending migrations during the normal deployment window:

```bash
bunx dbmate --no-dump-schema -d db/migrations up
```

The invoice-link migration creates one link record per organization, Store,
and sale. Links do not expire in this release. An authorized operator can
revoke one with:

```text
POST /api/organizations/:organizationId/stores/:storeId/whatsapp/invoice/:saleId/public-link/revoke
```

Revocation immediately makes both the HTML page and PDF endpoint return 404.
Generating the link again for the same sale restores it with fresh token
material.

## Meta template setup

Create or edit the template through the Admin Cloud template manager. Use:

- kind: `bill` for invoices or `due_reminder` for outstanding bills;
- category: `UTILITY`;
- an approved body with the local tokens supported by that kind;
- a dynamic URL button whose URL contains one Meta placeholder, for example
  `https://api.example.com/api/public/whatsapp/invoices/{{1}}`.

After Meta approves the revision:

1. run **Sync templates** if the status webhook has not arrived;
2. verify the provider status is `approved` and the local mapping is valid;
3. explicitly choose **Set as default** for the Store, Cloud account, kind,
   and language;
4. send a test invoice or due reminder for a completed sale.

The previous approved default remains active while a new revision is pending.
Legacy approved templates without a dynamic URL button remain compatible: an
invoice document header continues to use the existing generated PDF path.
New dynamic-button templates use the public page and do not attach a PDF.

## What the customer receives

The URL opens `/public/whatsapp/invoices/:token`, which shows the current sale
and payment state, outstanding balance, line items, totals, masked phone
number, PDF download, and configured review/social links. It escapes displayed
text and does not expose internal UUIDs, credentials, secrets, or the full
phone number. A logo is not currently rendered because the organization/store
data model has no public logo URL field.

The page loads the sale at request time, so later payments change the shown
balance without sending a new message.

## Troubleshooting

- **Link creation failed:** check the HTTPS base URL, a 32+ character secret,
  the migration, and backend logs. The message is not queued when link creation
  fails.
- **Template is pending/rejected/paused/disabled:** do not assign it as the
  default. Sync and inspect the provider reason, then create a new revision if
  Meta requires a content change.
- **Parameter count or mapping error:** compare the approved Meta placeholders
  with the local token mapping. Do not manually add provider JSON or bypass the
  server mapping check.
- **Old template has no URL button:** this is expected; it uses the legacy PDF
  document path. It does not require public-link configuration.
- **Public page returns 404:** the token is invalid, the link was revoked, the
  sale is not completed, or the account is reading a database where the
  migration/link row does not exist.

## Verification boundary

Local tests verify token handling, HTML escaping, masking, mapping, and queue
admission. They cannot prove Meta approval, webhook delivery, provider access,
customer delivery, reverse-proxy routing, or execution of a migration against
the production database. Verify those separately with one controlled test
message and the provider delivery status.
