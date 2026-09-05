# POS Mobile App — Phase 4 Execution Plan and Review Log

Status: Phase 4 in progress
Phase: 4 — Payment and Sale completion
Scope: Android-only Ganatri POS mobile application
Started: 2026-09-05

This document is the execution record for Phase 4. Each subphase follows the
approved phase-loop lifecycle: plan, internal review, implementation,
verification, standards/spec review, status update, and focused commit.

## Phase outcome

Convert the reviewed Cart into one confirmed Sale with clear settlement and
receipt access. The phase exit condition is that a POS user can complete a
normal, Partial, Due, or multiple-Payment Sale without duplicate submission and
reach Sale Complete. Final totals, Payment records, Payment status, Sale number,
and receipt data remain server-authoritative.

## Scope guardrails

Included in this phase:

- Cash, UPI, and Card Payment entry.
- One simple default Payment row plus optional additional Payment rows.
- Paid, Partial, and Due status display with amount/remaining feedback.
- Separate checkout adapters for a new Cart, an existing Draft Sale, later
  Payment collection, and future Table checkout.
- Stable request identifiers and controlled retry/recovery for checkout.
- Sale Complete confirmation with server Sale details.
- Digital receipt display and Android sharing as secondary actions.

Not included in this phase:

- Bluetooth printer hardware, printer discovery, or physical print validation
  (Phase 6).
- Bills list/detail browsing or Draft browsing UI (Phase 5).
- Table operations, KOT, or restaurant-specific checkout (Phase 7).
- Payment terminal or QR integration; UPI and Card are recorded methods only.
- Android build, emulator, physical-device, live API, or migration validation;
  those remain explicit user-owned/release gates.

## Approved phase map

| Subphase | Outcome | Depends on | Exit evidence | Commit |
| --- | --- | --- | --- | --- |
| 4.1 | Payment entry | Phase 3 | Cash/UPI/Card rows, optional additional rows, and local validation work | `2eacaab` |
| 4.2 | Payment status | 4.1 | Paid/Partial/Due follows server-backed totals and collected values | `e6c9098` |
| 4.3 | Checkout adapter | 4.1–4.2 | New Cart, Draft commit, later collection, and retry paths are separated | Pending |
| 4.4 | Sale Complete screen | 4.3 | Confirmed Sale details and New Sale action work | Pending |
| 4.5 | Digital receipts and sharing | 4.4 | Receipt display/share failures never change the completed Sale | Pending |

## Shared Phase 4 decisions

- Payment rows represent money actually collected; unpaid balance is never
  represented as a fake Payment or discount.
- A normal new Sale uses the direct complete-Sale operation. A previously saved
  Draft uses Draft commit. A later Payment against a committed Due/Partial Sale
  uses Payment collection. Table checkout remains a separate later adapter.
- The mobile UI may calculate collected and remaining amounts for immediate
  feedback, but server totals and Payment status decide the recorded result.
- Complete Sale is one primary action. Repeated taps are disabled locally, and
  retry after an unknown result uses the same request identifier or first
  recovers the Sale state.
- Payment entry remains local until the approved checkout boundary; no Payment
  record is created while the cashier is merely editing rows.
- Cash, UPI, and Card are the V1 mobile methods. Bank Transfer and Other are
  not added to this first mobile Payment flow.

## 4.1 — Payment entry

### Plan

User-facing outcome: after Cart Review, a cashier sees the amount to settle,
starts with one Cash Payment row, can switch it to UPI or Card, and can add or
remove additional Payment rows when the customer pays with more than one
method.

Implementation scope:

- Add a pure Payment-entry boundary for supported methods, stable local row
  identity, numeric amount parsing, valid server Payment payload mapping, and
  local collected/remaining calculations.
- Add a scoped local Payment store keyed by the active Organization/Store/Device
  context. Keep Payment edits in memory only; do not put in MMKV and do not
  create server Payment records from row edits.
- Initialize one Cash row with the current Cart display total as a convenience
  for ordinary full Cash billing. Treat an empty/zero row as no collected
  Payment so a Due Sale can proceed in the later checkout adapter.
- Add the Payment route and focused Payment screen reachable from Cart Review.
  Show server-authoritative Cart/Draft total context, editable method and
  amount, add-payment-row, remove-row, and back-to-Cart actions.
- Keep additional rows visibly secondary so one-method billing remains the
  shortest path.
- Validate positive Payment amounts, finite numeric input, supported methods,
  and total collected not exceeding the current local settlement base. Do not
  silently round or send invalid rows.
- Preserve entered rows when navigating back to Cart and when a recoverable
  later checkout request fails. Reset Payment rows only at explicit Sale/Draft
  session boundaries.
- Add English, Gujarati, and Hindi labels for methods, amounts, row actions,
  validation, and navigation.

Acceptance criteria:

1. The Payment screen is reachable from Cart Review without creating a Sale or
   Payment record.
2. One Cash row exists by default and is convenient for a full-payment Sale.
3. The cashier can select Cash, UPI, or Card for each row.
4. The cashier can add and remove optional rows without losing other rows.
5. Empty/zero rows represent no collected Payment locally and do not become
   invalid server Payment payloads.
6. Positive finite amounts are accepted; malformed, negative, and over-total
   amounts are rejected with a translated message.
7. Collected and remaining values update immediately for cashier feedback, but
   are labelled as pending server confirmation.
8. Payment rows remain scoped to the active POS Device and survive back-to-Cart
   navigation without entering MMKV.

Non-goals:

- Paid/Partial/Due server status, checkout requests, request-id retry, Sale
  completion, receipt access, or Payment collection for an existing Sale.
- Bank Transfer, Other, terminal integration, QR generation, refunds, or
  payment editing after the Sale is completed.
- Client-side replacement of server totals, tax, discount, or payment rules.

Dependencies and public seams:

- Phase 3 Cart Review, Draft identity, Customer, discount, and display-total
  boundaries.
- Shared `CreatePaymentJSON`, `CompleteSaleJSON`, `CommitSaleJSON`, Payment
  method, and Sale response types.
- Existing POS UI primitives, navigation stack, localization resources, and
  scoped session snapshot.

Test strategy and expected checks:

- Add pure Payment boundary tests for default rows, method changes, parsing,
  positive/zero/invalid amounts, over-total validation, and payload mapping.
- Add Payment-store tests for add/remove/update behavior, scoped isolation,
  back-navigation preservation, and explicit reset.
- Add focused screen/navigation seam tests where the existing mobile test
  setup supports them.
- Run `bun run --cwd apps/mobile test`.
- Run the mobile TypeScript check and separate the known WhatsApp asset error.
- Run `git diff --check`; do not run Android builds or device commands.

Risks and rollback:

- Payment rows must not be confused with Payment records; only checkout
  adapters may send valid rows to the server.
- A default full Cash amount is a convenience based on the current local
  display total, not an authority. Server totals may differ at checkout.
- Payment rows must reset when the active Store Device session or Sale context
  is explicitly cleared, preventing cross-Sale or cross-Device leakage.
- Rollback is limited to the Payment boundary/store/screen/route/localization
  changes; Phase 3 Cart and Draft behavior remains independently committed.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, `CONTEXT.md`, ADR 0001, ADR 0003,
ADR 0016, the existing shared billing schemas/services, and the completed
Phase 3 Cart/Draft boundaries. The plan preserves the approved simple UX,
keeps one-method billing short, separates local Payment rows from server
Payment records, supports only Cash/UPI/Card, and leaves server status and
checkout semantics to later Phase 4 slices. No new product or API decision is
required for 4.1.

Plan review result: approved for implementation.

### 4.1 Implementation and review result

Implemented the local Payment-entry slice with the approved simple UX:

- Added Cash, UPI, and Card Payment rows with one default Cash row initialized
  from the current Cart display total.
- Added optional Payment rows, row removal that retains one editable row,
  immediate collected/remaining calculations, and local malformed/negative/
  over-total validation.
- Added server-input mapping that omits empty/zero rows and keeps Payment
  records out of local row editing.
- Added an in-memory Payment store scoped to Organization/Store/Device. Rows
  survive Cart navigation but are cleared at logout; they are not persisted in
  MMKV.
- Added the Payment route and screen from Cart Review with translated English,
  Gujarati, and Hindi labels and the server-authority reminder.

Review evidence:

- `bun run --cwd apps/mobile test`: 61 passed, 0 failed.
- `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json`: new Phase
  4.1 code is type-clean; the repository still reports the pre-existing
  `apps/mobile/src/screens/login-screen.tsx` missing
  `@repo/assets/services/whatsapp.webp` module.
- `git diff --check`: passed.
- Android build, emulator, device, live API, and printer checks were not run,
  as defined by the phase guardrails.

Implementation review result: approved with the named asset/native/device/API
follow-ups. Phase 4.2 can add server-backed Payment status without changing
the local Payment-row boundary.

## 4.2 — Payment status

### Plan

User-facing outcome: after a Sale response is available, the cashier sees one
clear status—Paid, Partial, or Due—with the server's collected and remaining
amounts. Before checkout returns a Sale, the Payment screen continues to show
the local staged summary as pending confirmation rather than claiming that a
Sale has been paid.

Implementation scope:

- Add a pure status presentation boundary that accepts the shared server
  `SaleSummaryDTO` payment fields and maps `pending` to the cashier-facing Due
  label, while preserving `partial` and `paid`.
- Keep `sale.paymentStatus` as the status authority. Use server `grandTotal`,
  `paidTotal`, and `dueTotal` for displayed amounts; do not recompute a
  replacement status from local Payment rows.
- Add translated status labels and short explanations for Paid, Partial, and
  Due in English, Gujarati, and Hindi. Keep the status tone semantic: success
  for Paid, warning for Partial/Due, and neutral only for a not-yet-confirmed
  local checkout state.
- Add a small reusable mobile status presentation component using the existing
  `PosStatusBadge` primitive. It must render from a server Sale summary and
  remain independent of the future checkout mutation.
- Add focused boundary/component tests covering all three server statuses,
  exact server amounts, and the rule that local staged totals cannot override a
  server status.
- Keep this slice read-only with respect to billing records. Checkout,
  collection, retries, and Sale Complete remain in 4.3–4.5.

Acceptance criteria:

1. A server Sale with `paymentStatus: "paid"` renders Paid with success tone
   and the server paid/due values.
2. A server Sale with `paymentStatus: "partial"` renders Partial with warning
   tone and the server paid/due values.
3. A server Sale with `paymentStatus: "pending"` renders Due with warning tone
   and the server due value; the raw API status remains pending in the
   boundary model.
4. A conflicting local total or arithmetic assumption cannot change the
   server-provided status or amounts.
5. All new user-facing status strings are available in English, Gujarati, and
   Hindi, with existing English fallback behavior intact.
6. Focused mobile tests pass and the known missing WhatsApp asset is still
   reported separately by the mobile TypeScript check.

Non-goals:

- Sending complete, commit, or collect requests.
- Deriving a server Sale from Cart Payment rows.
- Marking a local Cart as Paid before the server confirms a Sale.
- Due/Partial Sale browsing, later Payment collection UI, receipts, or printer
  actions.

Dependencies and public seams:

- Phase 4.1 Payment-entry boundary and the shared `SaleSummaryDTO` contract.
- Existing `PosStatusBadge` and semantic UI tones.
- `i18next` resources and the mobile focused test harness.

### Internal plan review

Reviewed on 2026-09-05 against the shared billing schema, `PaymentStatusSchema`,
Sale response fields, existing web Sale status presentation, Phase 4.1's local
Payment boundary, and the approved server-authority rule. The plan keeps the
cashier wording simple while retaining the API's `pending` value internally,
does not add a new backend contract, and keeps all mutation work for the
checkout slice. No new product decision is required for 4.2.

Plan review result: approved for implementation.

### 4.2 Implementation and review result

Implemented the server-authoritative Payment-status presentation slice:

- Added a pure boundary over the shared `SaleSummaryDTO` payment fields. It
  preserves the API `pending`, `partial`, or `paid` status and returns the
  server `grandTotal`, `paidTotal`, and `dueTotal` unchanged.
- Mapped API `pending` to the cashier-facing Due label while retaining
  `pending` in the boundary model, keeping the wording simple without
  changing the contract.
- Added a reusable `PaymentStatusSummary` component built on the existing
  semantic `PosStatusBadge`; Paid is success and Partial/Due are warning.
- Added English, Gujarati, and Hindi status labels.
- Added focused tests for all statuses, exact amount preservation, and a
  deliberately conflicting arithmetic example proving local assumptions do
  not override server data.

Review evidence:

- `bun run --cwd apps/mobile test`: 64 passed, 0 failed.
- `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json`: new Phase
  4.2 code is type-clean; the repository still reports the pre-existing
  `apps/mobile/src/screens/login-screen.tsx` missing
  `@repo/assets/services/whatsapp.webp` module.
- `git diff --check`: passed.
- Android build, emulator, device, live API, and migration checks were not
  run, as defined by the phase guardrails.

Implementation review result: approved with the known asset/native/device/API
follow-ups. The status component is ready for the server response returned by
the checkout adapter in Phase 4.3.

## 4.3 — Checkout adapter

### Plan

User-facing outcome: the approved Payment rows can cross one controlled
checkout boundary. A new Cart completes directly, a saved Draft commits by its
Sale ID, and a later payment collection uses its own single-payment adapter.
The mobile app keeps the same request ID for a recoverable new-Sale or Draft
commit retry and never creates a local completed Sale on a failed request.

Implementation scope:

- Add pure builders for `CompleteSaleJSON` and `CommitSaleJSON` from the
  existing Cart/Draft boundary plus mapped non-zero Payment rows. Reuse the
  existing item, Customer, discount, notes, and `dine_in` service-mode
  mapping; do not send Product prices from the client.
- Add an explicit checkout operation union with separate `new_sale`, `draft`,
  and `collection` branches. New Sale calls `completePosSale`; Draft calls
  `commitPosSale`; later collection calls `collectPosPayment` for one payment
  against a known committed Sale. Table checkout remains Phase 7.
- Add a scoped in-memory completion request ID to the Cart session. Generate it
  once when checkout begins, reuse it across retry attempts, and clear it only
  after a successful completed/committed Sale or an explicit new Sale/session
  reset. Do not persist it in MMKV.
- Add a checkout hook that blocks empty Cart, invalid Payment rows, and
  over-total values before calling the service. It must expose pending/error
  state, preserve Cart and Payment rows on failure, and return the server Sale
  on success for the Sale Complete slice.
- Treat a collection request differently because the existing
  `collectPosPayment` contract has no request ID. Send one selected payment at
  a time and do not automatically replay an unknown-result collection; the
  later Bills flow must recover the Sale before offering another collection.
- Add focused tests for payload mapping, operation dispatch, stable request
  IDs, server-response unwrapping, validation short-circuiting, and preserving
  local state after service errors.

Acceptance criteria:

1. A Cart without `draftSaleId` produces a valid Complete Sale payload and
   calls only `completePosSale`.
2. A Cart with `draftSaleId` produces a valid Commit Sale payload and calls
   only `commitPosSale` with that ID.
3. Empty/zero Payment rows are omitted; non-zero rows map to the shared
   Payment input shape; invalid or over-total rows never reach a service call.
4. The new-Sale and Draft commit request ID is generated once and reused after
   a recoverable failure, preventing accidental duplicate intent.
5. A successful response returns the server Sale, including its authoritative
   totals and Payment status; local state is not treated as the result.
6. A failed or unknown new-Sale/Draft request leaves Cart, Draft identity, and
   Payment rows available for recovery. Collection does not silently retry.
7. Later collection is a separate adapter and cannot be accidentally routed
   through direct completion or Draft commit.
8. Focused mobile tests pass and the known missing WhatsApp asset is still
   reported separately by the mobile TypeScript check.

Non-goals:

- Sale Complete UI, receipt/share actions, Bluetooth printing, WhatsApp, or
  Bills browsing.
- Automatic retry of a collection request whose network result is unknown,
  because the current collection API has no request-id contract.
- Table checkout, KOT, service-mode selection, refunds, or replacing Sales.
- Backend API changes; existing shared POS services and schemas are reused.

Dependencies and public seams:

- Phase 3 Cart/Draft payload builders and scoped Cart store.
- Phase 4.1 Payment-row mapper and validation.
- Existing `completePosSale`, `commitPosSale`, `collectPosPayment`, and Sale /
  Payment response types.
- Expo Crypto UUID generation already used by the mobile storage and Draft
  boundaries.

### Internal plan review

Reviewed on 2026-09-05 against the shared Complete/Commit/Payment schemas,
existing POS service methods, the web POS checkout branching, Phase 3's Draft
request behavior, and the approved duplicate-submission rule. The plan keeps
new Cart completion, Draft commit, and later collection as distinct operations;
does not claim idempotency for the current collection endpoint; and preserves
local recovery data after failures. No backend or product decision is required
for 4.3.

Plan review result: approved for implementation.

### 4.3 Implementation and review result

Implemented the separated POS checkout adapter:

- Added Complete Sale and Draft commit payload builders that reuse the Cart /
  Draft item, Customer, discount, notes, and service-mode mapping, omit client
  prices, and include only non-zero Payment inputs.
- Added an explicit `new_sale`, `draft`, and `collection` operation union. The
  first two dispatch only to their matching idempotent service; collection is a
  separate one-payment call against a committed Sale.
- Added a scoped in-memory completion request ID. Cart input changes clear it;
  a failed request keeps it for retry, while successful checkout clears the
  Cart and Payment state.
- Added a checkout hook that validates Cart and Payment state before a service
  call, exposes pending/error state, preserves local recovery state after
  failure, and returns the server Sale after success.
- Added focused tests for payload shape, operation separation, collection
  isolation, request-ID reuse, service dispatch, and service-error handling.

Review evidence:

- `bun run --cwd apps/mobile test`: 71 passed, 0 failed.
- `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json`: new Phase
  4.3 code is type-clean; the repository still reports the pre-existing
  `apps/mobile/src/screens/login-screen.tsx` missing
  `@repo/assets/services/whatsapp.webp` module.
- `git diff --check`: passed.
- Android build, emulator, device, live API, migration, and real-database
  retry checks were not run, as defined by the phase guardrails.

Implementation review result: approved with the known asset/native/device/API
follow-ups. The returned server Sale is ready for the Sale Complete screen in
Phase 4.4.

## Subphase status

| Subphase | Status | Evidence / follow-up |
| --- | --- | --- |
| 4.1 Payment entry | Completed with follow-up | Local Payment rows, scoped store, Payment screen, translations, and focused checks are complete; commit and native/API validation are follow-ups |
| 4.2 Payment status | Completed with follow-up | Server-authoritative status boundary, reusable summary component, translations, and focused checks are complete; checkout wiring and native/API validation are follow-ups |
| 4.3 Checkout adapter | Completed with follow-up | Direct, Draft, and collection adapters, scoped retry ID, validation, and focused checks are complete; Sale Complete wiring and native/API validation are follow-ups |
| 4.4 Sale Complete screen | Not started | Depends on 4.3 |
| 4.5 Digital receipts and sharing | Not started | Depends on 4.4 |
