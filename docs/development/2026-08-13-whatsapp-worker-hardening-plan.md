# WhatsApp Worker Production Hardening Plan

Status: Implemented through deterministic local verification; controlled WhatsApp
staging verification, migration execution, and production rollout remain.
Date: 2026-08-13
Scope: `apps/whatsapp-worker`, its authenticated backend adapter, shared WhatsApp contracts, and worker-facing tests.

Update — 2026-08-14

The current implementation also includes the Admin/POS account-linking status
flow, QR polling and recovery states, country-aware phone normalization, sale
invoice text/PDF delivery, and native worker media sends. The worker's checked-in
development configuration keeps `WHATSAPP_SYNC_FULL_HISTORY=false`; realtime
events remain enabled, while history replay is an explicit operator choice.

The phone-normalization migration is committed at
`apps/backend/db/migrations/20260813110000_normalize_phone_numbers.sql` but has
not been executed against the target database. The latest focused verification
passed 19 WhatsApp/backend/worker tests, the workspace production build, the
web TypeScript check, and `git diff --check`. These checks do not replace a
controlled real-device QR, reconnect, send, and delivery test.

## Objective

Make the Baileys worker safer to operate at production scale: live customer
messages and receipts remain responsive during history work, outbound sends are
ordered and rate-limited per account, provider events survive transient
failures, history work is bounded, sensitive data stays private, and the core
behaviour is covered at public seams.

The worker remains an unofficial WhatsApp Web connector. No implementation can
guarantee that WhatsApp will never restrict an account.

## Top 10 engineering standards

1. **Explicit contracts:** validate every worker/API payload at the seam and use
   narrow domain types instead of unbounded objects.
2. **Deep modules:** keep Baileys details inside the provider adapter; callers
   should depend on small interfaces and stable normalized results.
3. **Single responsibility:** connection lifecycle, event normalization,
   delivery, history pagination, and dispatch scheduling must have separate
   responsibilities.
4. **Dependency injection:** time, provider sockets, API clients, and storage
   adapters must be replaceable in tests.
5. **Durability and idempotency:** retries must be safe, provider IDs must be
   unique, and a worker restart must not silently lose accepted work.
6. **Bounded work:** every queue, retry loop, media download, history request,
   and concurrency setting must have an explicit limit and timeout.
7. **Security and privacy:** never log QR values, auth state, keys, message
   bodies, PDFs, tokens, or full phone numbers; encrypt session state at rest.
8. **Observable operations:** expose useful counters, latencies, queue age,
   reconnect reasons, and failure categories without sensitive payloads.
9. **Public-seam tests:** test behaviour through provider/API/queue interfaces,
   with deterministic fakes; do not test private implementation details.
10. **Small, reviewable changes:** each phase has one acceptance boundary,
    focused checks, documentation, and a clean diff before the next phase.

## Non-goals

- Marketing, broadcasts, groups, campaigns, or bulk messaging.
- Circumventing WhatsApp policy or account restrictions.
- Replacing the existing encrypted auth-state implementation.
- Removing the backend sync endpoint in this hardening pass; it remains an
  internal recovery capability even though the inbox button is removed.

## Phases and acceptance gates

### Phase 0 — Baseline and contracts

- Record current worker commands, test count, build output, and known limits.
- Define normalized event, receipt, history-page, retry, and queue contracts.
- Keep the inbox UI free of manual Sync controls.

Gate: worker typecheck/build and full tests pass; no sensitive logs are found.

### Phase 1 — Live-event priority and bounded history

- Keep realtime message processing independent from history processing.
- Limit each explicit history request to one bounded page and one timeout.
- Prevent duplicate sync requests per account.
- Add deterministic tests for live-message priority, history timeout, duplicate
  suppression, and LID/phone normalization.

Gate: a history burst cannot prevent a realtime inbound message or receipt from
being submitted; every history operation terminates within its configured bound.

### Phase 2 — Durable provider-event ingestion

- Add an account-scoped provider-event inbox or equivalent durable retry record.
- Make event acceptance idempotent by account and provider message ID/event key.
- Retry transient backend failures with bounded backoff and move exhausted work
  to an observable dead-letter state.
- Cover restart/replay/duplicate scenarios at the repository/service seam.

Gate: an accepted provider event is recoverable after worker restart and is
stored at most once in the conversation model.

### Phase 3 — Per-account outbound scheduler

- Replace unconstrained parallel sends with a per-account queue and rate limit.
- Preserve ordering for one account while allowing independent accounts to
  progress concurrently.
- Add cancellation, lease visibility, retry classification, and queue limits.
- Keep durable database outbox ownership in the backend.

Gate: one account cannot burst beyond its configured send policy, one account’s
slow send does not block another account, and retrying never duplicates a bill.

### Phase 4 — Receipt and message-state reliability

- Normalize all Baileys delivery/read/play statuses in one module.
- Buffer or retry receipts that race message persistence.
- Preserve monotonic state transitions: read cannot regress to delivered.
- Add tests for receipt-before-message, duplicate receipts, and reply-after-send.

Gate: a read receipt is eventually reflected as `read` when the API is
available; a temporary race does not permanently leave the message at
`delivered`.

### Phase 5 — Resource limits and failure isolation

- Cap media downloads before buffering and reject oversized attachments safely.
- Bound event queues, history anchors, request bodies, and retry memory.
- Add per-account socket lifecycle isolation and explicit shutdown/drain rules.
- Classify provider errors into retryable, permanent, and authentication states.

Gate: a large document, slow API, malformed event, or failing account cannot
exhaust worker memory or stop unrelated accounts.

### Phase 6 — Observability and operational tooling

- Add metrics for event lag, history pages, receipt outcomes, queue depth,
  send latency, reconnects, decrypt failures, and dead letters.
- Add structured correlation IDs for account operation and provider message
  flow, with masked identifiers only.
- Document health checks, safe restart, replay, dead-letter inspection, and
  session recovery in the worker runbook.

Gate: an operator can distinguish connection, provider, API, queue, and data
problems from logs and metrics without inspecting message content.

### Phase 7 — Coverage and quality closeout

- Add public-seam tests for every worker state transition and failure class.
- Add property/table tests for status monotonicity, retry bounds, JID mapping,
  and queue isolation.
- Run focused tests, all tests, worker/backend/web typechecks, production
  builds, migration checks, and `git diff --check`.
- Perform a standards/spec review and record remaining external-test limits.

Gate: all tests pass; changed worker modules have meaningful branch coverage;
no unbounded loops, sensitive logs, or unclassified network failures remain.

## Verification commands

```bash
bun run --cwd apps/whatsapp-worker typecheck
bun run --cwd apps/whatsapp-worker build
bun test apps/whatsapp-worker packages/types
bun test
bun run --cwd apps/backend build
./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json
git diff --check
```

“Fully tested” means all deterministic code paths and failure classes are
covered in-repository. A real WhatsApp device, network outage, account
restriction, and provider-side history response still require controlled
staging verification and cannot be proven by local tests alone.

## Verification record — 2026-08-13

- Full suite: `256 pass`, `0 fail`, `915 expect()` calls across 36 files.
- Worker focused tests: `7 pass`, `0 fail` for metrics, per-account scheduling,
  and receipt normalization.
- Worker typecheck and production build: passed.
- Backend production build: passed.
- Web TypeScript check: passed.
- `git diff --check`: passed.
- Dev database migration `20260813100000_create_whatsapp_provider_events.sql`:
  applied successfully; no pending migrations were reported at application
  time.

The remaining verification boundary is controlled staging with a real linked
WhatsApp account. Local tests cannot prove provider-side delivery, history
availability, account restrictions, or device/network reconnection behaviour.
