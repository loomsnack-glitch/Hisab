# POS discount and partial-payment plan

## Goal

Fix the POS composer so cashier-entered order discounts reduce the Sale total in the backend, while partial payment remains an explicit money-collection flow that creates due balance and receivable history.

## Recommended domain model

- Keep `Sale`, `Payment`, `Payment Status`, and `dueTotal` as the source of truth for settlement.
- Treat cashier-entered order discount as pricing data, not payment data.
- Keep line-item discounts and order-level discount separate in the UI, but allow the backend to persist them as one `sales.discount_total` as long as order-level discount can be derived from `sales.discount_total - sum(sale_items.discount_amount)`.
- Keep draft sales payment-free. Recommendation: do not persist "intended payment method" or "intended partial amount" on drafts in this change.

## Current gap in code

- The frontend subtracts `discountInput` from local `grandTotal`, but `buildDraftPayload()` sends only line-item discounts, so the backend never sees the order-level discount.
- Commit flow already supports partial payment through `payments`, `paymentStatus`, `paidTotal`, and `dueTotal`.
- Recent bill cards already receive `paymentStatus`, `paidTotal`, and `dueTotal` from the backend, but the list UI does not surface them clearly.

## DB migration plan

Functional fix recommendation: no mandatory DB migration.

Why no migration is required:

- `sales.discount_total` already stores total discount at sale level.
- `sales.grand_total` already represents the discounted total.
- `payments` already stores collected money.
- `dueTotal` is already derived in read queries from `grand_total - paid_total`.

Implementation shape without migration:

- Add `orderDiscountAmount` to create-draft, update-draft, and commit request schemas.
- In service code, compute:
  - `lineDiscountTotal = sum(sale_items.discount_amount)`
  - `discountTotal = lineDiscountTotal + orderDiscountAmount`
  - `grandTotal = subtotal - discountTotal`
- When loading a draft or sale detail, derive:
  - `orderDiscountAmount = sale.discountTotal - sum(item.discountAmount)`

Optional future migration if stronger auditability is wanted:

- Add `sales.order_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0`
- Keep `sales.discount_total` as `line_discount_total + order_discount_amount`
- Backfill `order_discount_amount` for historical data as `GREATEST(discount_total - sale_item_discount_sum, 0)`

Use the optional migration only if the team wants first-class reporting, filtering, or analytics specifically on order-level discount.

## Backend change plan

### Types and validation

- Update billing request schemas in `packages/types/src/modules/billing/billing.schema.ts`:
  - `CreateDraftSaleSchema`
  - `UpdateDraftSaleSchema`
  - `CommitSaleSchema`
- Add optional `orderDiscountAmount` with money validation.
- Extend DTOs or service response shaping so sale detail can expose derived `orderDiscountAmount` to the frontend.

### Billing service

- Update sale preparation logic in `apps/backend/src/modules/tenant/billing/billing.service.ts` to accept order-level discount in addition to line discounts.
- Validate that order-level discount is `>= 0` and does not cause `grandTotal` to go below zero.
- On draft create and update:
  - persist `subtotal`
  - persist combined `discountTotal`
  - persist recomputed `grandTotal`
- On commit:
  - keep existing payment validation
  - calculate `paymentStatus` against the discounted `grandTotal`
  - continue requiring customer assignment for any unpaid balance
- On sale detail read:
  - return derived `orderDiscountAmount`
  - optionally return `lineDiscountTotal` for UI clarity

### Repository and API surface

- Repository SQL likely needs no table change.
- Read-model mapping may need extra derived response fields, but list queries for recent bills already contain the settlement totals needed for badges and due amounts.
- POS routes and admin billing routes can keep the same endpoints with expanded JSON payloads.

### Tests

- Add service tests for:
  - draft with line discount only
  - draft with order-level discount only
  - commit with full payment after order-level discount
  - commit with partial payment after order-level discount
  - rejection when discount exceeds subtotal
  - due sale without customer rejection
- Add regression test that discount is not inserted as a `Payment` and does not affect ledger payment entries.

## Web frontend change plan

### Composer pricing section

- Rename current discount input to something explicit like `Order Discount`.
- Keep product discount and order discount visually separate.
- Bind order discount into draft and commit payloads instead of only local math.
- On resume draft, populate the field from derived `orderDiscountAmount`.

### Composer payment section

- Replace the current payment pills behavior with an explicit settlement choice:
  - `Pay full now`
  - `Pay partial now`
  - `Mark fully due`
- For `Pay full now`:
  - selecting cash, UPI, or card should prefill full discounted total
- For `Pay partial now`:
  - show collected amount field
  - show payment method selector
  - validate amount is `> 0` and `< grandTotal`
  - require customer before commit
- For `Mark fully due`:
  - no payment rows are sent
  - require customer before commit

### Recent Bills and Drafts

- Show payment-state badge separately from payment-method badge:
  - `Draft`
  - `Paid`
  - `Partially paid`
  - `Due`
  - `Voided`
- Show due amount on every completed receivable card.
- Optionally show collected amount as secondary text: `Paid INR X of INR Y`.
- Keep draft cards free of settlement language because drafts are not committed bills yet.

### Bill detail and follow-up payment UX

- Reuse the existing sale-detail dialog as the main place to collect remaining balance after a partial bill is created.
- Make sure payment receipt and exported invoice continue to show:
  - subtotal
  - total discount
  - grand total
  - collected
  - due

## Rollout order

1. Update glossary and ADR.
2. Expand request schemas and backend pricing calculation.
3. Add backend tests for discount plus partial-payment combinations.
4. Update POS composer to send `orderDiscountAmount`.
5. Replace implicit payment pills with explicit partial-payment UX.
6. Surface payment status and due amount in recent bills and drafts.
7. Run manual POS scenarios:
   - discounted full-payment walk-in
   - discounted partial-payment customer sale
   - fully due customer sale
   - resume discounted draft
   - collect remaining due from bill detail

## Recommendation

Implement this without a DB migration first. The existing schema already supports the business rule if we stop treating frontend-only discount math as settlement and instead send order discount into the Sale pricing model. Use an explicit migration only if you want long-term reporting on order-level discount as a separately queryable field.
