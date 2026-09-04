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
| 3.2 | Cart Review screen | 3.1 | Product lines, configurations, totals, and Continue to Payment are clear | `0a16c2b` |
| 3.3 | Customer picker and Walk-in | 3.2 | Walk-in default and optional name/phone Customer selection work | `7356c4d` |
| 3.4 | Quick Customer creation | 3.3 | Minimal Customer creation returns safely to the active Cart | `d1acce6` |
| 3.5 | Discounts | 3.2 | Valid amount/percentage discounts update the displayed total | `465a9c9` |
| 3.6 | Server Draft Sale persistence | 3.1–3.5 | Draft save, update, resume, delete, retry, and duplicate protection work | `Pending` |

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
| 3.2 Cart Review screen | Completed with follow-up | `0a16c2b`; native/device validation remains pending |
| 3.3 Customer picker and Walk-in | Completed with follow-up | `7356c4d`; native/device/API validation remains pending |
| 3.4 Quick Customer creation | Completed with follow-up | `d1acce6`; native/device/API validation remains pending |
| 3.5 Discounts | Completed with follow-up | `Pending`; amount/percentage discount validation and display updates are implemented; native/device validation remains pending |
| 3.6 Server Draft Sale persistence | Completed with follow-up | Implementation complete; migration application and native/API validation remain pending |

## 3.5 Implementation and review result

Completed on 2026-09-05.

- Added a pure order-discount boundary supporting amount and percentage modes,
  rejecting negative, malformed, over-maximum, and out-of-range values.
- Stored the optional discount with the active scoped Cart and recalculated the
  local display total immediately without changing the existing Product-line
  identity or selected Customer.
- Added a secondary Cart Review editor with amount/percentage modes, simple
  percentage presets, apply, edit, and remove actions.
- Added English, Gujarati, and Hindi labels for the discount editor, actions,
  and validation state.
- Kept discount values local to the Cart; Draft Sale request mapping and server
  authority remain reserved for 3.6.

Standards/spec review:

- The order discount is separate from catalog Product discounts and is never
  allocated across lines in the mobile display layer.
- Validation uses the current pre-order-discount display base, while the
  server remains authoritative for Draft Sale pricing and final totals.
- Discount changes remain scoped to the active Organization/Store/Device Cart
  and preserve lines and Customer selection.
- The editor stays secondary to Cart Review and does not introduce Payment or
  Sale behavior before Phase 4.

Verification:

- `bun run --cwd apps/mobile test` — 52 passed, 118 expectations.
- Mobile TypeScript check — only the pre-existing missing
  `@repo/assets/services/whatsapp.webp` declaration remains.
- `git diff --check` — passed.
- Android build, emulator, device, and live API checks — intentionally not run;
  these remain user-owned validation steps.

3.5 status: Completed with follow-up. Implementation commit: `465a9c9`.

## 3.6 — Server Draft Sale persistence

### Plan

User-facing outcome: a cashier can save the current Cart as a server Draft,
update the same Draft after Cart changes, retry a failed save without creating a
second Draft, and intentionally discard the active Draft. A later Bills slice
can use the same get-by-ID/delete boundaries to list and resume Drafts.

Implementation scope:

- Add a pure Draft Sale boundary that maps local Cart lines, configured
  Add-ons/Combo selections, optional Customer, and the effective order discount
  into the existing shared `CreateDraftSaleJSON`/`UpdateDraftSaleJSON` shapes.
- Preserve IDs and quantities only; do not send local Product prices or treat
  mobile display totals as billing authority.
- Add a server Draft identifier and stable create request key to the scoped
  Cart store. A successful first save switches future saves to update; retrying
  the same create request reuses the key.
- Add mobile service wrappers and React Query mutations for create/update,
  get-by-ID, and delete, with one active save/delete operation at a time.
- Add Cart Review actions for Save Draft and Discard Draft. Keep Payment and
  Sale completion outside this slice.
- Add the minimal backend/schema/repository support required for a persisted
  draft request key, including a store-scoped unique index and race recovery.
  This is necessary because the current create contract has no general
  idempotency field.
- Keep resume-by-ID and delete-by-ID boundaries tested now; the full Bills list
  and Draft list UI remain Phase 5, while the current Cart can resume an
  explicitly loaded Draft through the boundary.
- Add focused tests for payload mapping, configured items, discount mapping,
  create/update selection, stable retry keys, delete behavior, and concurrent
  duplicate-create recovery.

Acceptance criteria:

1. A non-empty Cart can be saved as a Draft using existing POS services.
2. A saved Draft retains Customer, order discount, Product IDs, quantities,
   Add-ons, and Combo selections through the shared server contract.
3. Changes after the first save update the same Draft ID instead of creating a
   new Draft.
4. A retry of the same create request returns the same Draft, including when
   two requests race; no duplicate Draft row is created.
5. Save failures leave the local Cart and retry key intact for a safe retry.
6. Discard deletes the server Draft first and clears the local Draft context
   only after a successful delete; a failed delete remains recoverable.
7. Resume and delete boundaries reject missing/not-found/non-Draft records with
   recoverable errors and do not mutate the local Cart on failure.
8. English, Gujarati, and Hindi labels cover save, retry, discard, and status
   feedback.

Non-goals:

- Payment entry, commit/complete Sale, receipts, and printing (Phases 4 and 6).
- Bills list/filter/detail UI and general Draft browsing (Phase 5).
- Offline creation, local MMKV Draft caching, or treating a local Cart as a
  server Sale.
- Client-side price/tax/discount allocation or any replacement of server
  validation.

Dependencies and public seams:

- Completed 3.1–3.5 Cart boundary, store, hook, and Cart Review screen.
- Existing shared POS Draft service methods and billing types.
- Existing server sales table, billing repository, POS routes, and migration
  conventions.
- React Query provider and existing scoped POS session.

Test strategy and expected checks:

- Add pure mobile Draft mapping tests and Cart-store Draft lifecycle tests.
- Add focused backend service/repository tests for idempotent create and the
  unique-key race path, plus schema/type checks where the repository normally
  runs them.
- Run `bun run --cwd apps/mobile test` and the focused backend test command if
  available without starting a long-running process.
- Run the mobile TypeScript check and separate the known WhatsApp asset error.
- Run `git diff --check`; do not run Android builds or device commands.

Risks and rollback:

- The request key must be generated once per local create attempt and retained
  until the server returns a Draft ID; generating a new key on every retry
  would reintroduce duplicate creation.
- The unique key is scoped to Organization and Store so two Stores can use the
  same UUID only in the extremely unlikely event of an externally supplied
  collision without cross-Store interference.
- Existing completion idempotency must remain separate from Draft creation
  idempotency.
- If the backend migration is not applied to the target environment, mobile
  Draft save cannot claim duplicate protection; deployment migration remains a
  release gate.
- Rollback can revert the mobile Draft boundary/actions and the additive
  request-key migration/contract without changing completed Cart behavior.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, `CONTEXT.md`, completed 3.1–3.5,
the shared billing schemas/services, POS routes, billing repository, and the
existing completion/KOT idempotency implementations. The review found that
create Draft currently lacks a general retry key, so the additive backend field
and unique lookup are required to satisfy the approved no-duplicate criterion.
The plan keeps the hybrid local Cart/server Draft boundary, does not add
Payment, and leaves Bills browsing to Phase 5.

Plan review result: approved for implementation.

## 3.6 Implementation and review result

Completed on 2026-09-05.

- Added a selection-only Cart-to-Draft mapping for Product IDs, quantities,
  direct Add-ons, Combo selections, Customer ID, and the effective order
  discount. Local Product prices and display totals are not sent as authority.
- Added scoped local Draft Sale and create-request identities. A successful
  save switches the Cart to update mode; failed saves retain the Cart and the
  stable retry key.
- Added React Query save/update/get/delete boundaries and Cart Review Save
  Draft, Update Draft, and Discard Draft actions with translated feedback.
- Added `draft_request_id` to the shared create contract, sales table, and
  repository lookup. The store-scoped unique index plus lookup-after-write
  recovery prevents duplicate Draft creation when a request is retried or
  races after the first write.
- Kept resume-by-ID and delete-by-ID service boundaries ready for the Phase 5
  Bills surface; no Bills browsing, Payment, Sale completion, or printing was
  added here.

Standards/spec review:

- The mobile payload follows the existing selection-only billing contract and
  leaves pricing, validation, and final totals to the server.
- Create and update are separated by the server Draft ID, while the create
  request UUID remains stable across unknown-response retries.
- Discard clears local Draft metadata only after a successful server delete;
  failed deletes leave the Draft recoverable.
- The additive migration is isolated from completion idempotency and KOT
  generation idempotency, with Organization/Store scoping on the new key.
- Cart, Customer, discount, and configured-line state remain scoped to the
  active POS Device context.

Verification:

- `bun run --cwd apps/mobile test` — 55 passed, 127 expectations.
- `bun test packages/types/src/modules/billing/billing.schema.test.ts apps/backend/src/modules/tenant/billing/billing.service.configured.test.ts` — 64 passed, 330 expectations.
- Mobile TypeScript check — only the pre-existing missing
  `@repo/assets/services/whatsapp.webp` declaration remains.
- Backend-wide TypeScript check — existing unrelated repository/test errors
  remain; the focused billing tests pass.
- `git diff --check` — passed.
- Android build, emulator, device, live API, and migration-application checks —
  intentionally not run; these remain user-owned/release validation gates.

3.6 status: Completed with follow-up. Implementation commit: pending.

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

## 3.2 Implementation and review result

Completed on 2026-09-05.

- Turned the Cart shell into a focused Cart Review surface with Product lines,
  unit prices, local display line totals, quantity controls, removal, and
  subtotal/discount/display-total rows.
- Resolved preserved direct Add-on and Combo selection IDs to current server
  configuration names, while keeping unknown IDs visible as a safe fallback.
- Added the translated Continue to Payment primary action as a guarded
  Phase 4 placeholder; it does not create a Sale or initiate Payment.
- Kept the final-total server-authority note visible and preserved the New Sale
  context through the existing navigation back action.
- Added focused configuration-display mapping tests and retained the 3.1 Cart
  mutation/store coverage.

Standards/spec review:

- Configuration display uses the existing Cart ID/quantity model and current
  server configuration data; no names or prices are persisted in the Cart.
- Cart controls continue to target `lineId`, so separate configurations remain
  separate lines.
- Continue to Payment is disabled for an empty Cart and remains a non-mutating
  placeholder until Phase 4's approved checkout path exists.
- English, Gujarati, and Hindi review labels are included.

Verification:

- `bun run --cwd apps/mobile test` — 46 passed, 102 expectations.
- Mobile TypeScript check — only the pre-existing missing
  `@repo/assets/services/whatsapp.webp` declaration remains.
- `git diff --check` — passed.
- Android build, emulator, device, and live API checks — intentionally not run;
  these remain user-owned validation steps.

3.2 status: Completed with follow-up. Implementation commit: `0a16c2b`.

## 3.3 — Customer picker and Walk-in

### Plan

User-facing outcome: the cashier can continue with the default Walk-in
Customer or optionally search, select, change, and remove an active Customer
from Cart Review without blocking the billing path.

Implementation scope:

- Add a mobile-facing query boundary for the existing `getPosCustomers`
  service, scoped by Organization, Store, Device, and server search text.
- Search Customers by name or phone through the existing POS Customer endpoint;
  do not load or filter an unbounded Customer directory locally.
- Keep a minimal selected Customer context in the scoped local Cart state using
  only Customer ID, name, and phone needed by the review surface.
- Keep `null` as the explicit Walk-in state and make selecting/removing a
  Customer reversible without changing Cart lines.
- Add an inline, secondary Customer picker in Cart Review with loading, empty,
  error/retry, search, selection, and clear states.
- Keep quick Customer creation for 3.4 and do not add a create mutation here.
- Add focused pure tests for Customer context normalization and store scope
  isolation. Query behavior is covered through the existing service boundary.

Acceptance criteria:

1. A Cart with no selected Customer clearly uses Walk-in by default.
2. The picker searches the active POS Customer list by name or phone.
3. Selecting a Customer displays its name/phone and preserves all Cart lines.
4. The cashier can change the selected Customer or return to Walk-in.
5. Customer query loading, empty, error, and retry states are clear and do not
   discard the local Cart.
6. Customer selection is scoped to the active Organization/Store/Device.
7. Continue to Payment remains available regardless of Customer selection.
8. English, Gujarati, and Hindi labels cover Walk-in and picker actions.

Non-goals:

- Creating or editing Customers (3.4 and Phase 5).
- Persisting Customer selection in MMKV or creating a server Draft Sale.
- Customer due/payment behavior or blocking checkout on Customer selection.

Dependencies and public seams:

- Completed 3.2 Cart Review and the scoped 3.1 Zustand Cart store.
- Existing `getPosCustomers` POS service and billing Customer types.
- Existing session scope and React Query provider.

Test strategy and expected checks:

- Add pure Customer-context tests and scoped Cart-store selection tests.
- Run `bun run --cwd apps/mobile test`.
- Run the mobile TypeScript check and separate the known WhatsApp asset error.
- Run `git diff --check`; do not run Android builds or device commands.

Risks and rollback:

- Customer search must remain server-backed so the picker does not silently
  miss Customers outside a small local page.
- Customer selection must never mutate or clear Cart lines.
- Rollback is limited to the Customer query, context, and picker UI; Cart and
  Cart Review line behavior remains independently committed.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, `CONTEXT.md`, completed 3.2, the
existing POS Customer service/schema, and the approved Walk-in/default rule.
The plan reuses the existing POS API, keeps Customer optional, and leaves
Customer creation and Draft Sale persistence outside this subphase. No new
product, API, security, or release decision is required.

Plan review result: approved for implementation.

## 3.3 Implementation and review result

Completed on 2026-09-05.

- Added a Store/Device-scoped React Query boundary for server-backed active
  Customer search by name or phone.
- Added minimal Cart Customer context containing only ID, name, and phone;
  switching Customer or returning to Walk-in preserves all Cart lines.
- Added inline Cart Review Customer selection with search, loading, empty,
  error/retry, selection, change, and clear states.
- Kept Customer selection optional and non-blocking for Continue to Payment.
- Added focused tests for Customer normalization, scope isolation, and Cart
  preservation.

Standards/spec review:

- The picker uses the existing `getPosCustomers` POS service and does not
  construct an ad-hoc endpoint or load an unbounded local directory.
- Walk-in is represented by `null`; no fake Customer record or Customer data is
  persisted in MMKV.
- Customer selection is scoped and cannot clear or mutate Cart lines.
- Quick Customer creation remains correctly deferred to 3.4.
- English, Gujarati, and Hindi labels cover the Customer states and actions.

Verification:

- `bun run --cwd apps/mobile test` — 48 passed, 107 expectations.
- Mobile TypeScript check — only the pre-existing missing
  `@repo/assets/services/whatsapp.webp` declaration remains.
- `git diff --check` — passed.
- Android build, emulator, device, and live API checks — intentionally not run;
  these remain user-owned validation steps.

3.3 status: Completed with follow-up. Implementation commit: `7356c4d`.

## 3.4 — Quick Customer creation

### Plan

User-facing outcome: when the needed Customer is not found, the cashier can
create a minimal Customer with a required name and optional phone, return to the
same Cart with that Customer selected, and keep the Cart intact if creation
fails.

Implementation scope:

- Add a small mobile mutation boundary for the existing `createPosCustomer`
  POS service.
- Add an inline create form from the 3.3 Customer picker with required name,
  optional phone, client-side validation, loading, success, and error states.
- Normalize the optional phone through the shared type boundary before sending
  it to the server; do not invent Customer fields or marketing behavior.
- On success, select the returned Customer in the current Cart and close the
  picker while invalidating the scoped Customer search cache.
- On failure, keep the current Cart, entered form values, and useful error state
  available for retry.
- Keep Customer creation optional and secondary to Cart Review/Payment.
- Add focused tests for create payload normalization and failure-safe local
  state behavior where the existing seams allow.

Acceptance criteria:

1. A cashier can open Quick Customer creation from the Customer picker.
2. Name is required and whitespace-only submission is rejected locally.
3. Phone is optional but, when entered, follows the shared phone contract.
4. A successful response selects the new Customer in the active Cart and
   preserves every Cart line and configuration.
5. Loading prevents duplicate create submissions and shows clear progress.
6. A failed create keeps the Cart and form recoverable with a retry path.
7. Customer search results are refreshed after successful creation.
8. English, Gujarati, and Hindi labels cover the form and states.

Non-goals:

- Customer editing, due management, marketing preferences, or Customer
  Directory behavior (Phase 5).
- Draft Sale persistence or Payment changes.
- Offline Customer creation or local-only Customer records.

Dependencies and public seams:

- Completed 3.3 Customer picker and scoped Cart Customer context.
- Existing `createPosCustomer`, `CreateCustomerJSON`, and shared phone schema.
- Existing POS React Query client and localization resources.

Test strategy and expected checks:

- Add pure tests for payload normalization and preserve Cart-store tests.
- Run `bun run --cwd apps/mobile test`.
- Run the mobile TypeScript check and separate the known WhatsApp asset error.
- Run `git diff --check`; do not run Android builds or device commands.

Risks and rollback:

- The server response, not locally entered values, is the selected Customer
  authority after creation.
- A failed mutation must not clear Cart lines or replace the current Customer.
- Rollback is limited to the create mutation/form and cache invalidation;
  picker and Cart selection remain independently committed.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, `CONTEXT.md`, completed 3.3, the
existing POS Customer service/schema, and the approved optional-Customer rule.
The plan uses the existing create contract, keeps the form minimal, and leaves
editing and Draft Sale behavior outside this subphase. No new product, API,
security, or release decision is required.

Plan review result: approved for implementation.

## 3.4 Implementation and review result

Completed on 2026-09-05.

- Added the existing POS Customer create service behind a mobile mutation
  boundary with scoped Customer-query invalidation after success.
- Added an inline Quick Customer form with required name, optional shared-format
  phone, local validation, loading, success, and recoverable error states.
- Selected the server-returned Customer in the active Cart after successful
  creation and preserved every Cart line and configuration.
- Kept entered form values and the Cart intact when creation fails, allowing a
  retry without losing the billing context.
- Added focused tests for name/phone payload normalization and retained Cart
  Customer scope/preservation coverage.

Standards/spec review:

- The mutation uses the existing `createPosCustomer` service and shared
  `CreateCustomerJSON`/phone normalization contract.
- No Customer record is fabricated locally and no Customer data is persisted in
  MMKV.
- `useMutation` loading state prevents duplicate create submissions, while
  errors remain visible and retryable.
- Customer creation remains secondary and does not block Cart or Payment flow.
- English, Gujarati, and Hindi labels cover the form and states.

Verification:

- `bun run --cwd apps/mobile test` — 50 passed, 110 expectations.
- Mobile TypeScript check — only the pre-existing missing
  `@repo/assets/services/whatsapp.webp` declaration remains.
- `git diff --check` — passed.
- Android build, emulator, device, and live API checks — intentionally not run;
  these remain user-owned validation steps.

3.4 status: Completed with follow-up. Implementation commit: `d1acce6`.

## 3.5 — Discounts

### Plan

User-facing outcome: a cashier can optionally apply, edit, or remove a valid
amount or percentage order discount in Cart Review and see the local display
total update immediately.

Implementation scope:

- Add a pure Cart discount boundary for amount/percentage state, validation,
  maximum handling, and conversion to an effective display amount.
- Store only the local discount mode/value in the scoped Cart state; do not
  persist it in MMKV or send it to the server until 3.6 maps the Cart to a
  Draft Sale request.
- Add a secondary inline discount editor in Cart Review with amount and
  percentage modes, optional quick percentage presets, apply, edit, and clear.
- Prevent discounts greater than the current pre-order-discount display total,
  percentage values outside 0–100, negative values, and invalid input.
- Recalculate the local display total immediately while preserving the clear
  server-authoritative pricing note.
- Keep Customer, Draft Sale, Payment, and Sale behavior outside this slice.
- Add focused pure/store tests for amount, percentage, maximum validation,
  removal, scope preservation, and total recalculation.

Acceptance criteria:

1. Discount entry remains optional and secondary to Cart Review.
2. Amount and percentage modes are available and mutually understandable.
3. Invalid, negative, over-maximum, and malformed discounts cannot be applied.
4. A valid discount updates the local display total immediately.
5. The cashier can edit or remove the discount before Payment.
6. Cart lines and selected Customer remain intact through discount changes.
7. The local discount is not treated as a server-authoritative final total.
8. English, Gujarati, and Hindi labels cover discount actions and errors.

Non-goals:

- Server Draft Sale persistence or request mapping (3.6).
- Customer behavior (3.3–3.4), Payment, or Sale completion (Phase 4).
- Per-line discount allocation, tax, or client-side billing authority.

Dependencies and public seams:

- Completed 3.2 Cart Review and 3.1 local display-total boundary/store.
- Approved order-level discount model in `CONTEXT.md` and billing types.
- Existing POS UI primitives and localization resources.

Test strategy and expected checks:

- Add pure discount-boundary tests and scoped Cart-store discount tests.
- Run `bun run --cwd apps/mobile test`.
- Run the mobile TypeScript check and separate the known WhatsApp asset error.
- Run `git diff --check`; do not run Android builds or device commands.

Risks and rollback:

- Order discounts must remain separate from catalog Product discounts and must
  not be allocated across lines.
- A discount must be clamped/rejected against the current local display base;
  server validation remains authoritative later.
- Rollback is limited to discount boundary/state/editor changes; prior Cart,
  Review, and Customer slices remain independently committed.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, `CONTEXT.md`, completed 3.1–3.4,
the approved order-level discount ADR/model, and the existing mobile Cart
seams. The plan keeps discounts optional, order-level, local for immediate
feedback, and separate from server Draft Sale persistence. No new product, API,
security, or release decision is required.

Plan review result: approved for implementation.
