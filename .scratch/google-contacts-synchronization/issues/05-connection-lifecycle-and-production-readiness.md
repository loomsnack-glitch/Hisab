# 05 — Connection lifecycle and production readiness

**What to build:** An Admin user can reconnect, disconnect, or replace the Organization's Google account safely, and the integration is ready for production OAuth operation without retaining or damaging Contacts in an old account.

**Blocked by:** 01 — Google account connection and status card; 02 — Initial Google Contacts catch-up sync.

**Status:** ready-for-agent

- [ ] Reconnect restores a reconnect-required connection through the same protected OAuth flow and resumes eligible sync work.
- [ ] Disconnect immediately disables future synchronization and local usable authorization while leaving every Google Contact untouched.
- [ ] Replacing the connected account leaves the old account untouched, establishes fresh linkage in the new account, and enables a new initial catch-up sync there.
- [ ] Obsolete outbox work cannot write to a disconnected or replaced account, and no connection-lifecycle action issues a Google Contact deletion.
- [ ] Production configuration/documentation covers verified redirect URIs, OAuth consent identity, required privacy/support details, and Google scope-verification readiness; lifecycle tests cover reconnect, disconnect, and replacement.
