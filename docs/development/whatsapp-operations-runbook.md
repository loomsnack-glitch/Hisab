# WhatsApp operations runbook

This runbook covers the worker, account-linking, invoice-delivery, and outbox
safety boundary. It is a recovery procedure, not evidence that production
backups or a live pilot have been executed.

The worker is a Node 20+ ESM service. Use the same Node major version for
development, builds, and deployment; the Baileys v7 package requires Node 20
or newer.

## Current local development flow

Run the API, web app, and worker together with the repository's development
orchestrator. The worker process itself must run under Node, not Bun, because
it is the Node-targeted Baileys service and owns the WebSocket connection.

```bash
bun run dev
```

The repository's worker development script uses Bun only to rebuild the
Node-targeted bundle; it starts the actual worker with Node. To run an already
built worker directly with Node:

```bash
cd apps/whatsapp-worker
node --env-file=.env --watch dist/index.js
```

Build the worker bundle when source changes with the existing repository build
task, then keep the runtime command above as Node:

```bash
bun run --cwd apps/whatsapp-worker build
```

For staging and production, run `node --env-file=.env dist/index.js` under PM2;
do not run `bun dist/index.js`.

For a store, open the Admin WhatsApp account screen to create or reconnect the
store account and scan the QR code. In POS, use the WhatsApp icon beside the
printer icon; the control opens the QR dialog in place and changes to green when
the worker reports `connected`. The POS WhatsApp route remains available for
later conversation work.

Before testing country-aware phone storage, apply pending backend migrations
from `apps/backend`:

```bash
bunx dbmate -d db/migrations up
```

The current phone migration is
`20260813110000_normalize_phone_numbers.sql`. Confirm its version appears in
the database's `schema_migrations` table before treating phone normalization as
database-verified.

## Worker partitioning

Run every worker replica with the same `WHATSAPP_WORKER_PARTITION_COUNT` and a
unique zero-based `WHATSAPP_WORKER_PARTITION_INDEX`:

```text
WHATSAPP_WORKER_ID=whatsapp-worker-0
WHATSAPP_WORKER_PARTITION_COUNT=2
WHATSAPP_WORKER_PARTITION_INDEX=0
WHATSAPP_WORKER_DISPATCH_CONCURRENCY=2
WHATSAPP_MAX_PENDING_OUTBOX_PER_ACCOUNT=1000
WHATSAPP_MINIMUM_SEND_INTERVAL_MS=750
WHATSAPP_MAX_MEDIA_BYTES=10485760
```

The API applies the partition to account reconciliation and outbox claims.
The database lease remains authoritative, so a temporary duplicate process
cannot concurrently send the same account's queued work.

## Health and diagnostics

- `GET /health` is a liveness snapshot with account, dispatch, and queue
  aggregates.
- `GET /health/ready` confirms the worker process is ready to receive work.
- `GET /metrics` requires the worker bearer token and returns Prometheus text.
- The API's authenticated internal operations metrics include pending,
  processing, retryable, dead-letter, oldest queued age, provider-event
  retry/dead-letter counts, and account counts.

Recommended alert rules for the deployment's metrics system:

```text
whatsapp_outbox_oldest_pending_age_seconds > 300
whatsapp_outbox_dead_letter > 0
whatsapp_worker_connected_accounts < whatsapp_api_connected_accounts
```

Route these alerts to the operator who owns the worker partition and include
the worker id and partition labels in the alert context.

Do not add message bodies, full phone numbers, QR values, auth keys, tokens, or
document contents to logs or metrics.

The worker also filters known libsignal session-dump messages because the
dependency can write those directly to `console.*`, bypassing the Baileys
logger. Do not disable that filter or add raw provider logging.

## Chat synchronization

Realtime customer messages and receipts are processed continuously by the
connected socket. The inbox does not expose a manual Sync button. The internal
account sync endpoint remains an operator recovery tool and performs one
bounded history page per request; repeat it deliberately when backfilling is
needed. It does not log out the account, delete encrypted auth state, or
require QR relinking.

`WHATSAPP_SYNC_FULL_HISTORY=false` is the checked-in development default. With
that value, full history events are intentionally ignored while realtime events
continue to work. Set it to `true` only for an explicit history-recovery test or
deployment, then restart the Node worker.

Provider message events are first recorded in the durable
`whatsapp_provider_events` inbox. The API replays pending and retryable events
periodically, deduplicated by account and provider message ID. Inspect the
event status and `last_error` in PostgreSQL before investigating a dead-letter
event; never replay a message by manually calling WhatsApp send operations.

## Restart and queued-work recovery

1. Stop the worker with `SIGTERM` and allow the configured shutdown timeout.
2. Confirm `/health` is no longer serving and the process has exited.
3. Keep the encrypted `WHATSAPP_AUTH_STATE_DIRECTORY` volume intact.
4. Start a worker with the same partition count and index.
5. Confirm account reconciliation reports the expected partition account
   count and connected accounts reconnect.
6. Confirm pending/retryable outbox rows are claimed after lease expiry and
   inspect dead-letter counts before replaying any messages.
7. Confirm pending/retryable provider events are replayed by the API process.

The API outbox is durable. A worker restart does not delete queued rows. An
expired processing lease is returned to retryable work by the next claim.

## Session-loss recovery

1. Mark the affected account's provider session as revoked/disconnected using
   the existing account control flow.
2. Preserve the account and conversation/message history; do not delete tenant
   records as a first response.
3. Preserve or restore the encrypted auth-state volume from the approved
   backup. If the state cannot be trusted, remove only that account's encrypted
   session directory after recording the incident.
4. Reconnect the account and complete QR linking through the admin account
   screen.
5. Verify the account status, one test invoice, one text message, and pending
   outbox/dead-letter counts before resuming normal traffic.

## Backup and restore requirements

Back up these boundaries independently and encrypt them at rest:

- PostgreSQL, including WhatsApp accounts, conversations, messages, and
  outbox rows.
- Private object storage containing invoice PDFs and inbound documents.
- The worker's encrypted auth-state volume.

Before a production pilot, record backup frequency, retention, restore owner,
restore-point objective, and a test restore result. Do not claim recovery
readiness from a backup configuration alone.

## Bounded capacity dry-run

The worker includes a provider-free partition harness:

```bash
bun run --cwd apps/whatsapp-worker load-test -- --accounts 50 --partitions 2
```

It reports partition distribution, runtime, and process-memory deltas without
creating accounts or sending messages. Real Baileys socket resource usage and
the final 50-account deployment size require a controlled pilot measurement.
