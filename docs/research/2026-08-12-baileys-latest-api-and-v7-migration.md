# Baileys Latest API and v7 Migration Research

Date: 2026-08-12
Repository: Ganatri/Hisab
Scope: `apps/whatsapp-worker`

## Decision

Use the latest Baileys v7 release candidate in a dedicated migration phase,
not as an unreviewed dependency bump. At research time, both the official
`baileys` package and the existing `@whiskeysockets/baileys` package resolve to
`7.0.0-rc14`; the legacy dist-tag resolves to `6.7.24`.

The worker currently uses `@whiskeysockets/baileys@6.7.18`. The production
upgrade must first preserve the existing encrypted auth-state directory,
compile the adapter against v7, and validate one real linked account before
any wider rollout.

## Findings from the official API reference

- `makeWASocket` remains the central socket factory and exposes the event
  emitter plus operations such as `sendMessage`, `requestPairingCode`,
  `logout`, and `fetchAccountReachoutTimelock`.
- Baileys requires an authentication state and emits `creds.update`; the
  application must persist credential changes.
- The official documentation discourages using `useMultiFileAuthState` in
  production and recommends an application-owned auth-state implementation.
  Hisab already uses an encrypted custom auth-state adapter, so that boundary
  should remain intact.
- The v7 API is ESM-oriented. The adapter must verify the v7 import shape,
  exported types, socket configuration, event payloads, and message content
  types instead of assuming v6 compatibility.
- The API reference exposes account-restriction state through
  `fetchAccountReachoutTimelock`; this is useful for a future operator health
  check, but the migration phase must not automatically send or retry messages
  based on an unverified interpretation of that state.

## Required migration work

1. Pin one package identity and version: `baileys@7.0.0-rc14` or the official
   scoped equivalent, never both in the worker dependency graph.
2. Keep `apps/whatsapp-worker/data/` local-only and preserve it during the
   upgrade. Do not silently delete or regenerate linked-account credentials.
3. Update the provider adapter for v7 exports and types, including socket
   creation, connection updates, message updates, inbound message parsing,
   text sending, document sending, and disconnect reason mapping.
4. Keep the custom encrypted auth state and verify credentials are still saved
   and loaded after restart.
5. Replace direct dependency logging that can print libsignal session objects;
   no private keys, ratchets, auth state, message bodies, phone numbers, or QR
   values may reach stdout/stderr.
6. Run focused tests, worker typecheck, Node-targeted production build, and a
   controlled one-account link/reconnect/send test before changing the rollout
   version.

## Risks and constraints

- v7 introduces breaking changes; the upstream repository explicitly says to
  follow its migration guidance and use the release at one's own discretion.
- The latest v7 package is a release candidate, not a final v7 release. The
  stable legacy line is safer for an immediate production hotfix, but it does
  not satisfy the request to use the latest API.
- A dependency upgrade may update `bun.lock`; that is expected and must be
  reviewed as part of the dependency change.
- Existing linked sessions may require a controlled reconnect or relink if the
  new protocol/auth behavior cannot consume the stored state. This must be an
  explicit recovery step, never an automatic destructive cleanup.
- Baileys remains an unofficial WhatsApp Web connector. No phase may claim
  that account restrictions or bans are impossible.

## Sources

- [Baileys API reference overview](https://baileys.wiki/api-reference/overview)
- [Baileys API documentation](https://baileys.wiki/docs/api/)
- [Baileys socket configuration](https://baileys.wiki/docs/socket/configuration/)
- [Baileys connection/auth documentation](https://baileys.wiki/docs/socket/connecting/)
- [Baileys `makeWASocket` API](https://baileys.wiki/docs/api/functions/makeWASocket/)
- [Official Baileys repository and v7 breaking-change notice](https://github.com/WhiskeySockets/Baileys)
- [Official Baileys releases](https://github.com/WhiskeySockets/Baileys/releases)
- [Official security advisory](https://github.com/WhiskeySockets/Baileys/security/advisories/GHSA-qvv5-jq5g-4cgg)

## Local verification evidence

Commands run on 2026-08-12:

```text
npm view baileys version dist-tags --json
=> version 7.0.0-rc14; latest 7.0.0-rc14; legacy 6.7.24

npm view @whiskeysockets/baileys version dist-tags --json
=> version 7.0.0-rc14; latest 7.0.0-rc14; legacy 6.7.24
```
