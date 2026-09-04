# POS Mobile App — Phase 3 Execution Plan and Review Log

Status: Phase 3 in progress
Phase: 3 — Cart and Draft Sale
Scope: Android-only Ganatri POS mobile application
Started: 2026-09-05

This document is the execution record for Phase 3. Each subphase follows the
approved phase-loop lifecycle: plan, internal review, implementation,
verification, standards/spec review, status update, and focused commit.

## Phase outcome

Make Cart Review responsive and safe while preserving the distinction between
the local Cart, a server Draft Sale, and a completed Sale. The phase exit
condition is that a POS user can review and modify a Cart, choose optional
Customer and discount details, save a Draft Sale, resume it, and discard it
safely.

## Scope guardrails

Included in this phase:

- Local Cart add, remove, quantity, and immediate display-total behavior.
- Cart Review with Product lines, configuration details, and quantity controls.
- Optional Customer selection with Walk-in as the default.
- Minimal quick Customer creation from the Cart flow.
- Optional amount and percentage discounts with validation and removal.
- Hybrid local Cart/server Draft Sale persistence at approved boundaries.
- Draft Sale retry, resume, and discard behavior without duplicate creation.

Not included in this phase:

- Payment entry, Sale completion, receipt actions, or checkout orchestration
  (Phase 4).
- Bills, Customer Directory, Reports, Settings, or Bluetooth printing
  (Phases 5–6).
- Offline billing or treating a local Cart as a completed Sale.
- New backend endpoints unless an existing contract is proven insufficient.
- Android build, emulator, or physical-device validation in this loop; those
  remain explicit user-owned validation gates.

## Approved phase map

| Subphase | Outcome | Depends on | Exit evidence | Commit |
| --- | --- | --- | --- | --- |
| 3.1 | Local Cart state | Phase 2 | Lines can be added, removed, adjusted, and displayed with immediate totals | `66479e3` |
| 3.2 | Cart Review screen | 3.1 | Product lines, configurations, totals, and Continue to Payment are clear | Pending |
| 3.3 | Customer picker and Walk-in | 3.2 | Walk-in default and optional name/phone Customer selection work | Pending |
| 3.4 | Quick Customer creation | 3.3 | Minimal Customer creation returns safely to the active Cart | Pending |
| 3.5 | Discounts | 3.2 | Valid amount/percentage discounts update the displayed total | Pending |
| 3.6 | Server Draft Sale persistence | 3.1–3.5 | Draft save, update, resume, delete, retry, and duplicate protection work | Pending |

## Shared Phase 3 decisions

- Keep Cart mutations local and immediate for the normal billing path.
- Use Product and configuration IDs/quantities as the local Cart identity;
  server Catalog and billing services remain authoritative for final pricing.
- Do not persist a Cart in MMKV as an offline Sale. Server Draft Sales are the
  recovery authority at the approved save/pause/checkout boundaries.
- Keep Walk-in as the default and make Customer, discount, and Draft actions
  secondary to Cart Review and the later Payment action.
- Reuse existing shared POS Draft Sale, Customer, and billing services before
  proposing any API change.

## 3.1 — Local Cart state

### Plan

User-facing outcome: a cashier can inspect the current Cart from the New Sale
flow, change a line quantity, remove a line, and see immediate local display
totals without waiting for the server.

Implementation scope:

- Extend the existing mobile Cart boundary with safe line removal and quantity
  update operations.
- Add a pure display-total calculation using the server-provided Product price
  and catalog discount already stored on each Cart line. This is presentation
  feedback only and is not the billing authority.
- Expose Cart totals and line mutations through the existing Zustand Cart store
  and `usePosCart` hook.
- Keep Cart state scoped to the active Organization/Store/Device session and
  preserve it across New Sale and Cart screens.
- Add focused pure/store tests for quantity limits, removal, empty Cart, merge
  behavior, and immediate display totals.
- Keep configured selections intact when quantity changes or a line is removed.

Acceptance criteria:

1. Adding Products still merges only equal Cart-line identities.
2. A line can be increased, decreased, or removed without invalid quantities.
3. Decreasing the final unit removes the line or reaches the defined minimum
   safely; no zero or negative Cart line remains.
4. Cart item count and display totals update immediately after every mutation.
5. Configured Combo/Add-on IDs and quantities survive quantity changes and are
   removed only with their parent Cart line.
6. Cart state remains isolated by the active POS Device Session.
7. Display totals are clearly local presentation values; no client-side
   pricing data is sent to the server in this subphase.

Non-goals:

- Cart Review layout, Customer selection, discounts, Draft Sale requests, or
  Payment navigation.
- Server validation or replacement of authoritative totals.
- Editing the configuration of an existing Cart line in place.

Dependencies and public seams:

- Existing `pos-cart-boundary.ts`, `pos-cart.store.ts`, and `use-pos-cart.ts`.
- Existing Phase 2 Product and configuration identity model.
- Cart screen route from the Phase 1/2 navigation shell.
- Existing Product price and discount fields for immediate presentation only.

Test strategy and expected checks:

- Add behavior-focused tests at the pure Cart boundary and Zustand store seam.
- Run `bun run --cwd apps/mobile test`.
- Run `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json` and
  separate the known WhatsApp asset baseline error.
- Run `git diff --check`; do not run Android builds or device commands.

Risks and rollback:

- A quantity mutation must target `lineId`, not only Product ID, so configured
  lines remain independent.
- Local display totals must not be reused as Draft Sale or Sale totals.
- Existing Phase 2 Cart identity and session-boundary behavior must remain
  unchanged. This subphase can be rolled back by reverting its focused Cart
  boundary/store changes.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, `phase-2.md`, `CONTEXT.md`, the
existing Cart boundary/store, and the approved hybrid local Cart/server Draft
decision. The plan stays within 3.1, uses existing seams, preserves configured
line identity, and leaves server Draft Sale behavior for 3.6. No new product,
API, security, or release decision is required.

Plan review result: approved for implementation.

## Subphase status

| Subphase | Status | Evidence / follow-up |
| --- | --- | --- |
| 3.1 Local Cart state | Completed with follow-up | `66479e3`; native/device validation remains pending |
| 3.2 Cart Review screen | In progress | Plan approved; implementation pending |
| 3.3 Customer picker and Walk-in | Not started | Depends on 3.2 |
| 3.4 Quick Customer creation | Not started | Depends on 3.3 |
| 3.5 Discounts | Not started | Depends on 3.2 |
| 3.6 Server Draft Sale persistence | Not started | Depends on 3.1–3.5 |

## 3.1 Implementation and review result

Completed on 2026-09-05.

- Added line-ID-safe Cart quantity changes and removal. Final-unit decreases
  remove the line, and scoped store mutations cannot affect another Device.
- Exposed local display subtotal, catalog discount, and total through the Cart
  hook and rendered the controls in the existing Cart screen.
- Preserved configured Cart-line identity and configuration data through local
  quantity changes and removals.
- Added English, Gujarati, and Hindi labels for Cart controls and display-total
  messaging.
- Kept display totals presentation-only; Draft Sale and Sale totals remain
  server-authoritative for later subphases.

Standards/spec review:

- Cart mutations use the existing pure boundary, Zustand store, and mobile hook
  seams; no new API or persistence behavior was introduced.
- Quantity changes target `lineId`, preserving separate configured lines.
- Invalid, fractional, non-finite, zero, and negative quantity states cannot
  remain in the Cart.
- Empty-state, removal, scoped mutation, merge, and display-total behavior are
  covered by focused tests.

Verification:

- `bun run --cwd apps/mobile test` — 44 passed, 100 expectations.
- Mobile TypeScript check — only the pre-existing missing
  `@repo/assets/services/whatsapp.webp` declaration remains.
- `git diff --check` — passed.
- Android build, emulator, device, and live API checks — intentionally not run;
  these remain user-owned validation steps.

3.1 status: Completed with follow-up. Implementation commit: `66479e3`.

## 3.2 — Cart Review screen

### Plan

User-facing outcome: a cashier can review every current Cart line before
continuing toward Payment, including quantities, local display pricing, and
the preserved Combo/Add-on selections.

Implementation scope:

- Turn the existing Cart shell into the focused Cart Review surface while
  preserving the New Sale browsing context when navigating back.
- Show each Cart line's Product name, quantity, unit price, display line total,
  quantity controls, and remove action.
- Render configured direct Add-ons and Combo selections from the IDs and
  quantities already preserved in the local Cart, resolving names and prices
  from the current server Catalog/configuration data when available.
- Keep the local display subtotal, catalog discount, and total visible, with a
  clear server-authoritative note.
- Add Continue to Payment as the single primary action. Since Payment is Phase
  4, it may be a guarded placeholder route/action until that phase exists.
- Keep Customer, discount, and Draft Sale actions secondary and ready for their
  dedicated subphases; do not implement their mutations here.
- Add focused tests for configured-line rendering data, empty Cart behavior,
  and the Cart Review navigation boundary where the existing test seams allow.

Acceptance criteria:

1. Every Cart line is visible with Product name, quantity, unit price, and
   immediate display line total.
2. Quantity increase, final-unit removal, and explicit remove remain available
   without losing configured line identity.
3. Configured direct Add-ons and Combo selections remain associated with their
   parent line when returning from New Sale.
4. Subtotal, catalog discount, and display total update immediately after line
   changes, without being treated as server billing authority.
5. Continue to Payment is the single prominent forward action; Payment
   implementation remains in Phase 4.
6. The empty Cart state is clear and does not offer an invalid checkout path.
7. English, Gujarati, and Hindi labels cover the review actions and states.

Non-goals:

- Customer selection or creation (3.3–3.4).
- Discount entry (3.5).
- Draft Sale save, resume, delete, or retry (3.6).
- Payment, Sale completion, receipts, or server checkout requests (Phase 4).
- In-place editing of an existing line's Combo/Add-on configuration.

Dependencies and public seams:

- Completed 3.1 Cart boundary, Zustand store, hook, and Cart route.
- Phase 2 Cart configuration identity and current Catalog/configuration queries.
- Existing POS navigation stack; no new backend endpoint is expected.

Test strategy and expected checks:

- Add pure tests for configuration display mapping and Cart Review data safety.
- Run `bun run --cwd apps/mobile test`.
- Run the mobile TypeScript check and separate the known WhatsApp asset error.
- Run `git diff --check`; do not run Android builds or device commands.

Risks and rollback:

- Displaying stale or copied Product/configuration values could conflict with
  server authority; use current query data and retain IDs in the Cart.
- The forward Payment action must not create a Sale before Phase 4's approved
  checkout adapter exists.
- Rollback is limited to the Cart Review screen and its display boundary; the
  committed 3.1 local Cart behavior remains independently recoverable.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, `CONTEXT.md`, the Cart and Draft Sale
decision, completed 3.1, and the existing navigation shell. The plan keeps
server mutations and Payment outside this subphase, preserves configured line
identity, and uses current server data for optional configuration display. No
new product, API, security, or release decision is required.

Plan review result: approved for implementation.
