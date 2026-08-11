# WhatsApp worker

This is the isolated Baileys worker for store-owned WhatsApp sessions.

The worker is intentionally separate from the Ganatri API. It owns Baileys
connections, QR lifecycle, reconnect handling, and encrypted auth state. The
API owns account scope, authorization, durable account status, and the
operator-facing linking endpoint.

## Runtime

- Node.js 20 or newer
- @whiskeysockets/baileys 6.7.18, pinned until an explicit upgrade review
- A private, durable directory for WHATSAPP_AUTH_STATE_DIRECTORY

Run the worker only on a private network. If the API is in another container,
set WHATSAPP_WORKER_HOST=0.0.0.0 and restrict the worker port to the API and
operator network with the deployment firewall.

WHATSAPP_WORKER_TOKEN must match the backend value. Generate
WHATSAPP_AUTH_ENCRYPTION_KEY with a secrets manager or a cryptographically
secure random generator; never commit it or print it in logs.

The current phase supports account linking, QR/status polling, reconnect, and
disconnect. Sending invoices and receiving conversations are deliberately
wired in later phases.
