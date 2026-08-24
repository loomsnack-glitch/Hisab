# WhatsApp Cloud API Migration — Full Review

Date: 2026-08-22
Review mode: read-only; no source code, migrations, or Git history changed
Review range: `main...feat/whatsapp`
Review head: `2388a70 feat: gate Cloud WhatsApp rollout`
Primary specification: [`docs/development/2026-08-20-whatsapp-cloud-api-only-migration-plan.md`](../development/2026-08-20-whatsapp-cloud-api-only-migration-plan.md)

## Executive verdict

The branch contains a substantial, well-structured Cloud API code-first implementation, but it is **not production-ready and must remain disabled**.

The most important blocker is not Meta setup: the assembled backend runtime intentionally uses an `unavailableVault`. If the Cloud flags are enabled, real onboarding, template synchronization, and outbox dispatch cannot resolve credentials. The current tests pass because they inject an in-memory vault and therefore do not exercise the production assembly.

There are also correctness gaps that should be fixed before any controlled provider test:

- The database accepts `template` message/outbox enum values, but the shared public Zod schema still rejects them.
- A late provider `failed` status can turn an already delivered/read message's outbox and campaign recipient into `dead_letter` even though the message status remains delivered/read.
- Uncertain submissions enter `reconciling`, but there is no timeout, operator recovery, or reconciliation job for a missing provider status.
- Cloud account health projection can cast `suspended` into the legacy account-status enum, which does not contain `suspended`; `needs_action` also leaves the legacy status stale.
- Required production configuration is absent from `.env.example`, and frontend/backend Graph API versions can drift.
- The Admin UI has account, local template, link, and promotion screens, but no usable Cloud template sync/binding workflow, Cloud usage/safety screen, or consent-management workflow. It also displays a raw WABA ID despite the plan explicitly saying not to expose it in normal UI.

The branch is therefore in the correct high-level state—Cloud caller and outbox flags default off, Baileys/QR/port `8100` retained—but the plan must not be marked complete until the findings below and the external acceptance gates are closed.

## Scope and method

The review covered:

- the full branch diff from `main`;
- the migration plan, research notes, repository instructions, domain context, and ADRs;
- Cloud onboarding, credential boundaries, account persistence, template sync/binding, consent, admission, quota, outbox, dispatcher, webhook, delivery status, and caller migration;
- Admin service contracts and the WhatsApp organization page;
- migration constraints and cross-tenant/database invariants;
- focused tests, package/admin TypeScript checks, migration status, and whitespace validation.

The review used two axes required by the repository code-review workflow:

1. **Standards and architecture:** boundaries, authorization, secret/PII handling, transaction safety, idempotency, public contracts, and operational recovery.
2. **Specification correctness:** alignment with the Cloud migration plan, especially Phases 2–6, the simple Admin UI contract, and the requirement to keep Phase 7/Baileys retirement gated.

No live Meta WABA, production vault, production HTTPS webhook, private media store, target database audit, or controlled end-to-end provider run was available. Those are explicitly treated as open gates, not as passing evidence.

## Verification evidence

| Check | Result | Interpretation |
| --- | --- | --- |
| `bun test apps/backend/src/modules/tenant/whatsapp` | **124 pass, 0 fail, 272 expects** | Strong focused fixture coverage; does not prove live provider behavior or production assembly. |
| `tsc --noEmit -p packages/types/tsconfig.json` | **Pass** | Shared types compile, but the stale runtime enum contract is still a semantic defect. |
| `tsc --noEmit -p apps/admin/tsconfig.json` | **Pass** | Admin code compiles. |
| `bun --env-file=.env ../../node_modules/.bin/dbmate status` from `apps/backend` | **70 applied, 0 pending** | Local configured database is migrated; this is not evidence about another target database. |
| `git diff --check main...HEAD` | **Pass** | No whitespace errors in the reviewed branch diff. |
| Full backend TypeScript check | **Fails** | Existing repository-wide failures remain, including two WhatsApp test-contract errors; this is a separate baseline problem and prevents a clean repository-wide typecheck. |

The worktree also contains pre-existing untracked `apps/web/`; it was not inspected, changed, staged, or removed.

## Findings

### WAC-001 — P0 rollout blocker: the production runtime has no credential-vault implementation

**Evidence**

- `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-runtime.ts:16-45` defines an `unavailableVault` whose `store`, `resolve`, and `rotate` methods always throw `vault_unavailable`, then injects it into the live outbox dispatcher.
- `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-account.service.ts:74-114` injects the same unavailable vault into the default onboarding/refresh/revoke dependency graph.
- `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-template.service.ts:39-55` injects the same unavailable vault into template synchronization.
- `apps/backend/.env.example:36-43` documents that the Cloud outbox remains disabled until a real vault is configured, but no production vault adapter or assembly selection exists in the reviewed branch.

**Impact**

- Embedded Signup can reach server-side provisioning but cannot persist the provider credential through the real default dependency graph.
- Template synchronization cannot resolve the provider token.
- A queued Cloud outbox job is claimed, then credential resolution fails. The dispatcher can retry/dead-letter it, but no message can be sent.
- Unit tests do not catch this because they inject in-memory credential implementations.

**Required fix**

Implement and assemble the approved production secret-manager adapter, selected by deployment configuration, with an explicit startup/readiness check. Add an assembly test that imports the same default runtime path used by the server and proves that onboarding, template sync, and dispatch resolve through the configured vault. Keep the feature flags fail-closed when the adapter is missing.

**Release gate**

Do not enable `WHATSAPP_CLOUD_CALLERS_ENABLED` or `WHATSAPP_CLOUD_OUTBOX_ENABLED` until this is closed.

### WAC-002 — P1: shared message/outbox schemas do not accept the new `template` values

**Evidence**

- `packages/types/src/services/whatsapp.schema.ts:14-16` defines `WhatsAppMessageTypeSchema` as `text | document | image` and `WhatsAppOutboxKindSchema` as `invoice | text | document | promotion`.
- `apps/backend/db/migrations/20260822120000_add_whatsapp_cloud_template_enum_values.sql:3-4` adds `template` to both PostgreSQL enums.
- `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-outbox.repository.ts:16` explicitly handles `messageType: "template"`.
- `packages/types/src/services/whatsapp.schema.ts:218-237` uses `WhatsAppMessageTypeSchema` in `WhatsAppMessageDTOSchema`.

**Impact**

Cloud rows can be written with `message_type = 'template'` while the shared DTO parser and inferred TypeScript types cannot represent them. Any API response containing a Cloud template message can fail validation or be impossible for a client to render correctly. The outbox kind contract is similarly inconsistent with the database.

**Required fix**

Add `template` to both shared schemas and inferred types, define the expected UI rendering/attachment behavior, and add a DTO round-trip test using a real Cloud template message and outbox record.

### WAC-003 — P1: uncertain submissions have no durable reconciliation timeout or recovery path

**Evidence**

- `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-outbox.repository.ts:208-231` changes an uncertain job to `reconciling`, clears its lease, and leaves it there.
- `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-outbox.repository.ts:67-71` only claims `pending` and `retryable` rows; `reconciling` rows are never claimed again.
- The only normal completion path for `reconciling` is the matching provider status path in `apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.ts:1616-1630`.
- `apps/backend/src/index.ts:37-58` replays webhook receipts and dispatches ordinary outbox work, but no reconciliation sweep exists.

**Impact**

If Meta accepted a message but the POST response timed out and the corresponding webhook is delayed, dropped, misrouted, or permanently unavailable, the outbox remains `reconciling` indefinitely. The reserved quota remains held, the campaign recipient can remain processing, operators cannot safely determine whether to resend, and there is no bounded alert/dead-letter state.

**Required fix**

Define a durable reconciliation policy: age threshold, provider lookup/callback correlation, bounded retry, final operator action, quota settlement/release behavior, and duplicate-send protection. Add metrics and an admin/support action for “unknown submission” rather than silently leaving rows in a terminal-looking state.

### WAC-004 — P1: out-of-order failure side effects can contradict a delivered/read message

**Evidence**

- `apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.ts:1538-1574` preserves an existing `delivered`, `read`, or `failed` message status, but accepts the row update when `cloud_status_at` is not stale.
- `apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.ts:1576-1615` then checks the incoming argument (`status === "failed"`) rather than whether the message actually transitioned to failed or whether the outbox was still non-terminal.
- The side effect updates the outbox to `dead_letter`, releases quota, marks the campaign recipient dead-letter, and may mark the campaign failed.

**Impact**

A later or duplicated provider failure can produce this inconsistent state:

- message status: `delivered` or `read`;
- outbox: `dead_letter`;
- campaign recipient: `dead_letter`;
- quota: released;
- campaign: failed or failed count increased.

This makes customer-facing delivery history and operational accounting disagree.

**Required fix**

Make status application return whether a transition was accepted. Run failure side effects only when the accepted transition is actually `failed` and the outbox is not already terminal (`sent`, `dead_letter`, or `cancelled`). Add tests for failure after `delivered`, failure after `read`, duplicate failure, and stale failure timestamps.

### WAC-005 — P1: Cloud account health projection can fail or leave contradictory statuses

**Evidence**

- The Cloud enum includes `suspended` at `apps/backend/db/migrations/20260821180000_add_whatsapp_cloud_api_foundation.sql:5-14`.
- The legacy account enum is separate and does not contain `suspended`.
- `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-account.repository.ts:424-445` casts `suspended` to `whatsapp_account_status_enum` when updating `whatsapp_accounts.status`.
- The same method updates the legacy status only for `disconnected`, `suspended`, and `failed`; `needs_action` updates `cloud_status` but leaves the legacy account status unchanged.

**Impact**

- A suspended-health event can fail the transaction with an invalid enum value.
- A `needs_action` account can remain `whatsapp_accounts.status = connected` while the Cloud status says `needs_action`, causing different callers and screens to disagree.
- Error handling may repeatedly record failures without updating the state that gates dispatch.

**Required fix**

Define one explicit projection table/function from Cloud health to legacy compatibility status. Do not cast Cloud values into the legacy enum. Decide whether `needs_action` maps to `disconnected`, `failed`, or a new compatibility state, and make all account reads and dispatch gates use the same source. Add tests for every Cloud status, especially `needs_action`, `suspended`, and `revoked`.

### WAC-006 — P1: deployment configuration is incomplete and version drift is possible

**Evidence**

- Backend code requires `WHATSAPP_CLOUD_GRAPH_VERSION`, `WHATSAPP_CLOUD_APP_ID`, and `WHATSAPP_CLOUD_APP_SECRET` in `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-provider.ts:13-63`.
- Webhook routes require `WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN` and the app secret in `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-webhook.routes.ts:66-113`.
- Admin code requires `VITE_WHATSAPP_CLOUD_APP_ID` and `VITE_WHATSAPP_CLOUD_CONFIG_ID` and hardcodes SDK version `v23.0` at `apps/admin/src/pages/whatsapp-organization-page.tsx:47-77`.
- `apps/backend/.env.example:27-43` documents legacy `WHATSAPP_API_*`, Baileys worker settings, Cloud feature flags, media TTL, and onboarding state secret, but omits all of the required Cloud app, Graph, webhook, and frontend Embedded Signup variables.

**Impact**

An operator following the checked-in environment example cannot configure Cloud onboarding or webhook verification reliably. The backend Graph version and frontend SDK version can silently drift, and a deployment can appear healthy while Cloud onboarding fails only after a user clicks Connect.

**Required fix**

Add complete backend/admin environment examples and a deployment checklist. Centralize the supported Graph/SDK version decision or explicitly document why the values differ. Add startup validation/readiness output that names missing configuration without logging secrets.

### WAC-007 — P1: the Admin Cloud operator workflow is incomplete and violates the UI contract

**Evidence**

- `apps/admin/src/pages/whatsapp-organization-page.tsx:134-138` exposes only `Accounts`, `Templates`, and `Promotions` tabs.
- `apps/admin/src/pages/whatsapp-organization-page.tsx:557-568` renders local reusable links and local Bill/Due/Promotion template managers, but no Cloud template asset list, sync action, approval status, variable mapping, or Store-to-WABA binding editor.
- `packages/services/src/modules/tenant/whatsapp.service.ts:111-153` contains Cloud template sync and binding service calls, but there are no Admin call sites for them.
- `apps/backend/src/modules/tenant/whatsapp/whatsapp.routes.ts:159-223` exposes Cloud template and safety endpoints, but the Admin page has no Usage/Safety tab or quota policy controls.
- Consent endpoints exist in `packages/services/src/modules/tenant/whatsapp.service.ts:155-190`, but there is no reviewed Admin/POS consent-management UI call site.
- The page displays `WABA ${cloudSnapshot.wabaId}` at `apps/admin/src/pages/whatsapp-organization-page.tsx:489`, while the plan says not to expose raw WABA IDs or Phone Number IDs in normal UI.

**Impact**

An operator can connect/revoke/refresh an account and manage local templates, but cannot complete the intended Cloud operational workflow: synchronize approved Meta templates, map them to Store use cases, inspect approval/rejection state, configure quota/safety, or manage consent. The backend contracts exist without a usable product surface, which makes the migration operationally incomplete.

**Required fix**

Add the smallest production workflow described by the plan:

1. Accounts: connected number, business name, status, quality, Meta limit, Store assignment, and clear reconnect/action state.
2. Templates: synced Meta assets, approval/category/language status, local use-case binding, variable/media validation, preview, and a safe sync action.
3. Usage: Hisab quota, Meta-limit snapshot, current-period counts, budget, reconciliation warnings, and no raw provider identifiers.
4. Campaigns: recipient/opt-in counts, cooldown and limit warnings, progress, failure reason, and stop action.
5. Consent: explicit customer state/history controls where the product has authorized them.

The service functions should either be wired into this UI or removed from the claimed workflow until they are ready.

### WAC-008 — P1/P2: template variable mapping is positional and not proven safe

**Evidence**

- `apps/backend/src/modules/tenant/whatsapp/invoice-cloud-components.ts`, `due-reminder-cloud-components.ts`, and `promotion-cloud-components.ts` extract local token names in order and consume them against Meta placeholders in definition order.
- The mapping fails only on a count/value absence mismatch; it does not persist an explicit mapping between a local token and a Meta placeholder number.
- Current tests cover matching order, not a provider definition whose placeholder order differs from the local template order.

**Impact**

If the local template is `{{customer_name}} {{total}}` but the approved Meta body uses those placeholders in a different semantic order, the send can be accepted with valid-looking values in the wrong positions. This is worse than a hard failure because the message is delivered with incorrect customer/billing information.

**Required fix**

Choose one safe contract and enforce it:

- persist explicit local-token-to-provider-placeholder mapping during binding; or
- compare normalized local and provider definitions and reject any unprovable mapping; or
- make local templates provider-shaped and remove independent positional interpretation.

Add tests where placeholder order, button order, header parameters, and dynamic links differ.

### WAC-009 — P2: binding database constraints do not enforce the selected Cloud asset belongs to the selected WABA

**Evidence**

- `apps/backend/db/migrations/20260822100000_whatsapp_cloud_template_bindings.sql:50-72` stores both `cloud_template_id` and `whatsapp_business_account_id` with separate organization-scoped foreign keys.
- The database does not have a composite foreign key from `(cloud_template_id, whatsapp_business_account_id, organization_id)` to the asset's WABA identity.
- `createCloudTemplateBinding` checks the relationship in application code at `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-template.repository.ts:230-285`, but direct SQL, future code, or a faulty import can create a cross-WABA binding.

**Impact**

The intended tenant/WABA invariant is application-enforced rather than database-enforced. A malformed binding can be stored and discovered only at send admission or snapshot time.

**Required fix**

Add a composite unique key on Cloud assets and a composite foreign key on bindings, or redesign the binding to derive the WABA only from `cloud_template_id`. Keep the application check for a clear error, but make invalid states impossible in PostgreSQL.

### WAC-010 — P2: migration plan status and evidence are stale/contradictory

**Evidence**

- The plan header at lines 1–10 says the migration is in progress and Loop 7 is only planned.
- The phase table at lines 168–176 says Phase 6 is planned/blocked and Phase 7 is not started, which is correct for the current release gate.
- The loop section at lines 792–804 describes Loop 7A as complete and later caller migration as pending, which is also useful but not clearly separated from Phase 6.
- The evidence at lines 1095–1102 says the focused suite has 123 tests; the current run reports **124** passing tests.
- The plan explicitly says its status must not be inferred from a migration file or passing unit test alone, but the current status text does not include this review's concrete blockers.

**Impact**

Different readers can conclude that caller migration is complete, that Phase 6 is complete, or that only external setup remains. That creates a release-management risk, especially when feature flags are later changed.

**Required fix**

Update the plan after this review with a single status vocabulary:

- code-first seams complete;
- production assembly incomplete;
- Phase 6 controlled acceptance not started/passed;
- Phase 7 intentionally blocked;
- exact current test count and failing baseline checks;
- linked issue IDs for every P0/P1 finding.

### WAC-011 — P2 baseline: repository-wide backend TypeScript check is not clean

The focused WhatsApp test suite passes, but the full backend check fails. The observed WhatsApp-specific baseline errors are:

- `apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.routing.test.ts:10` cannot resolve `./whatsapp.repository?routing-test`;
- the same test has a mocked query type mismatch involving `store_id`;
- `apps/backend/src/modules/tenant/whatsapp/whatsapp.service.create-account.test.ts:109` passes `null` where the current type does not allow it.

The branch diff does not appear to introduce these test files, so they should be tracked as pre-existing repository health work rather than attributed to the Cloud migration. They still prevent claiming a clean backend typecheck and should be repaired before the final migration release.

## Positive findings

The review also found several strong foundations worth preserving:

- Cloud caller and outbox flags fail closed by default in `apps/backend/.env.example` and `cloud-feature.ts`.
- Credential material is represented through opaque references and key versions rather than returned in DTOs.
- Webhook signature verification occurs on the raw body before persistence.
- Webhook receipts and provider events have durable replay/idempotency seams.
- Cloud template sends snapshot binding/version/component data into the outbox instead of re-reading mutable configuration during dispatch.
- Admission checks include approval status, category/intent compatibility, consent, suppression, required parameters, and the 24-hour free-form window.
- Quota reservation is performed before enqueueing and includes duplicate/concurrency checks.
- Store/account/WABA scope checks exist in the application binding and send paths.
- Baileys, QR UI, and port `8100` remain intentionally present until the plan's Phase 7 gate, which is the correct migration posture.
- The focused Cloud/WhatsApp suite and local migration set are currently green.

These strengths do not compensate for the runtime vault and correctness blockers, but they provide a sound base for the next hardening loop.

## Standards-axis conclusion

Architecture and boundaries are generally good: provider access, onboarding, template admission, quota, webhook processing, and outbox dispatch have separate seams and mostly use dependency injection for testing. The main standards failures are at production assembly, shared contract alignment, state transition handling, database invariants, and operational recovery. Unit-test seams are stronger than the real default runtime path, so assembly-level checks are required.

Security/PII handling is mostly conservative, but the raw WABA ID in the normal Admin UI conflicts with the repository's stated product boundary. The actual provider credentials are not exposed by the reviewed DTOs; the unresolved issue is that no real vault implementation is wired.

## Specification-axis conclusion

The branch implements most of the code-first seams for Phases 2–5 and the caller gate, but it has not completed the production acceptance contract for Phase 6. The plan's required Cloud template, usage/safety, consent, and controlled provider workflows are not all reachable from the Admin UI. Phase 7 must remain blocked; no Baileys/QR/port-8100 retirement is justified by this review.

## Remediation order

### Loop A — make the default runtime real and safe

1. Implement/assemble the production credential vault and private media storage.
2. Add startup/readiness validation for required backend/frontend Cloud configuration.
3. Add default-runtime integration tests for onboarding, template sync, refresh, and outbox dispatch.
4. Keep both Cloud flags disabled until these checks pass.

### Loop B — repair contracts and state transitions

1. Add `template` to shared schemas/types and DTO tests.
2. Fix Cloud-to-legacy account status projection without invalid enum casts.
3. Make delivery status side effects transition-aware and terminal-state safe.
4. Add reconciliation timeout, lookup/replay/manual resolution, metrics, quota behavior, and tests.

### Loop C — enforce data invariants

1. Add the binding-to-asset-WABA composite database invariant.
2. Audit campaign/outbox/quota relationships for equivalent cross-organization and cross-store guarantees.
3. Run the existing Cloud foundation verification script against a production-shaped target database, not only the local development database.

### Loop D — finish the operator workflow

1. Wire Cloud template sync/list/binding into the Templates tab.
2. Add approval/category/language/variable/media validation states and a safe binding action.
3. Add Usage/Safety and campaign stop/reconciliation visibility.
4. Add consent history and suppression controls at the approved product surface.
5. Remove raw WABA/Phone Number IDs from normal UI.

### Loop E — controlled acceptance

Run the plan's controlled WABA checklist for:

- one bill document template;
- one due-reminder utility template;
- one promotion with and without image;
- inbound text and opt-out;
- duplicate webhook;
- status before message persistence;
- delivered/read/failed out-of-order status;
- uncertain POST and reconciliation timeout;
- quota rejection and concurrent quota reservation;
- duplicate campaign and campaign stop;
- reconnect/page reload;
- legacy-account preservation while Cloud flags are off.

Capture target-DB integrity, provider response, webhook, outbox, quota ledger, and UI evidence for each case.

## Go/no-go decision

**Current decision: NO-GO for production Cloud sending.**

The branch is suitable for continued code-first hardening and controlled fixture work. It is not suitable for enabling Cloud callers or the Cloud dispatcher because WAC-001 through WAC-005 remain open, and the external vault/provider/storage/target-database gates are explicitly unverified.

After the P0/P1 fixes and controlled acceptance pass, update the migration plan with exact evidence. Only then should the team consider a staged Cloud rollout. Baileys, QR compatibility, and port `8100` should remain until the separate Phase 7 migration and retirement gates pass.
