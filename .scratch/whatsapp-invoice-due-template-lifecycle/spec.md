# WhatsApp invoice and due template lifecycle

Status: phase-4-in-progress

## Scope

This plan covers only WhatsApp Cloud invoice/bill and due-reminder templates.
Promotional templates and the Promotions tab are out of scope.

The work must follow this loop for every phase:

```text
phase plan -> smallest implementation -> focused verification
-> standards/spec review -> fix findings -> user approval -> commit
```

Do not begin the next phase until the current phase has been reviewed and
committed. Preserve unrelated work already present in the worktree.

## Problem

The product already has Cloud template synchronization, Store bindings, Cloud
send admission, invoice/due message paths, and template-management UI. The
remaining workflow must make template changes safe while Meta reviews them and
must deliver invoice and due messages with a public, branded invoice page
instead of relying on an attached PDF document header.

## Goals

- Keep the currently approved template active while a replacement is under
  Meta review.
- Make every edit a new Meta template revision/name.
- Allow a new revision to become the default only through an explicit
  **Set as default** action after approval.
- Keep rejected, paused, disabled, and archived versions visible with useful
  status and reasons.
- Support one active invoice and one active due template per language, Store,
  and WhatsApp Cloud account.
- Send invoice messages automatically after a completed sale.
- Keep due messages manual initially and block them when the balance is zero.
- Use a public revocable invoice link with no expiry for now.
- Show current invoice/payment state on the public page and allow PDF download.
- Keep variable mapping, provider status, consent, account, and idempotency
  checks server-enforced.

## Non-goals

- Promotions or marketing-template behavior.
- Scheduled due reminders in the first delivery.
- Public-link expiry in the first delivery.
- Free-form provider JSON authoring.
- Automatic switching to another template when the selected template becomes
  unavailable.
- Hard deletion of historical template revisions.

## Agreed decisions

### Template lifecycle

- Editing creates a new Meta template revision/name; it must not mutate the
  active default in place.
- The previous approved revision remains active during review.
- A rejected revision never replaces the previous default; show Meta's reason.
- A new approved revision requires explicit **Set as default** confirmation.
- Previous revisions remain archived and available for rollback.
- If no approved revision exists, sending is blocked with an actionable
  approval message.
- Meta status webhooks are primary; **Sync templates** is the manual fallback.
- Supported statuses are `draft`, `submitting`, `pending`, `approved`,
  `rejected`, `paused`, `disabled`, `failed`, and local `archived`.
- Meta approval is required before a template is sendable; approved assets must
  also remain enabled and mapped correctly.

### Scope and defaults

- Invoice/bill and due reminder are separate message kinds.
- Both use Meta's `UTILITY` category; the backend enforces the mapping.
- Defaults are separate for each message kind, language, Store, and Cloud
  account.
- Existing defaults remain untouched during migration.
- A template must pass variable mapping validation before assignment.
- Queued messages retain the exact selected template revision.
- If that revision later becomes unavailable, the message fails clearly rather
  than silently switching templates.
- Only authorized organization administrators/managers can assign, archive,
  roll back, or change defaults.
- Keep an audit history for revisions, assignments, approvals, rejections,
  rollbacks, and actor/timestamp information.

### Invoice and due delivery

- Invoice messages are sent automatically after sale completion, with manual
  resend support.
- Due messages are manual initially.
- A due message is blocked when the outstanding balance is zero.
- Invoice and due templates use a dynamic HTTPS **View invoice** URL button.
- The public invoice page requires no login and uses an unguessable revocable
  token with no expiry for now.
- The same page shows the current balance and payment status for due use cases.
- The page may show configured organization/store branding, logo, sale number
  and date, customer name, masked phone number, items, quantities, discounts,
  total, payment state, outstanding balance, PDF download, and configured
  website/review/social links.
- The page must not expose internal UUIDs, credentials, secrets, or the full
  customer phone number.
- Generate the PDF on demand for download; do not require a PDF attachment in
  the WhatsApp template.
- If the public link cannot be created, do not queue the message.

### Reliability and errors

- Prevent duplicate sends with idempotency keys.
- Retry only transient provider/network failures, with a bounded retry limit.
- Do not automatically retry Meta validation, access, consent, mapping, or
  parameter errors.
- Show approved, pending, rejected, paused, disabled, and archived states in
  the UI, including Meta's safe rejection reason where available.

## Current code seams to preserve

- `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-template-admission.ts`
  remains the send-admission boundary.
- `apps/backend/src/modules/tenant/whatsapp/cloud-api/cloud-template-outbox.repository.ts`
  remains the durable queue boundary.
- `apps/backend/src/modules/tenant/whatsapp/invoice.ts` and
  `apps/backend/src/modules/tenant/whatsapp/whatsapp.service.ts` remain the
  invoice/due orchestration boundaries.
- Existing Cloud account credentials and Graph-client error redaction remain
  server-side.
- Existing local message templates and Store bindings remain compatible with
  current data; migration must not silently delete or rewrite them.

## Phase plan

### Phase 0 — Baseline and contract lock

Status: complete

Inspect the current invoice/due template, binding, status-sync, queue, public
link/token, PDF, and Admin UI paths. Record existing behavior and identify the
smallest seams for the lifecycle and public-page changes.

#### Baseline findings (2026-08-26)

- Cloud submission persistence already exists in
  `20260823120001_create_whatsapp_cloud_template_submissions.sql`, including
  provider status, rejection/error fields, idempotency, Meta identifiers, and
  stale-submission claiming. Webhook normalization, processing, and manual
  synchronization are also present.
- Cloud send admission already blocks unapproved assets, category mismatches,
  missing consent, suppressed customers, missing parameters, and inactive
  bindings. The outbox stores a versioned Cloud-template snapshot.
- The Admin Cloud manager already lists assets/submissions, selects a Cloud
  account, creates submissions, previews content, and assigns approved assets.
  It does not yet provide true edit-as-new-revision, archive/rollback, or a
  clear revision/default history. Promotions are currently shown in the same
  manager but are explicitly outside this plan.
- Existing invoice and due Cloud component builders still treat a document
  header as the supported media path. Invoice and due orchestration can upload
  and send generated PDFs through signed storage URLs. The planned dynamic
  public `View invoice` URL path is not implemented.
- The current app has no unauthenticated sale-specific public invoice route or
  revocable sale link token. Existing `whatsappLinkToken` values are Store
  scoped configured links, not invoice access tokens.
- Cloud default binding uniqueness and assignment SQL are currently scoped by
  organization, Store, and kind; the Cloud account/WABA and language dimensions
  are not fully represented in the default constraint. Snapshot selection can
  fall back to another active/default binding, which does not meet the planned
  immutable-revision/no-silent-fallback behavior.
- Invoice sending is currently an explicit queue action. The inspected paths
  enforce completed-sale/customer-phone/account/template checks and use stable
  invoice idempotency, but no completed-sale hook was found that automatically
  queues a Cloud invoice.
- The existing invoice/due PDF renderers and sale-detail repository methods are
  reusable for the public page and on-demand PDF endpoint. Storage supports
  upload, delete, and signed URLs, but the public page should use a database
  token lookup rather than a long-lived object URL.

Acceptance criteria:

- Existing approved invoice/due sends and defaults are covered by fixtures or
  focused tests.
- Current database tables, migrations, provider status mapping, and existing
  UI flows are documented.
- Any mismatch between this plan and the current implementation is listed
  before edits begin.
- No production behavior changes in this phase.

#### Phase 0 verification

- Focused Cloud/template/invoice/due tests: 42 passed, 0 failed.
- Admin typecheck was not runnable from `apps/admin` because that package has
  no local `node_modules/.bin/tsc`; the repository-level dependency setup will
  be checked again during the UI phase.
- `git diff --check` passed for this plan file.
- No production code or migration was changed in Phase 0.

### Phase 1 — Revision-safe Cloud template lifecycle

Status: complete

Implement durable revision/submission state, revision-safe edit/duplicate
behavior, status webhook handling, manual sync fallback, audit events, and
explicit default assignment/rollback.

Acceptance criteria:

- Editing an approved template creates a new revision/name.
- The previous approved default remains sendable while the new revision is
  pending or rejected.
- Only an approved, enabled, correctly mapped revision can be assigned.
- Assignment is explicit and scoped to Store, Cloud account, kind, and
  language.
- Archived revisions remain available for rollback.
- Rejection, pause, disable, and missing-approval states are actionable.
- Focused backend and migration tests pass.

#### Phase 1 implementation notes (2026-08-26)

- Added `language_code` and archive metadata to Cloud bindings, backfilled from
  the Cloud asset, and changed the active-default uniqueness scope to
  organization, Store, Cloud account, kind, and language.
- Cloud binding snapshot selection is now exact: a requested local template
  must match that binding, and an omitted local template selects only the
  scoped default. It never falls back to another active revision.
- Added explicit archive and rollback service operations and routes. Rollback
  requires an approved asset and clears archive metadata when restored.
- Added audit events for provider status updates, default assignment, archive,
  and rollback. Provider status updates record the safe status/reason and
  submission or asset identity without credentials.
- Re-activating a binding through explicit assignment clears its archive
  metadata. The public binding mapper supplies `en_US` for legacy fixtures
  while the migration backfills real rows.
- The existing provider admission, outbox snapshot, manual sync, and webhook
  status paths remain the send/runtime boundaries.

#### Phase 1 verification

- Focused lifecycle, submission mapping, and webhook tests: 20 passed, 0
  failed.
- Original Cloud/template/invoice/due focused suite: 42 passed, 0 failed.
- Backend TypeScript output contained no errors in the changed Cloud-template,
  WhatsApp route, or shared schema files; the repository still has unrelated
  pre-existing type errors outside this phase.
- `git diff --check` passed.
- `dbmate status` showed the submission migration and this lifecycle migration
  pending in the local database; migration execution remains a later rollout
  gate, and pending migrations are applied in lexical order.

### Phase 2 — Template-management UI

Status: complete

Update the Admin template workflow to show revisions, provider status, Meta
reason, language, Store/account scope, mapping validation, preview, test-send,
archive, rollback, and **Set as default**. Keep promotions out of this phase.

Acceptance criteria:

- Pending revisions cannot be selected as defaults or used for sending.
- The current approved default is visibly retained during review.
- The UI never requires manual provider UUID copying for normal assignment.
- Mapping errors identify the missing or mismatched local token.
- Sync is user-triggered unless a status webhook has already updated state.
- Admin type checks and focused UI tests pass.

#### Phase 2 implementation notes (2026-08-26)

- Added explicit Admin actions to edit an approved submission as a new
  revision, archive an active Store binding, and restore an archived approved
  revision. Existing manual Sync behavior remains user-triggered.
- The template table now exposes approval status, language, Meta error codes and
  safe rejection/error reasons, plus preview and revision/default state.
- Store defaults now list invoice/bill and due-reminder templates by language
  and only offer approved utility Cloud assets. Promotional templates remain
  outside the invoice/due default controls.
- Default selection is account-scoped through the existing account query and
  calls the server-side exact binding operation; pending/rejected assets are
  not offered. The UI displays the saved variable-mapping count and archived
  revision state without inventing a client-side fallback.
- The edit action duplicates the existing submission payload so Meta receives a
  new name/revision rather than mutating an approved asset in place.

#### Phase 2 verification

- `git diff --check` passed.
- Admin TypeScript output contained no errors in the changed Cloud template
  manager; the full Admin project still reports unrelated existing errors in
  promotion dialog/dashboard and billing files.
- Backend TypeScript output contained no errors in the changed service wrapper;
  the package still reports the unrelated pre-existing unused
  `WhatsAppCloudQuotaPolicy` import.
- No component test harness exists for this Admin component in the current
  package, so the UI phase was verified through the focused type check and
  manual standards/spec diff review.

### Phase 3 — Public invoice page and invoice message

Status: complete

Add the revocable public invoice token/page, branded invoice rendering, current
payment state, on-demand PDF download, configured links, and the invoice Cloud
template component builder using a dynamic View invoice URL button.

Acceptance criteria:

- A completed sale can generate a revocable public invoice URL before queueing.
- The URL contains no guessable sale/customer identifier or secret data.
- The page works without login and does not expose internal identifiers or a
  full phone number.
- The page reflects current payment status and outstanding balance.
- PDF download works on demand.
- New dynamic-URL-button invoice Cloud messages do not require a document-header
  PDF attachment. Existing document-header templates remain compatible.
- Link generation failure prevents queueing and returns a clear error.
- Invoice sends use the selected immutable approved revision.

#### Phase 3 implementation notes (2026-08-26)

- Added `whatsapp_public_invoice_links`, keyed by organization, Store, and sale,
  with a revocable no-expiry token hash/salt and composite ownership foreign
  keys. Reusing a sale restores the link; changing the configured secret
  rotates the stored token material.
- Added unauthenticated HTML and on-demand PDF routes under
  `/public/whatsapp/invoices/:token`. The page shows organization/store text
  branding, sale/customer summary, masked phone, items, payment state, current
  balance, PDF download, and configured review/social links. The current data
  model has no organization/store logo URL, so no fake logo field was added.
- Added `invoice_url` to bill/due template values and default bodies. Dynamic
  URL-button templates map that token to the provider button; legacy templates
  without a dynamic URL keep their existing mapping and document behavior.
- Invoice Cloud orchestration creates the public URL before queueing only when
  the selected approved revision contains a dynamic URL button, preserving old
  document-header sends while blocking queueing if new-link creation fails.

#### Phase 3 verification

- Focused WhatsApp/template/public-page tests: 24 passed, 0 failed.
- Changed backend files produced no filtered TypeScript errors; the full
  backend project still has unrelated existing fixture/type failures.
- `git diff --check` passed.
- Migration remains pending until explicitly run against the target database.
- Standards/spec review fixed revoked-link restoration, secret-rotation token
  updates, legacy-template compatibility, and public-route parameter typing.

### Phase 4 — Due reminder message

Status: in-progress

Update manual due reminders to use the selected due revision and the same public
invoice page, showing the current balance/payment state. Preserve consent,
phone, account, mapping, idempotency, and outbox checks.

Acceptance criteria:

- A due reminder cannot be sent when the outstanding balance is zero.
- A due reminder uses the Store/account/language-specific approved default.
- The public link opens the same invoice page and shows the current balance.
- A changed or unavailable revision fails clearly without fallback switching.
- Manual resend is bounded by the existing idempotency and retry rules.
- Due-reminder backend and component tests pass.

### Phase 5 — Migration, compatibility, and operator rollout

Status: pending

Safely migrate existing local defaults and bindings, surface unmapped templates
for review, verify existing approved sends, and provide the operator runbook.

Acceptance criteria:

- Existing defaults and approved bindings remain unchanged unless an operator
  explicitly assigns a replacement.
- Existing assets with incompatible variable mappings are visible and blocked
  with an actionable explanation.
- Invoice and due sends work for every supported Cloud account/store fixture.
- Rollback to an archived approved revision is tested.
- Production setup, webhook, sync, public URL, storage, and troubleshooting
  documentation is complete.
- Full scoped review is complete before release.

## Verification gates

For each phase, report separately:

- focused tests for changed backend/UI seams;
- migration or database verification;
- Admin/package type checks;
- `git diff --check`;
- standards review;
- spec/acceptance review;
- known baseline failures unrelated to the phase;
- provider/live-account checks that cannot be proven locally.

Local tests do not prove Meta approval, linked-account access, provider delivery,
webhook receipt, or execution of migrations against the user's live database.
Those remain explicit staging/production gates.

## Open questions

None. The product decisions required to start Phase 0 are confirmed.
