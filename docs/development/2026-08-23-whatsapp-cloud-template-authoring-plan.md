# WhatsApp Cloud Template Authoring and Approval Plan

Status: in progress — implementation authorized by the user; external Meta/live gates remain separate
Parent plan: [`2026-08-20-whatsapp-cloud-api-only-migration-plan.md`](./2026-08-20-whatsapp-cloud-api-only-migration-plan.md)
Parent phase: Phase 5 — Admin operator workflow
Branch: `feat/whatsapp`

## Objective

Allow an Organization administrator to create, preview, submit, monitor, and
assign WhatsApp Cloud templates from Ganatri. The administrator should not need
to manually copy a Meta template name, select UUIDs, or maintain a separate
local-to-Meta link by hand.

The product flow will be:

```text
Create in Ganatri
  -> Preview and validate
  -> Submit to Meta
  -> Pending approval
  -> Meta status update / sync
  -> Approved
  -> Set as Store default
  -> Send through the existing Cloud outbox
```

Ganatri owns the authoring experience and Store defaults. Meta remains the
authority for template approval, category, provider name, provider language,
provider components, and rejection/quality state.

## External contract

Meta exposes template creation through the WABA message-templates endpoint:

```text
POST /{WABA_ID}/message_templates
```

The create response is asynchronous from the product point of view: the
template can be returned with a pending status and must not be used for
outbound delivery until Meta reports it approved. Meta's official Cloud API
examples also show template retrieval through the same WABA-scoped resource.

Sources:

- [Meta Cloud API template creation example](https://www.postman.com/meta/whatsapp-business-platform/request/uzphwqw/create-template-w-text-header-text-body-text-footer-and-2-quick-reply-buttons)
- [Meta Cloud API template listing and management collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/3kru5r6/moved-whatsapp-business-management-api)
- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)

The policy requirement remains unchanged: outside the 24-hour customer-service
window, business-initiated messages require an approved template. Meta can
review, approve, pause, or reject templates at any time.

## Current implementation inventory

### Already implemented and reusable

| Area | Current code/data | Reuse decision |
| --- | --- | --- |
| Cloud credentials | `database-cloud-credentials.ts`, `whatsapp_cloud_credentials` migration, account credential bindings | Reuse the server-side vault; never send access tokens to Admin. |
| Graph client | `cloud-api.client.ts` | Add create/update/delete methods beside `getTemplates`; preserve timeout, error classification, and redacted errors. |
| Account scope | `cloud-account.repository.ts`, Cloud account snapshots | Resolve the internal business-account UUID and Meta WABA ID separately. Never pass the numeric WABA ID into UUID columns. |
| Provider asset catalogue | `whatsapp_cloud_templates`, `cloud-template.repository.ts` | Keep as the synchronized provider truth used for sending and approval checks. |
| Local Store templates | `whatsapp_message_templates`, `whatsapp-template-manager.tsx` | Reuse for Store-facing message content and local business tokens. |
| Store binding | `whatsapp_cloud_template_bindings` | Keep as an internal Store-default mapping; remove manual UUID selection from normal UI. |
| Variable mapping | `cloud-template-variable-mapping.ts` | Reuse, but make automatic mapping part of approval/assignment and expose only a friendly mismatch error. |
| Component builder | `cloud-template-components.ts` | Reuse for the supported outbound component contract. |
| Send admission | `cloud-template-admission.ts` | Keep the approved-status, category, consent, cooldown, and variable checks. |
| Durable sending | `cloud-template-send.service.ts`, Cloud outbox repositories | Do not bypass the existing outbox or send directly from the create UI. |
| Current Admin page | `whatsapp-organization-page.tsx` | Keep Accounts and Promotions. Replace the manual Cloud-linking experience inside Templates with authoring/status cards. |
| Existing tests | `cloud-template*.test.ts`, Cloud client tests, Admin type checks | Extend the existing seams rather than adding a parallel template subsystem. |

### Current gaps

1. `WhatsAppCloudApiClient` can list templates but cannot create them.
2. There is no durable create-submission record, idempotency key, or safe
   retry policy for an uncertain create request.
3. `whatsapp_cloud_templates` stores provider assets, but it does not preserve
   the Ganatri draft/submission intent before Meta returns an asset.
4. The webhook normalizer/processors currently focus on message and delivery
   events; template status updates are not yet routed into the template asset
   state.
5. The Admin Cloud UI currently requires selecting a Store template and a Cloud
   template separately, which exposes implementation details and permits the
   UUID/snake-case confusion recently found.
6. The existing local editor supports text, local tokens, and reusable links,
   but does not author Meta headers, footers, examples, or provider buttons.
7. A pending/rejected template cannot currently explain its lifecycle or
   offer a safe re-submit/duplicate action.

## Product decisions

### 1. Meta template scope versus Store scope

Templates are created once for a WABA and can be assigned to multiple Stores
that use that Cloud account. The default is Store-specific:

```text
Meta template: WABA-wide
Store default: Store + message kind
```

The existing binding table remains necessary, but it becomes an internal
implementation detail.

### 2. Message kinds and categories

The Ganatri message kind controls the allowed Meta category:

| Ganatri kind | Meta category | Default use |
| --- | --- | --- |
| Bill | Utility | Invoice/bill delivery |
| Due reminder | Utility | Receivable balance reminder |
| Promotion | Marketing | Opted-in promotional campaign |

The UI should not allow an administrator to accidentally submit a promotion
as a utility template or a due reminder as marketing. The backend must enforce
the same rule even if the UI is bypassed.

### 3. Initial component scope

The first authoring version should expose only components supported by the
current send builder and admission tests:

- text header;
- image header;
- document header;
- body text with Ganatri tokens;
- footer text;
- quick-reply buttons;
- URL buttons with HTTPS links.

Video headers, Flow buttons, catalogs, authentication-specific OTP formats,
and other Meta-specific components remain later extensions. They should not be
accepted as free-form JSON in the first UI.

### 4. Friendly name versus Meta name

The administrator may enter a friendly display name. The backend derives or
requests a Meta-safe name using lowercase letters, numbers, and underscores,
then shows both only where useful. The normal UI displays the friendly name,
language, kind, and status—not provider IDs.

### 5. Existing templates

Existing synchronized Meta templates must remain usable. During migration:

- show them in an “Existing Meta templates” section;
- offer one guided **Use for Store** action;
- automatically create/validate the local template and variable mapping;
- show a clear mismatch message when the local body and provider placeholders
  cannot be mapped;
- do not remove existing assets or bindings automatically.

After the new authoring flow is proven, the old manual three-select linking UI
can be removed from normal use.

## Target lifecycle and state model

### Ganatri submission state

Add a durable submission/request model separate from the provider asset table.
It should preserve the requested content and the lifecycle even when Meta's
create response is incomplete or delayed.

Minimum fields:

- internal submission ID;
- Organization ID;
- internal Cloud business-account UUID;
- optional originating Store ID;
- optional local message-template ID;
- Ganatri kind;
- friendly name and derived Meta name;
- language code;
- locked Meta category;
- requested components JSONB;
- sample/example values JSONB where required;
- idempotency key;
- provider template ID, nullable until returned;
- state: `draft`, `submitting`, `pending`, `approved`, `rejected`,
  `paused`, `disabled`, or `failed`;
- safe rejection/error code and message;
- submitted/updated timestamps;
- actor IDs and audit timestamps.

The existing `whatsapp_cloud_templates` table remains the provider asset
catalogue. A successful submission is reconciled into that table; the
submission record is retained for audit and retry diagnosis.

### State rules

- `draft`: editable and not sent to Meta.
- `submitting`: short-lived lease; a retry must use the same idempotency key.
- `pending`: submitted to Meta; cannot be bound as a sendable default.
- `approved`: eligible for automatic binding after component mapping passes.
- `rejected`: not sendable; show Meta's safe reason and offer duplicate/revise.
- `paused` or `disabled`: existing bindings remain visible but cannot send.
- `failed`: Ganatri could not complete submission; retry only with safe rules.

No pending, rejected, paused, or disabled asset may pass Cloud send admission.

## Phase plan

Each phase follows the repository working loop:

```text
research -> acceptance criteria -> smallest code slice -> focused tests
-> standards/spec review -> fix findings -> evidence -> user approval -> commit
```

Do not commit a phase automatically. Do not remove the current linking path
until the compatibility gate in Phase 6 passes.

### Phase 0 — Contract and compatibility lock

Status: **completed**

Scope:

- confirm the supported Meta component subset;
- confirm friendly-name/Meta-name rules;
- confirm the three message-kind/category mappings;
- document the provider status payload fields to support;
- inventory all existing local templates, cloud assets, bindings, and sends;
- define migration behavior for existing bindings;
- add acceptance criteria and fixtures before implementation.

Exit criteria:

- the request/response DTOs and state transitions are written down;
- no existing approved binding is deleted or silently changed;
- unsupported Meta components have an explicit error path;
- the plan is accepted as the Phase 5A source of truth.

Evidence:

- [x] Existing Cloud assets, local templates, bindings, send admission, and
  component-builder seams were inspected.
- [x] WABA-wide provider assets and Store-specific defaults were separated in
  the data-model decision.
- [x] The initial component scope is limited to the current outbound builder:
  text/image/document headers, body, footer, quick replies, and HTTPS URLs.
- [x] Existing bindings remain preserved and the old link flow is retained
  until Phase 6 compatibility acceptance.

### Phase 1 — Submission persistence and database invariants

Status: **completed**

Scope:

- add the submission/request table and enums through one forward migration;
- add Organization, business-account, Store, local-template, and actor foreign
  keys with tenant scoping;
- add unique constraints for WABA + Meta name + language where appropriate;
- add idempotency uniqueness for active submissions;
- add JSONB array/object checks for components and examples;
- add indexes for account/status, Store/kind/status, and provider ID;
- preserve existing `whatsapp_cloud_templates` and bindings;
- add migration tests and an audit query for orphaned rows.

Exit criteria:

- migrations apply and roll back in the configured development database;
- cross-Organization and cross-WABA references are rejected by the database;
- duplicate create retries cannot create two active submissions;
- no credential, token, or raw provider secret is stored in the new table.

Evidence:

- [x] Migration `20260823120000_create_whatsapp_cloud_template_submissions.sql`
  adds tenant-scoped submission storage, status states, JSONB checks, active
  name uniqueness, provider-ID uniqueness, and idempotency uniqueness.
- [x] The configured development database reports 76 applied migrations and
  0 pending after the migration was applied.
- [x] Shared DTO schemas and backend submission mapping were added without
  storing credential material.
- [x] Submission mapping regression test passes.
- [x] Full backend typecheck was run; remaining failures are repository
  baseline/test-contract failures, not this phase's submission mapper after
  its implicit-any issue was fixed.

### Phase 2 — Meta create/update/delete adapter

Status: **completed**

Scope:

- add typed `createMessageTemplate` support to `cloud-api.client.ts`;
- add safe provider payload builders for the supported component subset;
- validate names, languages, categories, text lengths, placeholders, HTTPS
  links, button counts, and sample values before the Graph request;
- classify Meta errors into safe user messages and retryable/permanent cases;
- add provider methods for the supported lifecycle operations only;
- never log access tokens, request authorization headers, or full customer data.

Exit criteria:

- client tests cover successful pending creation, validation failures,
  permanent Meta errors, retryable errors, timeout/uncertain requests, and
  malformed responses;
- the generated payload matches Meta's WABA message-template contract;
- an uncertain POST is never blindly repeated with a new identity.

Evidence:

- [x] `WhatsAppCloudApiClient` now exposes typed create, edit, and delete
  operations using the WABA/template provider boundaries.
- [x] Client tests cover pending creation, provider-owned edit/delete paths,
  request URLs, method/body shape, token redaction, and existing error/retry
  classification.
- [x] Focused client suite passes: 10 tests, 0 failures.

### Phase 3 — Submission orchestration and approval reconciliation

Status: **completed**

Scope:

- add an authorized create route scoped to Organization, Store, and selected
  Cloud account;
- verify the account is assigned to the Store and its credential is available;
- persist the draft and idempotency key before calling Meta;
- call Meta from the backend using the existing vault;
- persist `pending` and provider ID from the response;
- reconcile the full provider asset through a follow-up GET/sync when create
  returns only summary fields;
- add Meta template status webhook normalization and durable processing;
- keep sync as a bounded recovery path for missed/delayed status events;
- translate rejection/paused/disabled state into send admission and binding
  availability;
- automatically build the local-token-to-provider-placeholder mapping when it
  is unambiguous;
- create or update the Store binding only after approval and mapping success.

Progress evidence:

- [x] WABA-scoped `message_template_status_update` events are normalized
  without requiring phone metadata.
- [x] Approval, rejection, pause, disabled, and pending states are mapped to
  the submission/provider asset lifecycle.
- [x] Template status processing bypasses message-account resolution and
  updates assets/submissions by WABA and provider identity.
- [x] Normalizer and processor focused tests pass: 18 tests, 0 failures.
- [x] The authorized create route verifies Organization, Cloud-account, Store,
  credential, and Store-account assignment scope before submission.
- [x] Submission persistence precedes the provider request and reuses the same
  idempotency record for browser retries.
- [x] Existing WABA templates are checked before create, and a successful
  create is followed by a full catalogue reconciliation before the asset is
  exposed to the application.
- [x] Provider status updates are monotonic for terminal states, so late
  pending notifications cannot regress an approved/rejected asset.
- [x] Focused orchestration tests pass: 3 tests, 0 failures.

Exit criteria:

- authorized users can create only within their Organization;
- pending submissions cannot send or become defaults;
- duplicate browser submits and worker retries are idempotent;
- approval and rejection events update the provider asset and submission;
- out-of-order status events do not regress a newer terminal state;
- a failed mapping does not create a misleading default binding;
- safe errors are returned to the UI instead of generic `500` responses.

### Phase 4 — Simple Ganatri authoring UI

Status: **completed**

Replace the current manual Cloud linking area with one clear Cloud template
workspace for the selected Store.

UI structure:

1. Cloud account summary: phone number, connection status, and Store scope.
2. Template cards: friendly name, message kind, language, Meta status, and
   default Store badge.
3. **Create template** action.
4. Pending/rejected/approved filters or status sections.
5. Existing Meta template import/use action during migration.

Create dialog:

- Step 1: message kind and language; category is derived and explained.
- Step 2: friendly name and body editor with Ganatri token chips.
- Step 3: optional header/footer/buttons/links using structured controls.
- Step 4: example values and final WhatsApp-style preview.
- Submit action clearly says **Submit to Meta for approval**.

UI rules:

- no raw UUIDs, WABA IDs, phone-number IDs, or snake_case enums in normal
  controls;
- no “Save as default” before Meta approval;
- show `Pending approval`, `Approved`, `Rejected`, `Paused`, and `Disabled`
  with clear explanations;
- show rejection reason and **Duplicate and edit** where safe;
- responsive layout: one column on small screens, no horizontal overflow;
- disable duplicate submits while the request is pending;
- use explicit labels instead of relying on select fallback text.

Exit criteria:

- an administrator can understand the lifecycle without opening Meta;
- the preview matches the submitted component structure;
- the UI never exposes an implementation UUID as a label;
- all loading, empty, error, rejected, and stale-status states are handled.

Evidence:

- [x] The old Cloud UUID-selector surface is replaced by one responsive
  workspace with account summary, lifecycle cards, refresh, and Create
  template.
- [x] The create dialog derives the Meta-safe name and category, supports body,
  footer, HTTPS button, sample values, and a WhatsApp-style preview.
- [x] Pending and rejected submissions are loaded from durable submission
  storage, so a reload does not erase lifecycle state.
- [x] Admin and shared-service typechecks pass for the new workspace.

### Phase 5 — Automatic Store default and send integration

Status: **completed**

Scope:

- after approval, offer **Set as default for Bill/Due reminder/Promotion**;
- create the existing internal binding transactionally;
- allow one default per Store and kind;
- retain the selected Cloud account/WABA scope in the binding;
- reuse existing explicit variable mapping and send snapshots;
- revalidate approval/category/version at enqueue and dispatch time;
- make POS and Admin callers use the Store default without exposing binding
  IDs;
- keep promotions subject to consent, cooldown, quota, and campaign rules;
- show why a default cannot be used: pending, rejected, category mismatch,
  mapping mismatch, account unavailable, or Store assignment missing.

Exit criteria:

- a newly approved template can become the Store default without manual UUID
  selection;
- bill, due, and promotion sends use the correct approved template;
- queued messages retain immutable provider snapshots;
- changed/revoked templates are blocked safely without corrupting outbox state;
- existing POS/Admin send paths remain backwards compatible.

Evidence:

- [x] Approved submissions expose one Store-default action; pending, rejected,
  paused, and disabled submissions do not.
- [x] The default action creates the local token template and Cloud binding in
  one database transaction, with one default per Store and message kind.
- [x] Existing Cloud admission and durable outbox callers remain the send
  boundary; no direct provider send was added to the authoring flow.
- [x] Focused approval-gate coverage passes: 4 service tests, 0 failures.

### Phase 6 — Migration, controlled acceptance, and UI cleanup

Status: **in progress**

Migration steps:

- inventory current local templates and active Cloud bindings;
- preserve existing approved Cloud assets and bindings;
- provide guided import/rebind for compatible existing assets;
- report incompatible variable mappings instead of guessing;
- verify each Store has at most one default per kind;
- keep the old manual link path behind a temporary compatibility boundary;
- remove the old three-selector UI only after controlled acceptance passes.

Controlled acceptance:

- create a utility bill template and observe pending -> approved;
- create a utility due-reminder template;
- create a marketing promotion template with consent enforcement;
- test rejection and safe duplicate/edit flow;
- test Meta status webhook and manual sync fallback;
- set different defaults for two Stores sharing one WABA;
- send from Admin and POS using the Store default;
- verify provider status, outbox state, quota, campaign, and message history;
- test duplicate submit, timeout/uncertain create, account disconnect, and
  reload/reconnect behavior;
- run target-DB migration/integrity checks and record rollback evidence.

Exit criteria:

- the authoring flow is the normal supported path;
- manual linking is no longer required for newly created templates;
- no approved existing binding is lost;
- all focused tests, Admin/shared type checks, migration checks, and diff
  review pass;
- live provider evidence is recorded separately from local test evidence.

## Explicit non-goals for this slice

- Embedded Signup or Tech Provider approval changes;
- Meta billing/credit-line management;
- replacing the Cloud credential vault;
- removing Baileys, the legacy worker, or port `8100`;
- arbitrary raw JSON template authoring;
- supporting every Meta template component on day one;
- changing the existing promotion cooldown, consent, quota, or outbox policy;
- deleting historical Cloud assets or message records.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Meta approval is asynchronous or delayed | Durable submission state, webhook status updates, and sync fallback. |
| Create request times out after Meta accepted it | Idempotency key, reconciliation by provider name/ID, no blind duplicate create. |
| Local tokens do not match Meta placeholders | Explicit mapping validation; block default assignment with a repair message. |
| One WABA serves multiple Stores | Keep provider assets account-wide and defaults Store-scoped. |
| Meta changes or pauses an approved template | Reconcile status and re-check admission at enqueue/dispatch. |
| UI exposes internal/provider identifiers | DTO-to-label mapping, explicit trigger labels, and no raw IDs in normal UI. |
| Existing bindings are broken by migration | Preserve assets/bindings; use guided compatibility rebind and audit queries. |
| Marketing is sent without consent | Reuse existing Cloud admission and campaign consent gates. |

## Phase execution checklist

For every phase:

- [ ] Read the relevant code, migration, and existing tests.
- [ ] Write or update phase acceptance criteria.
- [ ] Add a focused failing test or fixture for the key behavior where a seam exists.
- [ ] Implement the smallest compatible slice.
- [ ] Run focused backend/Admin/shared checks.
- [ ] Review standards, tenant scope, secret handling, idempotency, and UI states.
- [ ] Fix review findings.
- [ ] Record evidence and remaining blockers in this file.
- [ ] Ask the user before committing.

## Current next step

Implement **Phase 1 — Submission persistence and database invariants**. The
first vertical tracer-bullet slice remains a text-body utility template:
persist the request, submit it idempotently, reconcile its pending/approved
state, and set it as the Store bill default.
