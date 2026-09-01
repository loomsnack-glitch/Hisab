# Phase 1 — Freeze new Baileys linking and drain legacy work

Status: complete (compatibility-preserving retirement)

Type: task

## Objective

Prevent new Baileys usage and safely finish, quarantine, or explicitly migrate any remaining legacy work.

## Acceptance criteria

- [x] New Baileys account linking and worker mutations were removed from backend and clients.
- [x] Obsolete worker flags and credentials were removed from runtime configuration.
- Existing Cloud API account setup and sending remain available.
- [x] Every unknown historical account/outbox row is preserved; no row was deleted or rewritten.
- [x] No pending record is silently dropped by the code change; legacy dispatch code was removed only after the freeze and remains a separate data-gated concern.
- [x] Runtime evidence shows the worker is no longer part of in-scope Cloud traffic.
- [x] Admin lint, Admin build, backend build, the focused linking-flag regression test, and the Cloud API test suite pass.

## Implementation evidence

- `WHATSAPP_BAILEYS_LINKING_ENABLED` and `VITE_WHATSAPP_BAILEYS_LINKING_ENABLED` were removed with the retired linking paths.
- The legacy worker was stopped after backend/client executable paths were removed.
- Database status/outbox inventory remains unavailable because the configured connection closes or times out on the slow network.
- `bun test src/modules/tenant/whatsapp/cloud-api` passes 151 tests, covering Cloud onboarding, account provisioning, templates, outbound sends, webhooks, consent, and reconciliation.
- `bun run build` passes in both `apps/admin` and `apps/backend`.

## Gate

The freeze and executable retirement slice is complete. Historical data remains intact; any future provider-row cleanup requires a verified database inventory and a separate migration decision.
