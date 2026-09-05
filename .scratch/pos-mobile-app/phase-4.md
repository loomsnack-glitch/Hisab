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
| 4.2 | Payment status | 4.1 | Paid/Partial/Due follows server-backed totals and collected values | Pending |
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

## Subphase status

| Subphase | Status | Evidence / follow-up |
| --- | --- | --- |
| 4.1 Payment entry | Completed with follow-up | Local Payment rows, scoped store, Payment screen, translations, and focused checks are complete; commit and native/API validation are follow-ups |
| 4.2 Payment status | In progress | Plan approved; server-authoritative status presentation is next |
| 4.3 Checkout adapter | Not started | Depends on 4.1–4.2 |
| 4.4 Sale Complete screen | Not started | Depends on 4.3 |
| 4.5 Digital receipts and sharing | Not started | Depends on 4.4 |
