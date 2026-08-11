# WhatsApp operations runbook

This runbook covers the Phase 6 worker and outbox safety boundary. It is a
recovery procedure, not evidence that production backups or a live pilot have
been executed.

## Worker partitioning

Run every worker replica with the same `WHATSAPP_WORKER_PARTITION_COUNT` and a
unique zero-based `WHATSAPP_WORKER_PARTITION_INDEX`:

```text
WHATSAPP_WORKER_ID=whatsapp-worker-0
WHATSAPP_WORKER_PARTITION_COUNT=2
WHATSAPP_WORKER_PARTITION_INDEX=0
WHATSAPP_WORKER_DISPATCH_CONCURRENCY=2
WHATSAPP_MAX_PENDING_OUTBOX_PER_ACCOUNT=1000
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
  processing, retryable, dead-letter, oldest queued age, and account counts.

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

## Restart and queued-work recovery

1. Stop the worker with `SIGTERM` and allow the configured shutdown timeout.
2. Confirm `/health` is no longer serving and the process has exited.
3. Keep the encrypted `WHATSAPP_AUTH_STATE_DIRECTORY` volume intact.
4. Start a worker with the same partition count and index.
5. Confirm account reconciliation reports the expected partition account
   count and connected accounts reconnect.
6. Confirm pending/retryable outbox rows are claimed after lease expiry and
   inspect dead-letter counts before replaying any messages.

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
