# WhatsApp invoice and due template lifecycle

Status: complete

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
- Queue invoice messages from the existing explicit completed-sale WhatsApp
  action. Automatic post-commit sending remains out of scope until a separate
  consent-aware completion hook is approved.
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

- Invoice messages are queued from the explicit completed-sale WhatsApp action,
  with manual resend support. The current product does not silently send after
  every sale completion.
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

Status: complete

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

#### Phase 4 implementation notes (2026-08-26)

- Added `invoice_url` to due template values and passed it through the manual
  Cloud due-reminder path only for approved dynamic URL-button bindings.
- Dynamic URL due templates require a selected bill so the link is tied to one
  completed sale; document-header due templates retain the existing generated
  PDF behavior.
- Added an authenticated organization/Store action to revoke a public invoice
  link. Revoked links return 404 for both HTML and PDF and are restored with
  fresh token material when regenerated.

#### Phase 4 verification

- Due reminder, due Cloud component, invoice text, type contract, and public
  invoice focused tests: 16 passed, 0 failed.
- Changed-file backend TypeScript filtering produced no errors.
- `git diff --check` passed.
- Public HTML title and PDF filename no longer fall back to an internal sale
  UUID.

### Phase 5 — Migration, compatibility, and operator rollout

Status: complete

Safely migrate existing local defaults and bindings, surface unmapped templates
for review, verify existing approved sends, and provide the operator runbook.

Acceptance criteria:

- Existing defaults and approved bindings remain unchanged unless an operator
  explicitly assigns a replacement.
- Existing assets with incompatible variable mappings are visible and blocked
  with an actionable explanation.
- Explicit invoice and due sends work for every supported Cloud account/store
  fixture.
- Rollback to an archived approved revision is tested.
- Production setup, webhook, sync, public URL, storage, and troubleshooting
  documentation is complete.
- Full scoped review is complete before release.

#### Phase 5 implementation notes (2026-08-26)

- Added `docs/development/whatsapp-cloud-invoice-links.md` with environment,
  migration, Meta template, revocation, and troubleshooting instructions.
- The normal sale-completion UI still explicitly asks the operator whether to
  queue WhatsApp. No safe backend completion hook exists yet that can perform
  an automatic send without changing that existing opt-in behavior; this is
  retained as an explicit release boundary rather than silently sending
  messages for every completed sale.

#### Phase 5 verification

- Focused tests, changed-file TypeScript filtering, and staged diff checks pass.
- Migration status was checked separately; applying it remains an explicit
  deployment action against the configured target database.
- The public review action accepts only HTTPS URLs, matching the other public
  links.

### Phase 6 — Templates-tab UI simplification and responsive layout

Status: planned

Refresh only the Admin WhatsApp Templates tab so operators can quickly choose a
Bill or Due reminder default and review the available Cloud revisions. Keep the
scope limited to invoice/bill and due-reminder templates; Promotions and the
Promotions tab remain out of scope.

#### Design direction

- Keep `WhatsAppCloudTemplateManager` as the module boundary and preserve its
  existing account, mapping, default-assignment, sync, preview, and revision
  behavior.
- Make the page full-width and task-oriented, removing nested card padding and
  unnecessary visual chrome.
- Put the two primary jobs in order: choose Store defaults first, then manage
  and review the template library.
- Use text labels, status badges, and clear action names so status is not
  communicated by color alone.

#### Target layout and behavior

1. The top toolbar uses the available width: page title and context on the
   left, a flexible Cloud-account selector in the middle, and Sync plus the
   primary Create template action on the right. Preserve the account loading
   state and keep Sync explicitly user-triggered.
2. The defaults section appears before the library. It has one compact row per
   supported kind/language, clearly marks the current default, and offers only
   approved, enabled, correctly mapped Cloud templates. Promotional assets do
   not appear in these controls.
3. The library provides search plus compact filters for kind, language, and
   provider status. The desktop view uses the available width for columns such
   as name, kind, language, Meta status/reason, Store usage/default state, last
   updated, and actions. The mobile view stacks each template into a readable
   card instead of forcing a narrow horizontally scrolling table.
4. Row actions are consolidated into a predictable action menu with Preview,
   Set as default, Edit as new revision, Archive, and Restore where each action
   is valid. The current default and immutable approved revision remain visible
   without opening a second screen.
5. Preview opens in a wide side drawer on desktop and a full-height sheet on
   mobile. It shows the WhatsApp-style header/body/buttons, resolved sample
   values, variable mapping, provider status/reason, and the invoice-link or
   document behavior applicable to the selected revision.
6. Create and edit-as-new-revision use a wider two-column dialog: fields and
   validation on the left, a live preview on the right, and a sticky footer
   with explicit Cancel and Submit actions. Existing submission and mapping
   rules remain unchanged.

#### Implementation sequence

- 6.1 Capture the current component state/interaction map and define the
  responsive breakpoints without changing data or API contracts.
- 6.2 Restructure the manager shell and toolbar for full-width desktop use,
  preserving account selection, loading, sync, and error states.
- 6.3 Move and simplify the default controls, retaining exact Store/account,
  kind, language, approval, enabled, mapping, and immutable-revision rules.
- 6.4 Add library search/filter presentation and responsive table/card layouts;
  keep provider status and safe rejection reasons visible.
- 6.5 Widen and polish the preview drawer and create/revision dialog without
  changing their submission or preview data flow.
- 6.6 Review keyboard navigation, focus handling, empty/loading/error states,
  small-screen overflow, and status readability.
- 6.7 Run focused checks, perform standards/spec review, fix findings, and
  commit this UI phase before starting unrelated work.

#### Non-goals

- No backend, database, migration, provider, webhook, or template-schema
  changes.
- No Promotions-tab or promotion-template UI changes.
- No automatic sync, automatic default replacement, or client-side fallback
  when a mapping/default operation fails.
- No broad Admin design-system rewrite; reuse the existing components and
  tokens unless a small local adjustment is required for the layout.

#### Acceptance criteria

- At desktop widths the Templates tab uses the available content width without
  the current narrow account selector, cramped action area, or unnecessary
  nested borders.
- At mobile widths the tab remains usable without requiring horizontal table
  scrolling; all essential template fields and actions remain accessible.
- Approved Bill and Due reminder revisions can be searched, filtered, previewed,
  and explicitly selected as defaults with the existing scope rules intact.
- Pending, rejected, archived, unmapped, and current-default states are
  distinguishable and include actionable text where applicable.
- Preview accurately distinguishes dynamic invoice-link buttons from legacy
  document-header/PDF behavior and does not expose internal identifiers.
- Create and edit-as-new-revision still submit the same valid payloads and
  retain the existing Meta error presentation.
- Sync remains manual, promotional templates remain absent, and no existing
  invoice/due send behavior changes.

#### Verification plan

- Focused Admin tests or component-level checks for filtering, default
  eligibility, preview state, dialog state, and responsive action visibility.
- Admin focused type check and lint output for the changed component, reported
  separately from known baseline failures.
- Manual checks at desktop, tablet, and mobile widths using multiple approved
  Bill/Due templates plus pending/rejected/archived examples.
- `git diff --check`, standards review, and spec/acceptance review before the
  phase commit.

### Phase 7 — Public invoice appearance and PDF customization

Status: implemented (2026-08-28)

Improve the customer-facing public invoice page and generated PDF, then add a
safe Store-level customization experience. The HTML page and PDF are driven
by a shared `InvoiceDocument` model so branding, items, and totals stay
consistent across both outputs.

#### Implementation notes

- **PDF renderer:** PDFKit (server-side). HTML and PDF share the same document
  model but are not pixel-identical renderers.
- **Primary action:** Public HTML exposes **Download PDF** only. Share/Copy
  link actions were intentionally omitted to reduce token exposure surface.
- **Admin PDF preview:** Returns an actual PDF binary (`pdfBase64`), not a
  width-constrained HTML frame.
- **Payments:** Trusted `sale.payments[]` rows render in HTML and PDF when
  present; nothing is inferred beyond committed sale data.
- **Logo storage:** Paths must stay under
  `organizations/{organizationId}/invoice-appearance/`.
- **Known follow-ups:** Dedicated rendering-error page (distinct from invalid
  link), customer-facing loading skeleton, and Indic/emoji PDF font embedding.

#### Current baseline

- The public HTML invoice uses a fixed inline layout with a dark header, basic
  organization and Store text, a three-column item table, payment summary,
  PDF download, review action, and plain configured links.
- The PDF renderer uses a fixed A4 layout, hardcoded colors and positions,
  centered text branding, item columns, and a payment summary.
- Existing Organization and Store data already supports tagline, address,
  review link, social link, and Store message links.
- No invoice logo or invoice-appearance settings are currently part of the
  Organization/Store settings interface.
- `WHATSAPP_PUBLIC_INVOICE_BASE_URL` and the link secret are security/runtime
  configuration only. They must not become the place for per-Store visual
  customization.

#### Design decisions

- Create one deep invoice-appearance module with a small interface containing
  design tokens, layout preset, visibility options, safe footer content, and
  approved Store branding. The public HTML and PDF renderers are adapters of
  that interface.
- Keep canonical invoice data separate from appearance settings. A theme must
  not alter totals, customer identity, payment status, sale number, or the
  generated public-link token.
- Use Organization-level defaults with a Store-level override. A Store with
  no override uses the Organization default, and missing settings fall back to
  the current safe default appearance.
- Store settings are the persistence boundary for visual customization; do
  not add visual settings to the WhatsApp Cloud template form or environment
  variables.
- Offer controlled presets and fields instead of raw HTML, CSS, JavaScript,
  or arbitrary provider JSON. Sanitize all user-authored text and validate
  colors, image files, text lengths, and external HTTPS links.
- The HTML page may provide richer interaction, but the PDF remains a
  print-safe representation of the same content and theme. PDF limitations
  must not force the HTML page into a poor mobile layout.
- Keep the existing public token, revocation, no-expiry decision, and secure
  link generation unchanged.

#### Target public invoice experience

- Branded header with optional logo, Organization name, Store name, tagline,
  address, and phone.
- Clear payment-state banner for Paid, Partially Paid, Due, or Cancelled.
- Separate metadata groups for invoice number/date and customer/service mode.
- Responsive item presentation with item name, quantity, rate, discounts/tax
  where available, and line amount. Use readable mobile cards when a table
  becomes cramped.
- Prominent total, paid amount, and balance-due treatment. Balance due must be
  visually obvious without relying on color alone.
- Primary actions for Download PDF and Share/Copy link, followed by optional
  review, social, website, contact, and Store message links.
- Notes, terms, and contact footer with clear empty-state behavior when those
  values are not configured.
- Dedicated invalid/revoked-link and rendering-error states that do not expose
  internal identifiers or implementation details.
- Accessible focus states, semantic headings, keyboard-operable actions,
  sufficient contrast, responsive spacing, and loading/skeleton behavior.

#### Target PDF experience

- Use the same logo, accent color, typography preset, density, and visibility
  decisions as the public page where PDF constraints permit.
- Use a professional header with branding on one side and invoice title/status
  on the other rather than a large centered text-only header.
- Use structured bill/customer metadata, a readable item table, and a clearly
  highlighted total and balance-due section.
- Include payment method/transaction details only when trusted sale data
  exists; never invent or infer payment details.
- Repeat table headers across pages, keep rows together where practical, and
  handle long names, add-ons, bundles, notes, and many-item invoices safely.
- Include configured terms, review/social/contact links, and a compact footer
  when they fit the page. The document must remain useful when optional data
  is absent.
- Use a consistent currency and date format across HTML and PDF, with a safe
  font/fallback strategy for supported Indian-language text and emoji content.

#### Customization experience

Add an **Invoice Appearance** area under Store settings, separate from
WhatsApp template management.

- Show a live sample invoice with desktop, mobile, and PDF preview modes.
- Provide three starting presets: Classic, Modern, and Minimal.
- Allow logo upload/remove, accent color, header style, font preset, and
  compact/comfortable density.
- Allow safe show/hide controls for tagline, address, phone, customer phone,
  service mode, notes, terms, review/social links, Store links, and PDF footer.
- Allow custom footer and terms text with length limits and preview.
- Provide explicit Save, Publish/Apply, Reset to default, and unsaved-change
  handling. The preview must show whether it is using the Organization default
  or a Store override.
- Validate contrast and show a warning before saving an unreadable theme.
- Preserve the existing review/social link validation and HTTPS-only public
  link rules.

#### Implementation sequence

- 7.1 Inspect the current public invoice, PDF, Organization/Store settings,
  asset-upload, and test seams. Record the exact data available for each
  output and preserve unrelated worktree changes.
- 7.2 Define the smallest shared invoice-appearance interface and fallback
  theme. Keep canonical sale data and secure public-link generation outside
  the appearance interface.
- 7.3 Implement the public invoice redesign using the shared presentation
  model, including responsive, loading, invalid-link, and optional-data
  states.
- 7.4 Implement PDF parity, page-break safety, long-content handling, and
  supported-font fallback using the same appearance model.
- 7.5 Add persisted Organization defaults and Store overrides with migration,
  validation, authorization, and safe fallback behavior.
- 7.6 Add the Admin Invoice Appearance editor and live previews. Keep the
  WhatsApp template manager focused on Cloud template lifecycle only.
- 7.7 Test representative paid, partial, due, cancelled, empty, long, and
  multi-page invoices; review accessibility, security, responsive behavior,
  and visual parity.
- 7.8 Run focused verification, standards/spec review, fix findings, and
  commit this phase only after explicit approval.

#### Non-goals

- No Promotions-tab or marketing-template work.
- No changes to Meta approval, Cloud account, template submission, webhook,
  consent, queue, or provider-delivery behavior.
- No public-link expiry, token format change, or automatic link replacement.
- No arbitrary HTML/CSS/JavaScript editor.
- No payment collection, invoice editing, refund, tax-accounting, or inventory
  behavior changes.
- No broad Admin design-system rewrite.

#### Acceptance criteria

- A customer sees a polished, responsive, branded public invoice with clear
  payment state, totals, balance due, and useful actions.
- The PDF is readable, print-safe, multi-page safe, and visually consistent
  with the public invoice.
- Organization defaults and Store overrides work predictably, including reset
  and fallback behavior.
- A theme cannot change financial values, customer data, authorization, or the
  secure public-link token.
- Invalid links, missing optional branding, missing links, long text, many
  items, add-ons, bundles, and unsupported image/font cases fail safely.
- Existing configured review/social/Store links remain compatible.
- WhatsApp template behavior and Promotions remain unchanged.
- Focused tests, type checks, migration verification, `git diff --check`,
  standards review, and spec/acceptance review pass before the phase is
  committed.

#### Verification plan

- Contract tests for theme fallback, Organization default/Store override
  precedence, validation, authorization, and safe text/link handling.
- Public HTML tests for status, totals, optional fields, responsive markup,
  invalid/revoked links, and absence of internal identifiers.
- PDF tests for metadata, totals, status, optional sections, long content,
  multi-page output, and consistent formatting.
- Admin tests for preset selection, live preview, save/reset, override state,
  validation warnings, loading, and unsaved changes.
- Manual visual review at desktop, tablet, mobile, print, and multi-page sizes
  using paid, partial, due, cancelled, empty, and heavily populated invoices.
- Report local verification separately from provider/live-account delivery
  verification, which cannot be proven by local tests.

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
