# Outbound Purchases and Expenses

Status: ready-for-agent

## Problem Statement

Hisab tracks money coming into the business through POS payments and, for enabled Stores, into Money Accounts. Organization administrators can already maintain Vendors, Vendor Items, and Money Accounts, but cannot record the two main types of money leaving the business: buying goods from a Vendor and category-based operational spending. This leaves Money Account Balances incomplete and provides no reliable way to track what remains due to a Vendor or operational payee.

## Solution

Add Store-scoped Purchases and Expenses to Ganatri Admin, backed by a shared payable workflow. A Purchase records goods obtained from one active Vendor through active Vendor Items; an Expense records one operational cost under one active Expense Category. Both begin as financially inert Draft Payables and become recorded payables with a `due`, `partial`, or `paid` status when committed.

An administrator can make one or more Outgoing Payments against a recorded Purchase or Expense. When Money Account Tracking is disabled, the payment records Cash, UPI, or Card only. When it is enabled, the administrator explicitly selects the payment method and one active eligible Money Account with sufficient balance; Bank Transfer and Other are additionally available and the selected account is debited atomically. Each Purchase, Expense, Outgoing Payment, and resulting Money Account Movement remains auditable through reversal and void instead of destructive editing.

Organization-wide Expense Categories combine Hisab's predefined read-only categories with Organization-defined categories. Categories, like Vendors and Vendor Items, use active/inactive status rather than deletion so history remains meaningful.

## User Stories

1. As an Organization administrator, I want Purchases and Expenses in Ganatri Admin, so that I can record money leaving each Store alongside the money entering it.
2. As an Organization administrator, I want every Purchase and Expense to belong to one Store, so that spending, dues, and funding sources are attributable to the Store that incurred them.
3. As an Organization administrator, I want to save an unfinished Purchase or Expense as a Draft Payable, so that I can prepare it without changing balances or creating a due.
4. As an Organization administrator, I want to freely edit or discard a Draft Payable, so that incomplete work does not become financial history.
5. As an Organization administrator, I want to record a Draft Purchase or Expense with no payment, a partial payment, or full payment, so that its Payable Status reflects the actual settlement state immediately.
6. As an Organization administrator, I want a Purchase to require one active Vendor, so that a Purchase has a clear supplier.
7. As an Organization administrator, I want the Purchase item picker to show only the selected Vendor's active Vendor Items when that Vendor is active, so that I cannot create a new Purchase from retired procurement configuration.
8. As an Organization administrator, I want each Purchase Line to prefill its Vendor Item's default purchase price and Unit, so that entry begins with the expected buying price.
9. As an Organization administrator, I want to enter a quantity and override the agreed unit price on each Purchase Line, so that the Purchase captures the price actually negotiated.
10. As an Organization administrator, I want the final Purchase total to include a visible positive or negative Purchase Adjustment, so that freight, a bulk discount, or rounding does not silently overwrite line totals.
11. As an Organization administrator, I want recorded Purchases to retain Vendor, Vendor Item, Unit, name, and price snapshots, so that later configuration changes do not rewrite historical buying records.
12. As an Organization administrator, I want to record a Purchase or Expense effective date, optional supplier invoice/reference, and optional notes, so that I can find and understand the source entry.
13. As an Organization administrator, I want an Expense to require exactly one Expense Category, so that spending reports and outstanding balances are unambiguous.
14. As an Organization administrator, I want Rent, Electricity, Water, Internet & Phone, Salaries & Wages, Maintenance & Repairs, Transport, Supplies, Marketing, Taxes & Fees, and Other available by default, so that common spending can be categorized immediately.
15. As an Organization administrator, I want to create Organization-defined Expense Categories, so that the system reflects my business's own spending categories.
16. As an Organization administrator, I want predefined and custom Expense Categories to be made inactive instead of deleted, so that old Expenses remain classified while new entries use current categories.
17. As an Organization administrator, I want each recorded Purchase and Expense to show the total paid and amount due, so that I know which payables still need action.
18. As an Organization administrator, I want to add later Outgoing Payments to a recorded payable, potentially using a different payment method and funding account, so that staged settlement is accurately represented.
19. As an Organization administrator, I want Vendor Outstanding to be calculated from the Vendor's recorded Purchases that still have an amount due, so that I can prioritize unpaid supplier bills without maintaining a separate Vendor credit ledger.
20. As an Organization administrator at a Store without Money Account Tracking, I want to select Cash, UPI, or Card for an Outgoing Payment, so that the basic spending workflow works without account setup.
21. As an Organization administrator at a tracking-enabled Store, I want to select Cash, UPI, Card, Bank Transfer, or Other and explicitly select an eligible active Money Account, so that the payment decreases the actual account used.
22. As an Organization administrator, I want a tracked payment rejected when its selected Money Account is unavailable, inactive, ineligible for the Store, or lacks sufficient balance, so that recorded balances never become negative or ambiguous.
23. As an Organization administrator, I want every tracked Outgoing Payment to appear as a negative entry in the selected Money Account's history, so that the displayed balance accounts for both incoming POS money and business spending.
24. As an Organization administrator, I want enabling tracking to affect only payments recorded after enablement and disabling it to stop only future outbound movements, so that historical balance records are never backfilled or erased.
25. As an Organization administrator, I want to reverse an incorrectly recorded individual Outgoing Payment with a reason, so that the payable balance and selected Money Account are corrected without deleting audit history.
26. As an Organization administrator, I want to void a mistaken recorded Purchase or Expense with a required reason, so that its remaining due is cancelled and each active payment is reversed without mutating historical records.
27. As an Organization administrator, I want to create a corrected replacement entry after a void, so that the financial record remains understandable and complete.
28. As an Organization administrator, I want Purchase and Expense lists and details to show status, payment state, Store, category or Vendor, totals, and due amounts, so that I can manage outbound money operationally.

## Implementation Decisions

- Build a shared Organization-scoped payables application seam for typed Expense Category, Purchase, Expense, Outgoing Payment, reversal, and void operations. Ganatri Admin consumes this seam; Ganatri POS and Ganatri Console do not create or mutate these records.
- Persist Store-scoped Purchase and Expense records with an explicit lifecycle of `draft`, `recorded`, and `voided`. A Draft Payable has no Payable Status, payment, due, or Money Account effect. A recorded payable's Payable Status is derived from its final total and active Outgoing Payments: `due`, `partial`, or `paid`.
- A payable cannot be overpaid. Recorded financial values and active Outgoing Payments are immutable. Drafts may be changed or discarded; a recorded correction uses an immutable payment reversal or a required-reason Payable Void followed by a replacement entry.
- A Purchase belongs to exactly one Vendor and one Store. Creating or editing a Draft Purchase requires an active Vendor and active Vendor Items under that Vendor. Store Vendor configuration remains Organization-wide; it is not duplicated per Store.
- Persist Purchase Lines with Vendor Item and Unit identity plus immutable name, Unit-label, and agreed-unit-price snapshots. The line total is the entered quantity multiplied by the agreed unit price. The vendor's default purchase price supplies the initial editor value only.
- Persist an optional signed Purchase Adjustment outside the lines and calculate the final total as line totals plus that adjustment. The adjustment is visible to administrators; it is not a hidden manual total replacement.
- A Purchase and an Expense both carry an effective date defaulting to today; earlier dates are allowed and future dates are rejected. Each may carry an optional supplier invoice/reference number and optional notes. Receipt or document uploads are not introduced.
- An Expense has exactly one active Expense Category and one final payable total. Spending across categories is represented by separate Expenses rather than category line items on one Expense.
- Add Organization-wide Expense Category configuration. Seed each Organization's availability of the predefined, read-only categories Rent, Electricity, Water, Internet & Phone, Salaries & Wages, Maintenance & Repairs, Transport, Supplies, Marketing, Taxes & Fees, and Other. Allow Organization-defined categories. Both predefined availability and custom categories use active/inactive status; no category deletion command is exposed, and historical records retain their category snapshot.
- Persist an immutable Outgoing Payment against exactly one recorded Purchase or Expense. It records positive paid amount, payment method, optional reference and notes, effective payment time, creator, and current reversal relationship. Its amount must not exceed the outstanding amount of its payable.
- With Money Account Tracking disabled or unavailable for the payable's Store, accept Cash, UPI, and Card only and record no Money Account Movement. With tracking active, additionally allow Bank Transfer and Other; require the administrator to select an active Money Account available to that Store and eligible for the selected outgoing method.
- Keep POS Payment Routing Rules exclusively for POS collections. Outgoing payments never infer a funding account from a POS route; the administrator explicitly selects it. The selected Money Account's type determines eligibility for the chosen outgoing method, with both Store-scoped and Organization-wide accounts permitted when available to the payable's Store.
- Extend the append-only Money Account Movement model with outbound-payment source kinds and links. A tracked Outgoing Payment writes one negative Movement in the selected account in the same database transaction as the payment. Its reversal writes one positive compensating Movement referencing the original; a Payable Void reverses every still-active payment exactly once. No original movement, payment, or balance total is edited or deleted.
- Lock the selected Money Account row during tracked payment creation and reject the transaction if debiting it would make its calculated balance negative. The Money Account Balance remains opening balance plus signed Movement total and is never directly updated by the client.
- The Store's tracking state at the exact time an Outgoing Payment is recorded controls whether a Money Account Movement is required. Enabling tracking does not backfill earlier outgoing payments. Disabling tracking preserves prior Movement history and allows new untracked Cash, UPI, and Card outgoing payments; re-enabling affects later payments only.
- Extend Money Account history and balance read contracts to present incoming POS collections, existing sale-replacement reversals, outbound payments, and their reversals with source-specific labels and links to their source record.
- Provide Ganatri Admin destinations and workflows for Purchases, Expenses, and Expense Category management. Lists and details must support the normal responsive loading, error, empty, filtering, and mutation feedback patterns already used by Vendors, Billing, and Money Accounts. Purchase selection should reuse the existing Vendor and Vendor Item query contracts; Money Account selection should reuse the existing eligible-account and tracking-readiness data.
- Preserve tenant isolation and existing authenticated Organization-administrator authorization for every new configuration, payable, payment, reversal, history, and report operation.

## Testing Decisions

- Test behavior through the shared payables contracts, backend service operations, tenant routes, and Admin user flows rather than internal storage or component implementation details.
- Add shared-schema tests for every DTO and request: lifecycle, Payable Status, dates, amounts, optional references/notes, Purchase Lines, signed Purchase Adjustment, Expense Categories, Outgoing Payment methods, and reversal/void reasons. Reject invalid UUIDs, future dates, zero/negative payment amounts, malformed decimal precision, invalid statuses, and forbidden fields.
- Use the existing Vendor/Unit contracts as prior art to verify only active Vendor and Vendor Item combinations are selectable for new or edited Draft Purchases, while recorded Purchase snapshots remain visible after later deactivation or changes.
- Test Expense Category seeding, predefined read-only behavior, Organization-defined create/update/inactivation, no deletion endpoint, normalized-name uniqueness, tenant isolation, and historical Expense category snapshot behavior.
- At the payables service seam, test Draft creation, editing, discard, record-with-no-payment, full payment, partial payment, later payment, distinct method/account payments, derived due/partial/paid states, no overpayment, effective-date validation, and Vendor Outstanding calculation from recorded Purchases only.
- Test immutable correction behavior: individual payment reversal recalculates the payable, a Payable Void requires a reason, cancels the remaining due, reverses only active payments once, and permits a corrected replacement. Assert retry/idempotency and transaction rollback cannot duplicate payments or reversal Movements.
- Follow existing Money Account tracking tests to verify account eligibility, active status, Store scope, Organization-wide scope, balance locking, and atomic persistence. Assert an outbound payment creates exactly one negative Movement only while tracking is active; failure of the Movement rolls back the payment; insufficient balance rejects the full transaction; and a reversal creates exactly one positive compensating Movement in the original account.
- Verify tracking transition behavior: no outbound backfill on enablement, retained history on disablement, untracked payment behavior while disabled/unavailable, and tracking resumes only for later payments. Assert POS payment routing is never consulted for outgoing payments.
- Test Money Account history and calculated balance with mixed incoming POS, outgoing Purchase and Expense payments, individual payment reversals, and Payable Void reversals.
- Add Admin behavioral tests following existing Vendors, Billing, Money Accounts, dialogs, forms, query-key, and navigation patterns. Cover category management; draft/record/payment/void actions; vendor-dependent active item choices; price and adjustment calculations; tracked/untracked funding UI; validation and sufficient-balance errors; list/detail status and due visibility; responsive rendering; and loading, empty, and error states.
- Run focused types, services, backend, Admin, and money-account tracking tests plus their type checks after implementation.

## Out of Scope

- Inventory, stock movements, goods receipt, cost of goods sold, batches, expiry, product creation from Vendor Items, and Vendor Item-to-Product linking.
- Vendor credit accounts, advance payments, unapplied cash, cross-Purchase payment allocation, credit notes, returns, refunds, or an accounts-payable ledger beyond record-level due amounts and calculated Vendor Outstanding.
- Expense line splitting across categories, recurring expenses, expense approval workflows, budgets, tax/GST calculation, accounting journals, or statutory accounting reports.
- Receipt, invoice, or document upload/storage and OCR.
- Card processor settlement timing, processing fees, payouts, bank reconciliation, transfers between Money Accounts, manual balance adjustments, cash drawers/shifts, or daily cash close.
- Creating or mutating Purchases, Expenses, Expense Categories, or Outgoing Payments from Ganatri POS or Ganatri Console.
- Backfilling existing historical payments or automatically inferring spending from Money Account Balances.

## Further Notes

- Terminology follows the shared glossary: Purchase, Expense, Expense Category, Purchase Line, Purchase Adjustment, Outgoing Payment, Outgoing Payment Funding Source, Payable Status, Draft Payable, Vendor Outstanding, and Payable Void.
- ADR 0017 records the void-and-reversal rule because it is the durable financial-history boundary for this feature.
- The existing POS payment tracking ADR remains valid: POS routing governs incoming collections only; outbound account selection is deliberately explicit.
