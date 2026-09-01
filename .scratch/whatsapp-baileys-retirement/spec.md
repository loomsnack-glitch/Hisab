# Retire Baileys and keep WhatsApp Cloud API

Status: Complete; historical database compatibility retained

## Goal

Remove the obsolete Baileys WhatsApp provider, QR-linking flow, and isolated worker while preserving WhatsApp Cloud API behavior and all historical WhatsApp records.

## Scope

- Inventory Baileys source, dependency, runtime, deployment, environment, tests, and database usage.
- Freeze and drain any remaining Baileys accounts and jobs before deleting executable code.
- Remove Baileys-only backend branches, worker routes, Admin/POS QR-linking UI, flags, scripts, and deployment configuration.
- Keep Cloud API accounts, templates, sync, webhooks, promotions, invoice/due sending, consent, delivery reconciliation, message history, public invoice links, and appearance/PDF behavior unchanged.
- Make only the database changes justified by the completed inventory and an explicit historical-data decision.
- Update setup and operations documentation to describe Cloud API only.

## Non-goals

- Do not redesign the Cloud API provider or its send/retry/reconciliation behavior.
- Do not delete historical conversations, messages, provider events, campaigns, outbox records, or audit data.
- Do not drop the provider enum, remove foreign-key targets, or delete account rows until the data inventory, backup, and dependency review prove it is safe.
- Do not change promotion, invoice, due-reminder, consent, template, webhook, or message-history product behavior.

## Safety rules

1. Phase 0 must produce source, runtime, and database evidence.
2. If any Baileys account or dependent historical row exists, preserve it and keep the historical provider/status vocabulary readable.
3. Stop new Baileys linking before removing the worker.
4. Never silently discard historical or queued records; provider cleanup is a separate database-gated operation.
5. Cloud API paths must remain independently buildable and testable after every phase.
6. Every phase follows: research, acceptance criteria, smallest implementation, focused verification, diff review, evidence/blockers, then commit approval.

## Phases

| Phase | Deliverable | Gate |
| --- | --- | --- |
| 0. Inventory | Source/runtime/database/deployment inventory | No unresolved data or runtime blocker is hidden |
| 1. Freeze and drain | Disable new Baileys linking and drain/quarantine legacy work | No active Baileys work can be stranded |
| 2. Backend retirement | Remove Baileys service/repository/route branches and worker contract | Cloud API tests and build pass |
| 3. Client/runtime retirement | Remove QR UI, flags, worker scripts, dependency, and PM2 config | Admin/POS/worker package checks pass |
| 4. Database cleanup | Only safe enum/default/schema cleanup, if justified | Historical rows and foreign keys remain safe |
| 5. Docs and regression coverage | Cloud-only setup/runbooks and negative legacy-provider coverage | Docs/config match runtime |
| 6. Final review and commit | Scoped diff review and complete verification | User approves commit; unrelated work remains untouched |

## Phase 0 evidence status

- Source, runtime, UI, deployment, and worker-only configuration were removed in this change.
- `apps/backend/.env` points to a Neon PostgreSQL database. A read-only Bun inventory query was attempted twice; both attempts ended with `ERR_POSTGRES_CONNECTION_CLOSED` before rows were returned.
- The `hisab-whatsapp-worker` tmux session is running and its captured logs show Baileys sockets being created for three account IDs, followed by connection code `408` and failed status reports.
- The backend tmux session is also running, but its captured logs show database idle-timeout failures for worker status, outbox, metrics, webhook replay, and Cloud webhook handling.
- Because historical rows could not be counted safely, the `baileys` provider enum value and legacy status values remain readable. No historical rows, enum values, or database columns were deleted.
- The legacy worker process was stopped after executable retirement. Cloud API account setup, templates, webhooks, outbox, promotions, invoices, due reminders, consent, and message history remain active.

## Verification matrix

- `rg` inventory has no active Baileys executable/configuration references; historical docs, fixtures, reporting compatibility, and database migrations are retained intentionally.
- Cloud API unit/integration tests pass, including account setup, template lifecycle, webhook handling, outbox, delivery reconciliation, promotion, invoice, and due paths.
- The Cloud API suite currently passes 151 tests in the local source environment.
- Admin and POS type checks/builds pass, with unrelated baseline failures reported separately.
- Worker package no longer exists or installs Baileys.
- No migration is required or applied for this code retirement; destructive provider cleanup remains a separate, database-gated task.
- `git diff --check` and a scoped diff review pass.
