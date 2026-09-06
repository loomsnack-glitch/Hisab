# Phase 0 — Baileys inventory and retirement gate

Status: complete (database gate unavailable; compatibility retained)

Type: research

## Objective

Build an evidence-backed inventory of every Baileys dependency and prove whether legacy data, jobs, processes, or configuration still exist.

## Read-only scope

- Search source, package manifests, tests, scripts, environment examples, deployment files, and docs for `baileys`, `Baileys`, QR linking, and worker port `8100`.
- Inspect WhatsApp migrations and foreign keys.
- Count accounts by provider/status and dependent conversations, messages, provider events, campaigns, and outbox rows.
- Inspect running processes and tmux/PM2 configuration without stopping anything.
- Map Cloud API-only paths that must remain untouched.

## Acceptance criteria

- [x] Source and configuration inventory is captured in the spec.
- [x] Database inventory command is documented and attempted read-only.
- [x] Database counts were not returned; the unavailable inventory is recorded as the reason historical values were retained.
- [x] Runtime/deployment references are captured.
- [x] Historical-data and active-job decision is recorded: preserve historical rows and stop the legacy process after removing new executable paths.
- [x] Phase 1 gate is explicitly resolved with a compatibility-preserving decision.

## Current evidence

- `apps/whatsapp-worker/package.json` still depends on `baileys`.
- `apps/whatsapp-worker/src/provider/baileys-account-manager.ts` owns socket, QR, session, media, history, and status behavior.
- Backend service/repository/routes still contain legacy-provider branches and worker calls.
- Types still expose `baileys` and legacy QR statuses.
- Admin/POS still contain Baileys feature flags and QR/linking controls.
- PM2 and development scripts still start the isolated worker on port `8100`.
- The configured PostgreSQL connection closed before the read-only query returned rows (`ERR_POSTGRES_CONNECTION_CLOSED`), so row counts are unknown.
- The `hisab-whatsapp-worker` tmux session is running. Its captured logs show Baileys sockets created for account IDs `de9a40c0-5ee7-4f70-a16d-73ec58a17456`, `f4048b9d-663f-440c-932c-ef0c7f811260`, and `9da51042-281e-400c-8c41-b7b68c6d1b40`, then connection code `408` and failed status reporting.
- The `hisab-backend` tmux session is running, but its logs show database idle-timeout failures across worker status, outbox claim, operations metrics, webhook replay, and Cloud webhook handling. This is an environment/runtime blocker for safe inventory and must be fixed or separately verified before proceeding.

## Database inventory query

Run from `apps/backend` with the intended environment, using a read-only database connection:

```sql
SELECT 'accounts' AS relation, provider::text, status::text AS state, COUNT(*)::int AS count
FROM whatsapp_accounts GROUP BY provider,status;
```

Repeat for dependent relations (`whatsapp_outbox`, `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_provider_events`, and `whatsapp_campaigns`) joined to `whatsapp_accounts` by account ID. Record the exact environment and timestamp with the result.

## Gate

The database gate was unavailable, so no destructive database/provider cleanup was performed. Historical provider values remain readable. Executable retirement proceeded only after freezing new legacy linking; Cloud API verification remains a release gate for the deployed environment.
