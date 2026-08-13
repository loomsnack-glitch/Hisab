# WhatsApp worker

This is the isolated Baileys worker for store-owned WhatsApp sessions.

The worker is intentionally separate from the Ganatri API. It owns Baileys
connections, QR lifecycle, reconnect handling, and encrypted auth state. The
API owns account scope, authorization, durable account status, and the
operator-facing linking endpoint.

## Runtime

- Node.js 20 or newer
- baileys@7.0.0-rc14, pinned until an explicit upgrade review
- A private, durable directory for WHATSAPP_AUTH_STATE_DIRECTORY

Run the worker only on a private network. If the API is in another container,
set WHATSAPP_WORKER_HOST=0.0.0.0 and restrict the worker port to the API and
operator network with the deployment firewall.

WHATSAPP_WORKER_TOKEN must match the backend value. Generate
WHATSAPP_AUTH_ENCRYPTION_KEY with a secrets manager or a cryptographically
secure random generator; never commit it or print it in logs.

The current implementation supports account linking, QR/status polling,
reconnect, disconnect, encrypted auth-state recovery, invoice text/PDF sends,
native image/document sends, provider-event delivery, and bounded outbox
dispatch. The worker runs with Node, not Bun; the development script uses Bun
only to rebuild the Node-targeted bundle.

Build and run the worker:

```bash
bun run --cwd apps/whatsapp-worker build
cd apps/whatsapp-worker
node --env-file=.env dist/index.js
```

For development with automatic Node restarts, use
`node --env-file=.env --watch dist/index.js` after rebuilding. In production,
run the same Node command under PM2 and keep port `8100` private.

`WHATSAPP_SYNC_FULL_HISTORY=false` is the checked-in default. Realtime events
remain enabled, while full history synchronization is an explicit operator
choice for recovery testing.

For the current POS/Admin flow, use the WhatsApp operations runbook:
`docs/development/whatsapp-operations-runbook.md`.
