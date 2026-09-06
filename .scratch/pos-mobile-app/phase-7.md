# POS Mobile App — Phase 7 Execution Record

Phase 7 adds capability-gated restaurant operations after the shared retail
billing flow. This record follows the phase-loop lifecycle and keeps Tables,
service modes, Table Orders, and KOT operationally separate.

## Phase 7 — Restaurant operations

### Phase plan

User-facing outcome: an enabled restaurant Store can select Dine-In or Pick-Up,
start/reopen a Table Order without duplicates, send multiple KOT batches, and
complete kitchen work without exposing restaurant controls to retail Stores.

Subphase order:

| Subphase | Scope | Exit condition |
| --- | --- | --- |
| 7.1 Service modes | Capability-gated Dine-In/Pick-Up state through Cart, Draft, Payment, and Sale completion. | Restaurant-capable Stores see service modes; retail Stores do not. |
| 7.2 Tables | Areas, table states, totals, start/reopen, and safe table navigation. | Tables are grouped, stateful, and cannot create duplicate active orders. |
| 7.3 Table orders | Connect Table context to Cart/KOT/checkout and return to Tables naturally. | Table context survives the flow and checkout uses the table-order service. |
| 7.4 KOT and kitchen completion | Multiple KOT batches, pending kitchen list, and completion. | KOT creation/completion is separate from Sale/Payment completion. |

Confirmed decisions:

- Tables and restaurant actions are hidden for retail Stores.
- Selecting a Table implies Dine-In.
- KOT is separate from Sale and Payment and does not settle a Sale.
- Existing POS table, table-order, KOT, kitchen, and shared DTO boundaries are
  reused before any API proposal.
- Online-first behavior remains; no offline restaurant order is introduced.

Dependencies:

- Existing `tableManagementEnabled` and `kotSystemEnabled` Store capabilities.
- Existing POS table, table-order, KOT, kitchen, checkout, Catalog, Cart,
  Payment, and session boundaries.

Validation safety:

- Do not run builds, Expo, Android/emulator, device-start, live API, or
  hardware commands while Phase 7 is incomplete.
- Use focused boundary/unit tests, TypeScript feedback, and `git diff --check`.

### 7.1 — Service modes plan

- Extend the Cart-owned context with `dine_in`/`pick_up` and optional Table
  identity, defaulting ordinary restaurant sales to Dine-In.
- Infer and lock Dine-In when a Table is selected.
- Pass service mode through Draft, direct checkout, and table checkout payloads.
- Keep service-mode controls out of retail New Sale.

Implementation plan and review:

- Introduce a small mobile service-mode boundary with the existing shared
  `SaleServiceMode` vocabulary and a future-safe Table context shape.
- Store service mode and Table context in the session-scoped Zustand Cart;
  Cart mutations must preserve these fields, while a full checkout clear must
  remove them.
- Render Dine-In/Pick-Up only when the Store advertises restaurant capability
  (`tableManagementEnabled` or `kotSystemEnabled`). A selected Table always
  forces Dine-In.
- Thread the selected mode through Draft create/update and direct completion
  payload builders, with Dine-In as the compatibility default for existing
  callers.
- Add boundary tests for capability visibility, mode normalization, Cart
  context transitions, and payload propagation before moving to Tables.

Internal review: this keeps service mode inside the existing Cart and checkout
seams, does not add role assumptions or a new API contract, and leaves Table
selection available for 7.2/7.3. Approved for implementation.

Implementation and review result:

- Added a session-scoped Cart service-mode boundary with `dine_in` and
  `pick_up`, plus a future Table context that forces Dine-In.
- Added capability-gated mode controls to New Sale and a mode summary to Cart;
  retail Stores do not receive restaurant controls.
- Passed the selected mode through Draft create/update and direct completion;
  existing callers retain the Dine-In default.
- Added boundary, store, localization, and payload coverage. Focused mobile
  tests pass; TypeScript reports only the pre-existing missing WhatsApp asset
  import in `login-screen.tsx`.

Subphase review: approved. No scope, API, or safety defect was found. The next
slice is Tables, where the existing Table service contract will populate the
future Cart context.

### 7.2 — Tables plan

- Replace the Tables placeholder with capability-gated table and area queries.
- Group by area and show Free, Allocated, Engaged, Ready to Bill, Payment Due,
  and Paid states with current totals.
- Use existing start/get table-order services and handle conflict responses
  without creating a second order.

### 7.3 — Table orders plan

- Preserve Table ID, Table Order ID, and service mode in scoped Cart context.
- Use the existing Table Order checkout service for KOT-backed orders and the
  existing Draft/commit path for legacy table drafts where the service returns
  one.
- Return to Tables after a confirmed table Sale where navigation is natural.

### 7.4 — KOT and kitchen completion plan

- Add a capability-gated Kitchen destination backed by existing kitchen KOT
  list and completion services.
- Add KOT generation from an active Table Order with a stable request ID.
- Render pending KOT items and allow completion without changing Sale payment
  state.
- Keep KOT failure retryable and retain the Table Order context.

## Phase status

Phase 7 is planned after Phase 6's current adapter gate and will be executed
one subphase at a time. No new product or backend contract decision is added
by this plan.
