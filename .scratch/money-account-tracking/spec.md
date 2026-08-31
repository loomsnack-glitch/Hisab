# Money Account Tracking

Status: ready-for-agent

## Problem Statement

Money Accounts are configured but do not yet hold a starting balance, receive POS collections, or show a balance. An administrator therefore cannot see whether the Cash, UPI, or Card money received at a Store is reflected in the real business account that holds it.

Money Account Tracking must remain optional per Store. It will be excluded from the base subscription plan in the future, while an entitled Organization administrator decides which eligible Stores actually use it. Stores that do not use it must retain today's POS behavior.

## Solution

Introduce a small, append-only Money Account Movement capability. An administrator records an optional, non-negative Opening Balance for each Money Account while it has no movements; omitted means zero. The displayed Money Account Balance is calculated from that Opening Balance plus its Movements and is never directly overwritten.

Add Money Account Tracking as a Store feature, disabled by default. Current Organization administrators may enable it per Store through existing Store Features settings. The server must isolate the availability check behind an entitlement seam: it permits the feature today and a later subscription capability can deny it without changing Store-level tracking data or behavior rules.

When tracking is enabled, Cash, UPI, and Card Payments create positive Money Account Movements atomically as each Payment is recorded. Cash goes to the Store's sole active Store Cash Account. UPI and Card use administrator-configured Payment Routing Rules for that Store; both may point to the same active eligible Money Account. Bank Transfer and Other Payments remain ordinary POS Payments and create no Movement in this release.

## User Stories

1. As an Organization administrator, I want to enable Money Account Tracking only for a selected Store, so that other Stores can continue using the base POS without financial tracking.
2. As an Organization administrator, I want to record the Opening Balance of an existing or newly created Money Account before tracking begins, so that its first displayed balance starts from the money already held there.
3. As an Organization administrator, I want to route a Store's UPI and Card Payments to active eligible Money Accounts, so that POS collections increase the correct account; the same Bank Account may receive both methods.
4. As an Organization administrator, I want Cash Payments to go automatically to the Store Cash Account, so that staff do not choose a cash destination at POS.
5. As a POS operator at a tracking-enabled Store, I need Cash, UPI, or Card collection to be rejected when its required active destination is missing, so that Hisab never accepts a tracked payment without an accountable destination.
6. As an Organization administrator, I want every full, partial, and later-collected eligible Payment to appear once in the destination account history, so that Money Account Balances agree with the tracked POS collections.
7. As an Organization administrator, I want to see an account's Opening Balance, calculated balance, and immutable movement history, so that I can inspect where the amount came from.
8. As an Organization administrator, I want changing a UPI or Card route to affect only future payments, so that historical movements and balances remain trustworthy.
9. As an Organization administrator, I want disabling tracking for a Store to stop new Movements but retain its history and configuration, so that the feature can be safely paused and resumed.
10. As an Organization administrator, I want a Money Account's type, scope, and Store assignment locked after it receives a Movement, so that its historical meaning cannot be rewritten.
11. As an Organization administrator, I want editing a tracked paid bill to reverse the original collections and record the replacement payments, so that the Money Account Balance matches the current bill rather than counting both the original and the replacement.

## Implementation Decisions

- Add `money_account_tracking_enabled` to `stores`, defaulting to `false`, and surface it in the existing Store DTO, Store update contract, device session, and Store Features form. Organization administrators own this setting.
- Introduce one server-side `Money Account Tracking availability` seam. It permits all Organizations until subscription plans exist; later it evaluates the Feature Entitlement. Availability and the Store setting are independent: tracking is active only when both permit it.
- Disabling tracking, or later losing entitlement, does not delete or mutate Money Accounts, Opening Balances, Routing Rules, or Movements. It merely stops creation and enforcement for new POS Payments. Organization administrators can read the retained history.
- Store Opening Balance on the Money Account with a non-negative two-decimal amount and a zero default. It may be set or changed only while that account has no Money Account Movements. Its value, Type, scope, and Store assignment are immutable once the first Movement exists; name, notes, and status remain editable.
- Persist an append-only `money_account_movements` record for each tracked collection. It belongs to the Organization and Money Account, records a positive amount, occurrence timestamp, Store, source kind `pos_payment`, and a unique linked Payment. It must not store a mutable running balance.
- Persist a `store_money_account_payment_routes` record for each Store and `upi` or `card` method. The `(organization, store, payment method)` combination is unique. Its destination must be an active Money Account in the same Organization that is either Organization-wide or scoped to that Store. Cash has no editable route: the active Store Cash Account is its destination.
- Account Balance is calculated, not persisted as an editable total: Opening Balance plus the signed sum of Money Account Movements. Account detail shows the Opening Balance followed by its Movement history, linked to each Payment and Sale, including automatic bill-edit reversals.
- For a tracking-enabled Store, create the Payment and its Movement in the same transaction across every existing payment entry point: checkout, partial payment, and later payment collection. A retried request must not duplicate either record.
- When `replaceSaleForDevice` / `replaceSaleInStore` voids a Sale that has Money Account Movements, the same transaction appends exactly one negative `sale_replacement_reversal` Movement per original Movement, in the same Money Account, without deleting or mutating the original. The reversal references the original Movement, does not reuse its Payment id, and is unique per original Movement so replacement retries cannot duplicate it. Reversals are still created if tracking is currently disabled or unavailable; new replacement Payments follow the ordinary current feature-enable rules.
- For a tracking-enabled Store, Cash needs an active Store Cash Account; UPI and Card need active valid Routing Rules. A missing or inactive destination rejects only that selected method with a clear administrator-setup message. Bank Transfer and Other retain their current POS behavior and never create Movements.
- Routing uses the destination selected when the Payment is created. Editing or removing a route changes only future Payments and never changes a Movement's linked Money Account.
- Card and UPI both post immediately to their configured Money Account. Card processor settlement delay, fees, payouts, and transfers are intentionally excluded. This permits the same Money Account to receive UPI and Card payments.
- No historical Payments are backfilled. The administrator's Opening Balance represents money held at the point tracking begins for an account.
- No manual additions, reductions, corrections, expenses, deposits, transfers, refunds, daily close, settlement, reconciliation, or purchase-payment movements are introduced. These are later Movement source types, not edits to Balance.
- Keep configuration in Ganatri Admin. POS exposes no Money Account selector; it reports missing setup only when a selected Cash, UPI, or Card Payment cannot be routed at a tracking-enabled Store.

## Testing Decisions

- Add shared-schema tests for the Store tracking setting, Opening Balance validation, Money Account Movement DTOs, and UPI/Card Routing Rule validation. Reject negative, malformed, cross-organization, invalid method, and forbidden-field inputs.
- Test Store feature authorization and the availability seam independently. Verify that disabled or unavailable Stores retain ordinary POS behavior, while enabled Stores enforce the selected-method destination rules.
- Test Money Account service and route behavior for tenant isolation, movement immutability, Opening Balance lock after first Movement, and post-movement type/scope/Store lock. Verify name, notes, and status still update as allowed.
- Test Routing Rules for one rule per Store/method, Organization-wide and matching Store-scoped destinations, rejection of another Store's account, inactive account behavior, shared UPI/Card destination, and future-only edits.
- At the billing service seam, test atomic success for checkout, partial payment, and later collection; one Movement per Payment; idempotent retries; correct route snapshot; Cash routing; disabled tracking; missing route/Store Cash rejection; and Bank Transfer/Other non-tracking.
- Verify that replacing a tracked paid Sale writes one negative reversal per original Movement, records the replacement Payments under current tracking rules, keeps Account Balance as Opening Balance plus the signed Movement total, does not duplicate reversals on retry, and rolls back the whole replacement if reversal persistence fails.
- Verify Card and UPI post immediately, no historical Payment is backfilled, and no manual Movement or direct balance-write endpoint exists.
- Add Admin behavior tests for Store-level enablement, Opening Balance input and lock state, UPI/Card route configuration, displayed calculated balance, movement-history detail, disabled/unavailable retained history, validation, and mobile/desktop error states.
- Run focused backend, Admin, POS, services, and types tests plus their type checks after implementation.

## Out of Scope

- Subscription plan, billing, checkout, entitlement storage, or plan-management UI. This release provides the future entitlement seam only.
- Mapping or tracking Bank Transfer and Other Payments.
- Card settlement timing, processor fees, payouts, or transfers from Card Settlement to Bank Accounts.
- Manual Movement creation, balance corrections, expenses, deposits, refunds, transfers, purchase payments, or vendor balances.
- Historical Payment backfill or inference from existing Store/Payment data.
- Cash-counting, shifts, drawers, daily opening/closing, reconciliation, accounting journals, tax/GST, or financial reports beyond account balance and history.
- Storing bank-account numbers, UPI IDs, terminal IDs, QR images, credentials, or payment-provider integrations.

