# 01 — Google account connection and status card

**What to build:** An authenticated Ganatri Admin user can connect one Google account to their Organization through Google OAuth and see a compact Google Contacts Sync Status card showing the safe account identity and connection state. The connection is Organization-owned, protected, and unavailable to Ganatri POS.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] An authorized Ganatri Admin user can start and complete a state-validated Google OAuth connection flow, while unauthorized users, other Organizations, and Store Devices cannot.
- [x] An Organization has at most one protected Google Contacts Connection; its access and refresh credentials are encrypted at rest and never appear in API responses, logs, or the Admin UI.
- [x] Ganatri Admin shows disconnected, connecting, connected, and reconnect-required states with the safe identity of the connected Google account.
- [x] Ganatri POS offers no Google Contacts settings or connection-management API path.
- [x] Focused route, service, OAuth, authorization, and Admin behavior tests prove the observable connection and status behavior.

## Answer

Implemented the Organization-scoped Google Contacts Connection, state-validated OAuth flow, encrypted credential vault, safe status contract/card, and Admin-only routes. OAuth attempts now use a persisted nonce hash so retries supersede abandoned attempts while stale callbacks cannot replace a connection or revoke its active credential.
