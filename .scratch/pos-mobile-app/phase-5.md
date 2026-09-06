# POS Mobile App — Phase 5 Execution Plan and Review Log

Status: Phase 5 in progress — 5.1 Bills list and filters completed with follow-up
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

## Subphase status

| Subphase | Status | Evidence / follow-up |
| --- | --- | --- |
| 5.1 Bills list and filters | Completed with follow-up | 84 focused tests pass; native/live validation and the pre-existing asset typecheck remain follow-ups |
| 5.2 Sale Details and Draft recovery | Not started | Depends on Bills navigation and Sale data boundary |
| 5.3 Customer Directory | Not started | Uses existing Customer services and remains separate from billing |
| 5.4 Reports | Not started | Read-only summary and Product Sales Summary |
| 5.5 Settings and Appearance | Not started | Uses existing localization, storage, and session boundaries |
