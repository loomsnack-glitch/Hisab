# WhatsApp Cloud API operations runbook

This runbook covers the supported WhatsApp transport: Meta WhatsApp Cloud API.
The backend owns account configuration, template operations, webhooks, durable
outbox dispatch, retries, delivery reconciliation, message history, invoices,
due reminders, and promotions. The retired QR/Baileys worker, port `8100`, and
worker PM2 process are not part of this system.

## Local development

Start the repository development processes using the normal project workflow:

```bash
bun run dev
```

The backend sends Cloud API requests directly. No separate WhatsApp worker,
worker token, QR session, or auth-state directory is required.

For a local Cloud API test, configure the backend environment using
[the Cloud API setup and test guide](whatsapp-cloud-api-setup-and-test-guide.md).
Use a test WABA, phone number ID, access token, webhook verification token, and
public HTTPS callback URL. Never commit those values.

## Database migrations

Run migration commands from `apps/backend` with the intended backend
environment loaded:

```bash
bunx dbmate status
bunx dbmate up
bunx dbmate status
```

Record the target environment and final status for every deployment. Do not
delete WhatsApp accounts, conversations, messages, provider events, outbox
rows, or historical provider/status values as part of a code-only retirement.

## Health and diagnostics

Use the backend process and application logs as the source of truth. Inspect:

- Cloud account configuration and the latest provider status in Admin.
- Template status and Meta rejection details in the template screen.
- Webhook delivery, signature/verification failures, and provider event status.
- Outbox state, retry count, `last_error`, provider message ID, and delivery
  status in message history.
- Database connectivity and migration status before treating a queue issue as a
  provider issue.

Do not log message bodies, full phone numbers, access tokens, webhook secrets,
invoice contents, or signed public-invoice URLs.

## Queued or failed messages

1. Confirm the Cloud account is configured for the intended Store and has a
   current access token, phone number ID, and WABA.
2. Inspect the outbox row and backend error, including the provider code when
   available.
3. For template sends, verify the exact approved Meta template name, language,
   category, parameter count, variable mapping, media header, and button data.
4. For a `24-hour` policy or consent failure, do not retry blindly; verify the
   customer consent and conversation eligibility rules.
5. For transient `5xx`, rate-limit, or network failures, let the backend retry
   according to its durable outbox policy.
6. For a permanent Meta `4xx`, correct the account/template/input problem first,
   then use the product retry action only when the resulting message is safe to
   resend.

Never mark a message sent manually and never create a duplicate outbox row to
work around an unknown status. Reconcile using the provider message ID and
the existing message-history record.

## Webhook troubleshooting

Check these in order:

1. The public callback URL reaches the backend route and returns the expected
   verification response.
2. The verify token and app configuration match the backend environment.
3. The webhook request is signed with the configured app secret and is not
   being altered by the reverse proxy.
4. The backend can reach PostgreSQL before replaying provider events.
5. The provider event is deduplicated by account and provider message ID and
   its processing error is visible in the event record.

Use ngrok or another tunnel only for local development. Keep the tunnel URL
stable while the webhook is configured, and do not expose internal worker ports.

## Account and template changes

Manage Cloud accounts and approved templates in Admin. A template must be
approved by Meta before it is used for customer sends. Updating a local draft
does not change an already submitted Meta template; submit a new revision when
the provider requires it and map variables explicitly.

When changing a phone number or account, verify the new Cloud phone number ID,
WABA, token, assigned Store, approved templates, webhook subscriptions, and a
single controlled test message before resuming normal traffic.

## Historical data and retired provider values

Historical records may contain the retired provider/status vocabulary. Keep
those values readable for reporting and message history. Provider cleanup is a
separate, database-gated operation requiring an inventory, backup, dependency
review, and an explicit migration decision.
