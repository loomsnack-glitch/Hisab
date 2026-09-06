# POS Mobile App — Phase 5 Execution Plan and Review Log

Status: Phase 5 in progress — 5.3 Customer Directory planning
Phase: 5 — Bills and supporting workspaces
Scope: Android-only Ganatri POS mobile application
Started: 2026-09-06

This document is the execution record for Phase 5. Each subphase follows the
approved phase-loop lifecycle: plan, internal review, implementation,
verification, standards/spec review, status update, and focused commit.

## Phase outcome

Provide the operational workspaces needed after core billing is dependable. At
phase completion, an authorized POS user can find and inspect Sales, recover
Draft Sales, manage Customers, view simple Reports, and adjust the approved
Settings without complicating the primary Product → Cart → Payment flow.

## Scope guardrails

Included in this phase:

- Bills list defaulting to today's Sales.
- Sale and Customer search plus simple date, Payment status, and Payment method
  filters.
- Sale Details access and Draft Sale resume/delete.
- Separate Customer Directory with search, filters, sorting, details, add/edit,
  and Sales history.
- Read-only Today Reports with a simple date filter and Products Sold.
- Settings for language, theme, display size, printer entry point,
  Store/Device information, and Logout.

Not included in this phase:

- Bluetooth discovery, connection, transport, physical printing, or printer
  validation; those remain Phase 6.
- Restaurant Tables, service modes, KOT, or Table checkout; those remain Phase 7.
- Offline billing, synchronization, advanced Reports, or custom shortcuts.
- Android build, emulator, physical-device, live API, migration, or hardware
  validation; those remain explicit user-owned/release gates under AGENTS.md.

## Approved phase map

| Subphase | Outcome | Depends on | Exit evidence | Commit |
| --- | --- | --- | --- | --- |
| 5.1 | Bills list and filters | Phase 4 | Today's Sales, search, simple filters, cards, and loading/empty/error states | pending |
| 5.2 | Sale Details and Draft recovery | 5.1 | Full Sale details, receipt access, Draft resume/delete, and receipt actions | pending |
| 5.3 | Customer Directory | Phase 3, 5.1 | Search, filters, sorting, details, add/edit, and Sales history | pending |
| 5.4 | Reports | 5.1 | Read-only Today summary, date filter, and Products Sold | pending |
| 5.5 | Settings and Appearance | Phase 1, 5.1 | Language, theme, display size, printer entry, Store/Device info, and Logout | pending |

## Shared Phase 5 decisions

- Bills use the existing Store Device Sales list service and remain scoped to
  the authenticated Organization, Store, and Device.
- The default Bills query is today's Sales using the server's ISO date bounds;
  search and filters are sent to the server rather than filtering an arbitrary
  first page locally.
- Filters stay behind one simple filter action. Everyday billing should not
  require opening a filter panel.
- Sale cards show server Sale number, date/time, Customer or Walk-in, total,
  and Payment status. Server values remain authoritative.
- Cursor pagination is preserved as a server boundary. A later subphase may
  add a simple load-more action, but it must not silently claim that the first
  page is the complete history.
- Draft Sales remain distinct from committed Sales. Draft recovery must reuse
  the existing Draft identity and Cart payload boundaries.
- Receipt actions remain secondary and must never mutate or recreate a Sale.

## 5.1 — Bills list and filters

### Plan

User-facing outcome: from the POS workspace, a cashier can open Bills and see
today's Sales, search by Sale number or Customer information, optionally filter
by date, Payment status, or Payment method, and open a clear Sale card without
leaving the Store-scoped POS context.

Implementation scope:

- Replace the Bills placeholder with a dedicated Bills screen.
- Add a server-backed `usePosSales` query boundary scoped to the active POS
  session and keyed by the complete query state.
- Build today's date range in the device's local calendar and send ISO bounds
  to the existing `getPosSales` service. Keep the date-range helper pure and
  test it at the boundary.
- Add deferred Sale/Customer search, a compact filter action, and supported
  Payment status (`all`, `paid`, `partial`, `due`) and Payment method (`all`,
  `cash`, `upi`, `card`) choices. Keep applied filters visible and removable.
- Render server Sale cards with Sale number, date/time, Customer/Walk-in,
  total, and translated Payment status. Preserve a clear path to Sale Details
  for 5.2 without inventing detail data in this slice.
- Handle loading, empty, failed-request, retry, and no-results states in all
  three interface languages.
- Preserve server pagination metadata and expose a safe load-more seam only if
  the existing mobile screen can do so without claiming full history.

Acceptance criteria:

1. Bills is a real route and defaults to the current day's Sales.
2. Search is sent to the Sales service and supports Sale number and Customer
   information through the existing server contract.
3. Date, Payment status, and Payment method filters map to supported
   `SalesListQuery` fields without client-side first-page filtering.
4. Sale cards show Sale identity, date/time, Customer/Walk-in, total, and
   server Payment status.
5. Loading, empty, no-results, failed-request, and retry states are clear and
   translated in English, Gujarati, and Hindi.
6. Query keys include the active Organization/Store/Device scope and all
   applied query values.
7. The screen does not create, update, settle, delete, or mutate a Sale.

Non-goals:

- Full Sale Details, Draft recovery, reprint, WhatsApp, or printer actions;
  those belong to 5.2 and Phase 6.
- Customer Directory behavior; it belongs to 5.3.
- Local caching that presents stale first-page data as complete history.

Dependencies and public seams:

- `getPosSales`, `SalesListQuery`, `SalesListResponse`, and `SaleSummaryDTO`.
- Active POS session scope and existing query-key conventions.
- `PaymentStatus`, `PaymentMethod`, and the server's date/sort contract.
- Typed `Bills` route and the existing internal POS UI primitives.

Data and navigation effects:

- Add only a Bills-specific query and presentation boundary; do not change the
  shared Sales service contract.
- Keep the screen read-only. Sale card navigation should establish the typed
  5.2 route seam but must not fabricate a Sale Details implementation.
- Use the server's `pageInfo` and avoid loading all historical Sales into local
  state.

Test strategy:

- Pure tests for today's date bounds, query normalization, filter mapping, and
  Sale card presentation data.
- Focused mobile tests for server success, empty results, service failure,
  scoped query keys, and translated state keys.
- Run `bun run --cwd apps/mobile test` and `git diff --check` only. Do not run
  builds, Expo, Android, emulator, device, or hardware commands.

Risks and rollback:

- Local timezone boundaries can omit or include the wrong Sale if UTC bounds
  are built incorrectly; test dates around midnight explicitly.
- Search and filters must remain server-backed so pagination does not create
  false results.
- Keep the placeholder-to-screen change isolated so it can be reverted without
  touching Phase 4 checkout or receipt code.

### Internal plan review

Reviewed on 2026-09-06 against `spec.md` sections 6 and 18, Phase 5 roadmap,
the existing `getPosSales` and `SalesListQuery` contracts, `CONTEXT.md`, ADR
0001, ADR 0003, and the no-build safety rule in `AGENTS.md`.

The plan preserves the simple UX, uses server-backed search/filter semantics,
keeps Store Device scope, does not add Sale mutation or receipt behavior ahead
of 5.2/Phase 6, and leaves pagination explicit. No new product or public API
decision is required for 5.1.

Plan review result: approved for implementation.

### 5.1 Implementation and review result

Implemented on 2026-09-06 in the mobile POS workspace:

- Replaced the Bills placeholder route with a Store Device-scoped, infinite
  Sales query using the existing `getPosSales` service and `SalesListQuery`.
- Defaulted Bills to the device-local current day, normalized search input, and
  mapped Date, Payment status, and Payment method filters to server fields.
- Explicitly requested completed Sales so Draft Sales remain separate for 5.2.
- Added translated loading, failure/retry, no-Sales, no-match, and pagination
  states in English, Gujarati, and Hindi.
- Added server Sale cards with Sale number, date/time, Customer or Walk-in,
  total, and authoritative Payment status. Cards now have a typed navigation
  seam to the 5.2 Sale Details route, whose detail behavior remains deferred.
- Added visible, removable applied-filter summaries and selected-state
  accessibility metadata for filter controls.
- Added pure coverage for local-day bounds, query mapping, completed-only
  filtering, response unwrapping, scoped query keys, and all interface-language
  copy.

Review findings and fixes:

- Fixed a TypeScript mismatch for API timestamps that may be `string | Date`.
- Fixed a stale memoized “Today” query boundary across calendar-day changes.
- Fixed Draft Sales appearing as Due Bills by sending `status: "completed"`.
- Fixed existing Customers falling back to Walk-in when only nested Customer
  data was present.
- Kept the screen read-only; no Sale mutation or receipt action was added.

Verification evidence:

- `bun run --cwd apps/mobile test`: 84 passed, 0 failed.
- `git diff --check`: passed.
- `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json`: the Phase 5
  files typecheck; the command remains red only on the pre-existing missing
  `@repo/assets/services/whatsapp.webp` import in `login-screen.tsx`.
- Build, Expo, Android, emulator, device, live API, and hardware checks were
  intentionally not run under `AGENTS.md`.

Subphase review result: approved with the named pre-existing typecheck and
native/live validation follow-ups. The next subphase is 5.2 Sale Details and
Draft recovery.

## 5.2 — Sale Details and Draft recovery

### Plan

User-facing outcome: from Bills, a cashier can inspect the complete server Sale
or switch to Drafts, reopen a saved Draft in the existing Cart flow, and safely
discard a Draft after confirmation. Receipt preview and Android share remain
available for completed Sales using the existing English digital-receipt
boundary.

Implementation scope:

- Replace the 5.1 Sale Details seam with a server-backed Sale Details screen
  using `getPosSale` and a scope-aware query key.
- Show Sale identity, date/time, Customer or Walk-in, line items, configured
  component names, subtotal/discount/total, Payment rows, and authoritative
  Payment status.
- Add completed-Sale receipt preview and share actions by reusing the existing
  `pos-receipt-boundary`; these actions remain read-only.
- Add a Drafts view from Bills using the existing Sales list with
  `status: "draft"`, preserving Draft separation from completed Bills.
- Add Draft Details actions to resume or discard. Resume must resolve Draft
  product IDs against the current Store Device Catalog before writing the
  existing scoped Cart state; an unavailable Product or incomplete
  configuration must show a recoverable error rather than inventing prices or
  silently dropping lines.
- Keep the existing Draft identity and request-id boundaries when resuming;
  do not create a replacement Draft during inspection or resume.
- Confirm destructive Draft discard, invalidate relevant Sales/Draft queries,
  and return to the correct Bills view after successful actions.

Acceptance criteria:

1. Tapping a completed Sale from Bills loads its server-authoritative details
   and shows line items, totals, Customer/Walk-in, and Payment status.
2. Completed Sale receipt preview/share work without changing Sale data and
   preserve the English-only receipt content rule.
3. Drafts are discoverable separately from completed Bills and are never shown
   as Due completed Sales.
4. A valid Draft can be resumed into the existing Cart with its Customer,
   discount, configured selections, and Draft ID preserved.
5. An invalid or stale Draft is not partially resumed; the cashier gets a clear
   recoverable error and the Draft remains intact.
6. Draft discard requires confirmation, deletes only the selected Draft, and
   refreshes the Draft view after success.
7. Sale Details and Draft actions remain scoped to the active Organization,
   Store, and Device and do not add a backend contract.

Non-goals:

- Editing a completed Sale, collecting a Due balance, voiding/replacing a Sale,
  or changing Payment data.
- Bluetooth printing; printer actions remain Phase 6.
- Offline Draft synchronization or recovery across Devices.

Dependencies and public seams:

- Existing `getPosSale`, `getPosSales`, Draft create/update/delete services,
  `usePosDraftActions`, `usePosCatalog`, Cart store, and receipt/share boundary.
- Typed `SaleDetails: { saleId: string }` route created in 5.1.
- Existing server Sale Detail DTO and configured item snapshots.

Test strategy:

- Pure tests for Draft-to-Cart hydration, configuration completeness, and
  rejection of missing Catalog Products.
- Focused tests for detail response unwrapping, Draft status query separation,
  scoped keys, and read-only receipt action reuse.
- Run mobile focused tests, `tsc --noEmit` only for lightweight type feedback,
  and `git diff --check`. Do not run builds, Expo, Android, emulator, device,
  live API, share-sheet, or hardware commands.

Risks and rollback:

- Server Draft snapshots may reference archived Products or incomplete combo
  groups; resume must fail atomically and retain the Draft.
- Query invalidation must not clear the current Cart or Draft identity until a
  resume has succeeded.
- Keep completed-Sale detail and Draft recovery transformations in pure
  boundaries so this subphase can be reverted without changing checkout.

### Internal plan review

Reviewed on 2026-09-06 against `spec.md` sections 6, 7, 18, and 19, the Phase 5
roadmap, existing POS Sales/Draft/Catalog services, current Cart state, receipt
boundary, `CONTEXT.md`, ADR 0001, ADR 0003, and `AGENTS.md` validation safety.

The plan keeps completed Sales and Draft Sales separate, preserves server
authority and Store Device scope, reuses the existing Cart and receipt seams,
and adds no product or public API decision. Atomic Draft hydration is required
to avoid silently losing stale configured lines.

Plan review result: approved for implementation.

### 5.2 Implementation and review result

Implemented on 2026-09-06:

- Replaced the Sale Details seam with a scoped `getPosSale` query and a full
  read-only detail screen for completed, Draft, and voided Sales.
- Added server-detail line items, configured component presentation, Customer
  or snapshot Walk-in fallback, totals, Payment rows, authoritative status, and
  English receipt preview/share for completed Sales.
- Added a separate Drafts view in Bills backed by `status: "draft"`; completed
  Bills remain explicitly queried with `status: "completed"`.
- Added atomic Draft-to-Cart hydration against the current Product Catalog and
  active Combo/Add-on configuration. Missing Products, stale Add-ons/options,
  and incomplete combo groups leave the Draft untouched and show a recoverable
  error.
- Preserved the Draft Sale ID in the scoped Cart, guarded restoration against a
  changed active scope, and confirmed before replacing non-empty Cart work.
- Added confirmed Draft discard, scoped query invalidation, and return to Bills
  after successful deletion. Voided Sales remain read-only.

Review findings and fixes:

- Added the current configuration boundary and handled fixed bundle components
  without incorrectly requiring a choice-group ID.
- Suppressed stale detail actions when the detail refetch fails.
- Fixed Draft-view filter reset to retain the all-dates Draft query.
- Added focused tests for atomic recovery, missing data, response failures,
  detail scope keys, every translation, and active Cart scope protection.

Verification evidence:

- `bun run --cwd apps/mobile test`: 90 passed, 0 failed.
- `git diff --check`: passed.
- `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json`: the Phase 5.2
  files typecheck; the command remains red only on the pre-existing missing
  `@repo/assets/services/whatsapp.webp` import in `login-screen.tsx`.
- Build, Expo, Android, emulator, device, live API, share-sheet, and hardware
  checks were intentionally not run under `AGENTS.md`.

Subphase review result: approved with the named pre-existing typecheck and
native/live validation follow-ups. The next subphase is 5.3 Customer Directory.

## 5.3 — Customer Directory

### Plan

User-facing outcome: a POS user can open Customers without leaving the billing
workspace, search the server-backed Customer Directory by name or phone, apply
one simple status filter and sort order, inspect a Customer, add or edit a
Customer, and view that Customer's Sales history. The fast Cart Customer picker
remains a separate flow.

Implementation scope:

- Replace the Customers placeholder with a dedicated Directory screen and a
  typed Customer Details route.
- Add a Store Device-scoped Customer list query using the existing POS Customer
  list contract with progressive search, active/all/due status, sort, and cursor
  pagination.
- Add Customer Details with server-backed Customer data and read-only
  customer-filtered Sales history using `getPosSales`.
- Reuse the approved minimal Customer create/edit validation and POS create/
  update services. Invalidate Customer and related Sales queries after success.
- Keep Walk-in out of the Directory, preserve current-Sale selection as an
  optional action, and never require a Customer before Payment.
- Provide translated loading, empty, failure/retry, save, and validation states
  in English, Gujarati, and Hindi.

Acceptance criteria:

1. Customers is separate from New Sale and supports server-backed name/phone
   search without first-page-only filtering.
2. Status and sort controls map to existing `CustomerListQuery` fields.
3. Customer Details shows identity, phone, active state, balance, and read-only
   Sales history scoped to the selected Customer.
4. Add and edit use existing POS services, preserve validation, and refresh the
   Directory after success.
5. Failed reads and writes preserve entered data and provide retry feedback.
6. All Customer queries include active Organization/Store/Device scope and no
   backend contract changes are introduced.

Non-goals:

- Ledger settlement, collecting Customer dues, marketing/WhatsApp controls, or
  bulk Customer import.
- Replacing the fast Cart Customer picker or forcing Customer selection.

Dependencies and public seams:

- Existing `getPosCustomers`, `createPosCustomer`, `updatePosCustomer`,
  `getPosSales`, Customer DTOs, and current create validation boundary.
- Typed Customer Details route and existing POS query-key/session conventions.

Test strategy:

- Pure tests for Customer query normalization, status/sort mapping, scope keys,
  and save payload normalization.
- Focused tests for Customer/Sales response unwrapping and all translations.
- Run mobile focused tests, `tsc --noEmit` only for lightweight type feedback,
  and `git diff --check`; never run builds, Expo, Android, emulator, device,
  live API, or hardware commands during incomplete phases.

### Internal plan review

Reviewed on 2026-09-06 against `spec.md` Customer Directory decisions, existing
POS Customer/Sales services, Customer validation, `CONTEXT.md`, ADR 0001, and
`AGENTS.md`. The plan keeps the Directory separate from billing, uses existing
contracts, and adds no product or public API decision.

Plan review result: approved for implementation.

### 5.3 Implementation and review result

Implemented on 2026-09-06:

- Replaced the Customers placeholder with a separate server-backed Directory
  and typed Customer Details route.
- Added progressive name/phone search, active/all/due/inactive status filters,
  name/newest sorting, cursor pagination, and translated empty/loading/error
  states.
- Added minimal Customer creation and editing through existing POS services,
  including explicit phone clearing, field-level validation, and refresh of
  Customer and related Sales queries.
- Added Customer Details identity, phone, active state, balance, optional use
  in the current Sale, editable fields, and read-only Customer Sales history
  with retry feedback.

Review findings and fixes:

- Added active/inactive state presentation and the current-Sale Customer action.
- Added Sales-history retry handling and field-specific edit validation.
- Fixed empty edited phone values to send an explicit `null` clear to the API.
- Added query normalization and preserved Organization/Store/Device scope.

Verification evidence:

- `bun run --cwd apps/mobile test`: 92 passed, 0 failed.
- `git diff --check`: passed.
- `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json`: the Phase 5
  files typecheck; the command remains red only on the pre-existing missing
  `@repo/assets/services/whatsapp.webp` import in `login-screen.tsx`.
- Build, Expo, Android, emulator, device, live API, and hardware checks were
  intentionally not run under `AGENTS.md`.

Subphase review result: approved with the named pre-existing typecheck and
native/live validation follow-ups. The next subphase is 5.4 Reports.

## Subphase status

| Subphase | Status | Evidence / follow-up |
| --- | --- | --- |
| 5.1 Bills list and filters | Completed with follow-up | 84 focused tests pass; native/live validation and the pre-existing asset typecheck remain follow-ups |
| 5.2 Sale Details and Draft recovery | Completed with follow-up | 90 focused tests pass; native/live validation and the pre-existing asset typecheck remain follow-ups |
| 5.3 Customer Directory | Completed with follow-up | 92 focused tests pass; native/live validation and the pre-existing asset typecheck remain follow-ups |
| 5.4 Reports | In progress — planning | Read-only Today summary, simple date filter, and Product Sales Summary |
| 5.5 Settings and Appearance | Not started | Uses existing localization, storage, and session boundaries |

## 5.4 — Reports

### Plan

User-facing outcome: an authorized POS user can open Reports and quickly see
the operational Sales picture for Today or all available dates, without
editing Sales or entering an analytics workflow.

Implementation scope:

- Replace the Reports placeholder with a read-only Reports screen.
- Default the period to Today and provide a simple Today/All dates filter.
- Reuse `getPosSales` with completed Sales and the existing Sales-list summary
  fields for Sales count, Sales value, collected amount, and due amount.
- Calculate average Sale value from the server summary when the completed
  Sales count is non-zero.
- Reuse `getPosProductSalesSummary` for a Product name/category/quantity list.
- Scope both queries by the active Organization, Store, and Device through
  query keys, while leaving server authority with the existing service calls.
- Provide translated loading, empty, error, and retry states in all three
  approved interface languages.

Acceptance criteria:

1. Reports opens from the authenticated POS workspace and defaults to Today.
2. Switching the date filter changes both report requests using the same local
   day bounds; All dates omits date bounds.
3. The screen shows Sales count, Sales value, collected amount, due amount,
   and average Sale value from the existing server summary.
4. The screen shows Products Sold with Product name and quantity, preserving
   the existing Product Sales Summary contract.
5. Reads are read-only, scoped, retryable, and visibly handle loading, empty,
   and failure states.
6. No backend or printer/reporting contract changes are introduced.

Non-goals:

- Complex charts, advanced analytics, exports, mutations, or report editing.
- Per-product value until the existing Product Sales Summary contract exposes
  a value field; this contract gap is recorded as a follow-up.

Dependencies and public seams:

- Existing `getPosSales`, `getPosProductSalesSummary`, `SalesListSummary`,
  `ProductSalesSummaryDTO`, and POS session scope.
- Existing Uniwind POS primitives, i18next namespace, and navigation stack.
- Existing `getPosTodayBounds` timezone behavior for local calendar days.

Test strategy:

- Pure boundary tests for date query construction, average calculation,
  scope-aware query keys, response unwrapping, and failure handling.
- Translation-key coverage for the new Reports labels and states.
- Run `bun run --cwd apps/mobile test`, mobile `tsc --noEmit` only for
  lightweight type feedback, and `git diff --check`.
- Do not run builds, Expo, Android, emulator, device, live API, share-sheet,
  or hardware commands while planned POS mobile phases remain incomplete.

### Internal plan review

Reviewed on 2026-09-07 against `spec.md` Reports decisions, existing POS Sales
and Product Sales Summary services/types, the POS session/query-key patterns,
`CONTEXT.md`, ADR 0001, and `AGENTS.md` validation safety.

The plan reuses existing server summaries and keeps the Reports workspace
read-only. Average Sale value is a deterministic presentation calculation. The
shared Product Sales Summary DTO currently exposes quantity but no per-product
value, so that requested field is explicitly deferred as a contract follow-up
instead of creating an unapproved API change.

Plan review result: approved for implementation with the named Product value
contract follow-up.

### 5.4 Implementation and review result

Implemented on 2026-09-07:

- Replaced the Reports placeholder with a read-only Reports workspace.
- Added a Today default and an All dates filter using the shared local-day
  bounds behavior for both report requests.
- Added Store Device-scoped Sales and Product Sales Summary query keys and
  service-response unwrapping with retryable failure states.
- Added Sales count, Sales value, collected amount, due amount, and average
  Sale value from the server summary; average value is calculated only when
  completed Sales exist.
- Added the Products Sold list with Product name, optional category, and
  quantity, preserving the existing shared DTO.
- Added English, Gujarati, and Hindi Reports labels, loading, empty, and
  failure copy, plus focused boundary and translation tests.

Review findings and fixes:

- Reused the existing `getPosTodayBounds` boundary rather than duplicating
  local-calendar calculations.
- Fixed the initial test to construct expected day bounds in the runtime's
  local timezone instead of assuming a particular machine timezone.
- Switched the focused test import to the repository's `bun:test` convention
  so mobile TypeScript feedback remains limited to the known baseline issue.
- Confirmed the current Product Sales Summary contract has no per-product
  value field; per-product value remains a documented API follow-up and no
  backend contract was changed.

Verification evidence:

- `bun run --cwd apps/mobile test`: 96 passed, 0 failed, 366 assertions.
- `git diff --check`: passed.
- `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json`: all new
  Reports files typecheck; the command remains red only on the pre-existing
  missing `@repo/assets/services/whatsapp.webp` import in `login-screen.tsx`.
- Build, Expo, Android, emulator, device, live API, share-sheet, and hardware
  checks were intentionally not run under `AGENTS.md`.

Subphase review result: approved with the named pre-existing typecheck,
native/live validation, and Product value contract follow-ups. The next
subphase is 5.5 Settings and Appearance.

## 5.5 — Settings and Appearance

### Plan

User-facing outcome: an authorized POS user can adjust the small set of daily
preferences needed for comfortable use, inspect non-sensitive Store and Device
identity, see where printer setup belongs, and log out safely.

Implementation scope:

- Replace the Settings placeholder with a dedicated Settings screen.
- Provide English, Gujarati, and Hindi selection through the existing
  i18next/MMKV language boundary.
- Provide Light, Dark, and System theme selection through the existing Uniwind
  theme setter and persist the preference in the existing MMKV preference
  store, including restoration during app startup.
- Provide Standard and Large display-size choices and persist the choice in
  MMKV for the approved preference boundary.
- Show a printer-settings entry state that clearly hands hardware discovery,
  connection, disconnection, and test print to Phase 6; do not add Bluetooth
  code or claim hardware support in this phase.
- Show Organization, Store, and Device names/identity fields without secrets.
- Reuse one session logout mutation for the POS shell and Settings, clearing
  the existing session/cart/payment/completed-Sale state on success.
- Add translated labels, selections, printer deferral, and session states in
  all three approved interface languages.

Acceptance criteria:

1. Settings opens from the authenticated POS workspace and exposes all three
   approved interface-language choices.
2. Language changes immediately through i18next and persist through MMKV.
3. Light, Dark, and System choices update Uniwind and persist; the selected
   preference is restored on app startup.
4. Standard and Large display-size choices persist and are visibly selectable
   without reducing the approved touch-target minimum.
5. Store and Device information is visible without a Device secret or token.
6. Printer setup has a clear Phase 6 entry state and does not perform
   unsupported hardware actions in Phase 5.
7. Logout uses the existing server/session boundary and preserves active state
   on a failed logout.
8. No backend, printer, or public API contract changes are introduced.

Non-goals:

- Bluetooth discovery, pairing, connection, disconnection, or test printing;
  those remain Phase 6.
- Advanced receipt customization, cashier shortcuts, account management, or
  changing Store/Device identity.
- Reworking every existing screen's typography; the display-size preference is
  persisted at this boundary and its full visual calibration remains a
  device-validation follow-up.

Dependencies and public seams:

- Existing `POS_PREFERENCE_KEYS`, MMKV-backed `posStorage`, `setAppLanguage`,
  i18next provider, Uniwind runtime, `DeviceSessionDTO`, and `deviceLogout`.
- Existing POS state cleanup and lifecycle transitions used by the POS shell.

Test strategy:

- Pure appearance-boundary tests for supported values, invalid-value fallback,
  and preference defaults.
- Focused localization coverage for Settings copy in English, Gujarati, and
  Hindi.
- Run `bun run --cwd apps/mobile test`, mobile `tsc --noEmit` only for
  lightweight type feedback, and `git diff --check`.
- Do not run builds, Expo, Android, emulator, device, live API, share-sheet,
  printer, or hardware commands while planned POS mobile phases remain
  incomplete.

### Internal plan review

Reviewed on 2026-09-07 against `spec.md` Settings decisions, existing MMKV,
i18next, Uniwind, Device Session, and logout boundaries, `CONTEXT.md`, ADR
0001, and `AGENTS.md` validation safety.

The plan reuses existing persistence and runtime boundaries, keeps printer
hardware in Phase 6, avoids secrets, and extracts the already-approved logout
behavior so the shell and Settings cannot drift. Display size is recorded and
selectable now while broad device typography calibration remains an explicit
follow-up rather than an unverified claim.

Plan review result: approved for implementation with the named printer and
device-visual follow-ups.

### 5.5 Implementation and review result

Implemented on 2026-09-07:

- Replaced the Settings placeholder with a dedicated Settings workspace.
- Added immediate English, Gujarati, and Hindi switching through the existing
  i18next language setter and MMKV preference.
- Added Light, Dark, and System theme selection using Uniwind, with persisted
  preference restoration during app startup.
- Added Standard and Large display-size preference selection backed by MMKV;
  the broad visual calibration remains a device-validation follow-up.
- Added Store, Device, and Organization identity display without secrets.
- Added a clear printer-settings entry state that explains the Phase 6
  Bluetooth implementation boundary and performs no unsupported hardware work.
- Extracted the existing logout mutation into a shared POS hook and reused it
  from both the POS shell and Settings so success cleanup and failed-logout
  recovery remain consistent.
- Added focused appearance-boundary tests and Settings translation coverage.

Review findings and fixes:

- Preserved the existing server logout behavior and all Cart, Payment, and
  completed-Sale cleanup while removing duplicate shell code.
- Used Uniwind's reactive theme hook for the active-theme presentation so
  system-theme changes are reflected while Settings is open.
- Validated persisted preference values through explicit allowlists with safe
  defaults; invalid MMKV values cannot select an unsupported theme or size.
- Kept printer discovery, pairing, connection, disconnection, and test print
  out of Phase 5 as required by the Phase 6 boundary.
- Confirmed no Device secret, auth token, backend contract, or printer native
  dependency was added.

Verification evidence:

- `bun run --cwd apps/mobile test`: 98 passed, 0 failed, 423 assertions.
- `git diff --check`: passed.
- `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json`: all new
  Settings/appearance files typecheck; the command remains red only on the
  pre-existing missing `@repo/assets/services/whatsapp.webp` import in
  `login-screen.tsx`.
- Build, Expo, Android, emulator, device, live API, share-sheet, printer, and
  hardware checks were intentionally not run under `AGENTS.md`.

Subphase review result: approved with the named pre-existing typecheck,
printer, and device-visual validation follow-ups. Phase 5 is ready for its
phase-level closeout review.
