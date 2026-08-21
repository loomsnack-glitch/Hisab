# KOT System

Status: ready-for-agent

## Problem Statement

Restaurants using Ganatri need to send table and takeaway orders to their kitchen before the customer is ready to settle the final bill. Today, table service is represented by one Draft Sale, so it cannot retain a sequence of kitchen orders, show their KOT numbers, or produce one final bill from all food ordered at a table. KOT and Table Management are already independently configurable Store features, but the POS has no KOT workflow.

## Solution

Introduce an editable Kitchen Order Ticket (KOT) system. When both Store features are enabled, staff create one Active Table Order for a seated table and generate one or more Table KOTs from its cart. The table workspace lets staff reopen the Table Order, inspect and edit any KOT, and generate later KOTs. Checkout combines the remaining KOT items into one final Sale.

When only the KOT System is enabled, counter staff can generate a Parcel KOT from the POS menu. It immediately creates the final Sale with a pending payment status, and payment is collected through the normal payment workflow. KOTs carry a persisted order type for later kitchen presentation, but printing and printer delivery are not part of this release.

## User Stories

1. As an Organization administrator, I want to enable or disable the KOT System per Store, so that only restaurants that need kitchen workflows use them.
2. As an Organization administrator, I want Table Management and the KOT System to remain independent Store features, so that parcel-only restaurants can use KOTs without configuring a floor plan.
3. As an Organization administrator, I want to configure the KOT Number reset period in Store settings, so that it matches the restaurant's operating convention.
4. As an Organization administrator, I want new Stores to default their KOT Number reset period to daily, so that kitchen sequences normally start fresh each day.
5. As a restaurant operator, I want Table and Parcel KOTs to share a Store-local KOT sequence that is separate from Sale Numbers, so that kitchen tickets have their own recognizable identifiers.
6. As a restaurant operator, I want KOT Numbers displayed in a human-friendly `KOT-001` style, so that staff can refer to a ticket quickly.
7. As a staff member, I want to allocate a Service Table before taking its first order, so that the floor reflects that guests are seated.
8. As a staff member, I want to start one Active Table Order for an allocated Service Table, so that all orders for that seated party stay together.
9. As a staff member, I want to take a table order without selecting a registered Customer, so that ordinary walk-in dining does not require customer data.
10. As a staff member, I want to optionally associate or change a Customer on an Active Table Order before checkout, so that a final Sale can retain customer information when it is useful.
11. As a staff member, I want a Generate KOT action while working on a Table Order, so that the selected cart items become a new Table KOT rather than a final bill.
12. As a staff member, I want generating a Table KOT to preserve its table association and return me to the table workspace, so that I can serve other tables immediately.
13. As a staff member, I want an engaged table to show every generated KOT and its KOT Number when I reopen it, so that I can understand the party's order history.
14. As a staff member, I want to select a KOT and see its items, quantities, selected add-ons, and configured products, so that I can verify the kitchen order.
15. As a staff member, I want to edit an existing KOT directly, so that I can correct an order without creating a kitchen amendment workflow in this release.
16. As a staff member, I want removing Pav Bhaji from an edited KOT to exclude it from the eventual final bill, so that a replacement order is charged correctly.
17. As a staff member, I want to add Misal Pav after an earlier KOT and generate a new KOT for it, so that later requests remain separately identifiable in the table's KOT list.
18. As a staff member, I want each KOT item to retain its trusted price and catalog configuration from KOT generation, so that a later catalog price or discount change does not alter an order already sent to the kitchen.
19. As a staff member, I want Place Order on an Active Table Order to combine the remaining items from all of its KOTs into one final Sale, so that the customer receives one bill for the meal.
20. As a staff member, I want table checkout to continue through the existing payment and receivable flow, so that a final Sale may be pending, partial, or paid according to the payment collected.
21. As a staff member, I want the Service Table to return to its existing post-checkout lifecycle, so that paid and due table release behavior continues to work.
22. As a counter staff member at a KOT-enabled Store, I want a Parcel KOT action from the POS menu, so that takeaway items can be sent through the kitchen workflow without a Service Table.
23. As a counter staff member, I want generating a Parcel KOT to immediately create the final Sale with a pending payment status, so that the order is placed before payment is collected.
24. As a counter staff member, I want to collect a Parcel KOT Sale's payment using the existing payment workflow, so that cash, UPI, card, and other payment methods work consistently.
25. As a future kitchen-printing workflow, I want every KOT to persist whether it is a table or parcel order, so that a later release can clearly present or print the correct order type.
26. As a Store Device user, I want KOT and Table Order data scoped to my Store, so that no device can create, view, or modify another Store's kitchen workflow.
27. As a staff member using another active device in the same Store, I want to continue an Active Table Order, so that service is not tied to one terminal.

## Implementation Decisions

- Add a KOT domain module with persistent Table Orders, KOTs, and KOT Items. A Table Order is a non-financial parent record for exactly one Service Table and may have at most one active instance per table.
- Replace the current table-service assumption that an engaged table points to one Draft Sale. An engaged table instead points to its Active Table Order; the financial Sale is created at checkout.
- Store KOT type as either `table` or `parcel`. Table KOTs require both the KOT System and Table Management Store features. Parcel KOTs require only the KOT System feature.
- Generate KOT Numbers from an independent Store-local sequence shared by both KOT types. Record the sequence number and reset-period key with the formatted KOT Number; uniqueness is enforced within the Store and reset period.
- Extend the existing Store billing-number settings with KOT reset-period configuration. Reuse the existing supported reset periods, Store time zone behavior, and default of daily reset. KOT Number formatting uses the `KOT-` prefix and a zero-padded sequence.
- KOT creation, KOT editing, and final table checkout are device-authenticated Store-scoped operations. Use transactional locking so two terminals cannot create parallel Active Table Orders or consume the same KOT sequence number.
- KOT Item data is trusted at KOT generation: the backend validates selected catalog identities and configurations, then stores product, add-on, bundle, pricing, and discount snapshots. Frontend-supplied prices are never trusted.
- Editing a KOT replaces its current editable item set. Removing an item removes it from the eventual final Sale. New menu selections are kept in the cart until staff generate a separate new KOT.
- Table checkout creates one Sale from the remaining items in every KOT in the Active Table Order, preserving each KOT Item's trusted snapshots rather than repricing from a later catalog state. The existing Sale payment and table-release lifecycle remains the source of truth after checkout.
- Parcel KOT generation persists the KOT and immediately commits the final Sale with no payment, leaving its payment status pending. It does not create a Table Order or a Service Table association.
- Expose device-facing KOT operations through the existing POS service boundary: open or load a table's active KOT state, create and edit Table KOTs, create Parcel KOTs, and check out the aggregated Table Order.
- Update the POS tables workspace and billing composer to show the KOT list, selected KOT details, cart-to-KOT generation, and table checkout. Gate each action from the Store feature flags while preserving non-KOT table management and ordinary POS workflows.
- KOT generation does not print, queue, dispatch, retry, or reprint tickets in this release. Type data is retained so a later kitchen presentation or printing feature can distinguish Table and Parcel KOTs.

## Testing Decisions

- Test externally visible behavior at the device-authenticated KOT service/API seam, backed by repository-level persistence tests where sequence allocation and transactional table exclusivity require it. Do not assert private implementation structure.
- Add schema and service tests for feature gating, Store scoping, one active Table Order per Service Table, shared KOT Number sequencing, reset-period boundaries, and default daily settings.
- Add service tests for trusted KOT Item snapshots, catalog changes after KOT creation, direct KOT edits, item removal, a later KOT for additional items, and final Sale aggregation from the remaining KOT items.
- Add service tests for Parcel KOT creation, immediate pending final Sale creation, absence of a Service Table association, and normal later payment collection.
- Add POS behavior tests for the table workspace KOT list, selection, editing, cart generation, return to tables, and feature-specific action visibility. Reuse the existing table-service, billing-page, number-formatting, and POS service test patterns as prior art.
- Add regression tests that confirm existing non-KOT table management, ordinary POS sales, Sale Number settings, token numbering, and paid/due table release behavior remain unchanged.

## Out of Scope

- Physical printing, kitchen-printer selection or routing, print success/failure handling, retries, reprints, print queues, and printer-specific layouts.
- Kitchen acknowledgement, preparation, completion, cancellation, or amendment workflows.
- A kitchen display screen, kitchen staff roles, or kitchen-specific authorization.
- Splitting one Table Order across multiple final Sales, merging tables, or moving KOTs between tables.
- Refunds, post-payment voiding, or inventory effects beyond the existing Billing model.
- Any new mandatory customer-identification requirement for table or parcel orders.

## Further Notes

- This specification uses the vocabulary in `CONTEXT.md` and records the central billing boundary in ADR 0009.
- The feature intentionally keeps KOTs editable in V1. No revision or change-ticket printout is required when staff edit a KOT.
- The persisted `table` and `parcel` distinction fulfills the future need to differentiate kitchen output, while actual kitchen output is explicitly deferred.
