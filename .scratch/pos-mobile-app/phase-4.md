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
| 4.1 | Payment entry | Phase 3 | Cash/UPI/Card rows, optional additional rows, and local validation work | Pending |
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

## Subphase status

| Subphase | Status | Evidence / follow-up |
| --- | --- | --- |
| 4.1 Payment entry | In progress | Plan approved; local Payment rows and Payment screen are being implemented |
| 4.2 Payment status | Not started | Depends on 4.1 |
| 4.3 Checkout adapter | Not started | Depends on 4.1–4.2 |
| 4.4 Sale Complete screen | Not started | Depends on 4.3 |
| 4.5 Digital receipts and sharing | Not started | Depends on 4.4 |
