# KOT checkout unification

Status: ready-for-agent

## Problem Statement

Cashiers currently have separate cart actions for Parcel KOT and Table KOT, while the Complete order dialog owns the saved Sale Service Mode, invoice actions, draft saving, and final placement. This splits one checkout decision across two places. It also prevents a standalone draft from building successive KOT batches and cannot represent a seated party that later adds a Pick-Up batch without incorrectly changing the table's final Dine-In bill.

## Solution

Move KOT generation into Complete order and remove the cart-level Parcel KOT and Generate KOT actions. When the Store has KOT System enabled, Complete order offers a default-selected Generate KOT toggle. The cashier may turn it off for ordinary direct POS draft saving or order placement; Save draft and Place order remain the only actions for that workflow.

With KOT generation selected, the selected Sale Service Mode determines the new standalone KOT's Dine-In or Pick-Up fulfillment label; Pick-Up prints as Parcel. A standalone Draft Sale can therefore have successive KOT batches. When reopened, previously generated KOTs are shown separately and only newly composed items generate the next KOT.

For an Active Table Order with new items, checkout requires KOT generation and presents only Generate KOT. A table KOT may be Dine-In or Pick-Up, but the eventual Table-Linked Sale remains Dine-In. With no new table items, checkout performs the normal final placement without a KOT option.

## User Stories

1. As a cashier in a Store without KOT System enabled, I want the Complete order dialog to omit Generate KOT, so that I see only options my Store supports.
2. As a cashier in a KOT-enabled Store using direct POS, I want Generate KOT selected when Complete order opens, so that ordinary kitchen orders do not require an extra step.
3. As a cashier, I want to deselect Generate KOT, so that I can save or place an ordinary sale without sending anything to the kitchen.
4. As a cashier, I want Save draft to remain available in direct POS regardless of the KOT toggle, so that I can defer a customer's bill without changing my checkout workflow.
5. As a cashier, I want Place order to remain available in direct POS regardless of the KOT toggle, so that I can complete a bill with or without a kitchen ticket.
6. As a cashier, I want a selected Generate KOT toggle to create a KOT when I save a direct sale as a draft, so that the kitchen can begin work before billing is final.
7. As a cashier, I want a selected Generate KOT toggle to create a KOT when I place a direct sale, so that one final action records both the bill and the kitchen work.
8. As a cashier, I want an unselected Generate KOT toggle to create no KOT for either Save draft or Place order, so that the sale remains an ordinary billing workflow.
9. As a cashier, I want a standalone KOT generated with Dine-In selected to print as Dine-In, so that kitchen staff understand it is not a takeaway order.
10. As a cashier, I want a standalone KOT generated with Pick-Up selected to print as Parcel, so that kitchen staff package it correctly.
11. As a cashier reopening a direct draft with prior KOTs, I want to see its existing KOT numbers separately from the composer, so that I can tell which items were already sent to the kitchen.
12. As a cashier reopening that draft, I want the composer to begin with no new items, so that I cannot accidentally resend an earlier KOT batch.
13. As a cashier adding a sandwich to a draft whose chai was already sent as KOT #101, I want Generate KOT to create KOT #102 containing only the sandwich, so that the kitchen never prepares the chai twice.
14. As a cashier editing an existing KOT, I want the established KOT-editing behavior to remain available, so that genuine corrections are not treated as new kitchen batches.
15. As a cashier opening POS from an Active Table Order with newly selected items, I want Checkout to lead to a mandatory Generate KOT action, so that new table items cannot bypass the kitchen.
16. As a cashier generating a new table KOT, I want to select Dine-In or Pick-Up for that KOT, so that a seated party can also order takeaway items.
17. As a cashier generating a Pick-Up KOT from a table order, I want that KOT to print as Parcel, so that the kitchen packages only that batch for takeaway.
18. As a cashier generating a Dine-In KOT from a table order, I want that KOT not to be marked Parcel, so that it is served to the table.
19. As a cashier, I want an Active Table Order with no new items to show only normal order placement, so that I can bill existing KOTs without creating an empty KOT.
20. As a cashier generating a table KOT, I do not want a Save draft action, so that I am not offered a second draft concept while the Active Table Order already holds the in-progress service.
21. As a cashier, I want a table's final bill to remain Dine-In even when the Table Order includes Pick-Up KOTs, so that the bill accurately remains linked to the seated service.
22. As a cashier, I want previous Dine-In and Pick-Up KOTs to preserve their own labels, so that the kitchen history remains accurate after final billing.
23. As a Store owner, I want KOT controls enforced by Store feature settings on the server as well as hidden in the POS, so that a modified client cannot create unsupported KOTs.
24. As a cashier, I want Print invoice and WhatsApp choices to stay independent from Generate KOT, so that I can choose each post-order action separately.
25. As a cashier, I want neither legacy Parcel KOT nor cart-level Table Generate KOT buttons to appear, so that checkout has one unambiguous KOT decision point.

## Implementation Decisions

- Treat KOT parentage and KOT fulfillment as separate concepts. A KOT is either standalone (linked to a Sale) or table-linked (linked to a Table Order), and independently has Dine-In or Pick-Up fulfillment. Pick-Up is the only fulfillment printed as Parcel.
- Retain a Sale's persisted Sale Service Mode. Direct POS Save draft and Place order continue to store the selected Dine-In/Pick-Up mode. A Table-Linked Sale is always stored as Dine-In; the dialog selection for a new table KOT affects that KOT only.
- Replace the one-standalone-KOT-per-sale assumption with ordered KOT batches. Each new generation records only lines newly added since the latest generated batch, retains trusted product configuration and pricing snapshots, and receives the next Store-local KOT Number.
- Keep established explicit KOT editing separate from adding a new batch. Editing a selected KOT changes that KOT; adding new composer lines generates a later KOT and does not duplicate former lines.
- Consolidate POS KOT decisions into Complete order. Remove the legacy cart-level Parcel KOT and Table Generate KOT controls and their direct submission paths.
- Show Generate KOT only when KOT System is enabled for the device's Store. Initialize it selected each time the Complete order dialog opens; it is independently selectable in direct POS.
- In direct POS, retain Save draft and Place order as the stable final actions. When Generate KOT is selected, either action performs its normal Sale transition and also creates the appropriate standalone KOT batch; when unselected, neither creates a KOT.
- When reopening a standalone Draft Sale that has KOTs, hydrate its KOT history separately and leave only ungenerated lines in the composer. Reuse the existing table KOT presentation and editing model where practical.
- For an Active Table Order with new composer items, Generate KOT is required and is the only final dialog action. Do not offer Save draft because the Active Table Order is already the in-progress non-financial record.
- For an Active Table Order with no new composer items, omit Generate KOT and use the existing table final-checkout placement flow. Do not create an empty KOT.
- Continue to require both KOT System and Table Management for table KOT generation. Require only KOT System for standalone KOT generation.
- Preserve the existing KOT Number sequence across every Dine-In and Pick-Up KOT in a Store, and preserve existing invoice printing, WhatsApp, settlement, payment, and customer-assignment behavior.
- Update API contracts, schema validation, persistence, read models, and KOT printing/presentation so each KOT exposes its fulfillment type and historic Sale/KOT relationships support multiple standalone KOT batches.

## Testing Decisions

- Test externally observable workflow behavior: which controls are visible, enabled, and actionable for the Store features, POS context, selected items, and KOT toggle; do not couple tests to component-local state or implementation details.
- Extend the existing POS KOT workflow helper and rendering tests to prove both legacy cart actions are absent, the dialog toggle follows Store KOT System state, direct POS retains Save draft/Place order, and table checkout distinguishes new-item KOT generation from empty-composer final placement.
- Add POS workflow coverage for reopening a KOT-backed standalone draft: historic KOTs display separately, the composer contains only pending new items, and adding one line produces a later KOT containing only that line.
- Extend KOT service behavior tests for Dine-In and Pick-Up fulfillment, Store-feature enforcement, multiple standalone KOT batches on one Sale, idempotent generation requests, and trusted snapshot preservation.
- Extend table KOT service tests for a Table Order containing both fulfillment modes, Parcel labeling of only Pick-Up KOTs, sequential KOT numbering, final-sale aggregation of all batches, and the invariant that the Table-Linked Sale remains Dine-In.
- Extend billing and bill-detail tests to verify Sale Service Mode persists for direct drafts and completed sales and remains visible in bill details without allowing a table KOT's Pick-Up selection to rewrite the Table-Linked Sale.
- Reuse the project's existing Bun tests for POS helpers/components and tenant billing/KOT services as the prior-art test style.

## Out of Scope

- Changes to Store feature administration beyond honoring its existing KOT System and Table Management settings.
- Printer transport, device pairing, printer configuration, or a redesign of the printed KOT layout beyond showing the correct Dine-In/Parcel fulfillment label.
- Changes to invoice or WhatsApp delivery behavior, payment calculations, discounts, customer assignment, or table allocation/release rules.
- Retroactively changing historic Sales or KOTs.
- Redesigning the established explicit KOT editing workflow or introducing kitchen change-ticket printing.

## Further Notes

- Generate KOT is a checkout option, not a replacement for the direct-POS Save draft or Place order actions.
- For a table with no new items, normal final placement is the only relevant action; no KOT control should be shown.
- The domain glossary and ADR 0010 record the agreed KOT batching, fulfillment, and table-final-bill rules.
