# POS Add-Ons For Parent-Scoped Billing

## Problem Statement

Organizations need to sell configurable products such as `Burger` with optional extras such as `Extra Cheese`, but the current Billing model only supports a single plain Product line per Draft Sale entry. This prevents billers from selling the same Product in multiple configurations within one Draft Sale, prevents organizations from managing reusable Add-Ons at the catalog level, and prevents reporting that answers both "which parent Products sold with Add-Ons?" and "which Add-Ons sold overall?".

## Solution

Introduce parent-scoped Add-Ons as reusable organization-level catalog items that can be attached to eligible Products with a per-product `Add-On Selection Cap`. In the POS workflow, a normal product tap adds the plain Product, while an explicit customize action allows the biller to choose optional Add-Ons for that Product. Billing stores the parent Product row and child Add-On rows separately with trusted catalog snapshots, merges identical configurations by quantity, keeps different configurations on separate lines, and computes sale totals from both parent Product rows and Add-On child rows.

## User Stories

1. As an organization admin, I want to create an Add-On with its own name, price, discount, and status, so that I can reuse it across multiple Products.
2. As an organization admin, I want Add-Ons to live in a flat organization-level catalog, so that managing extras stays simpler than managing Products.
3. As an organization admin, I want to attach the same Add-On to many Products, so that I do not need to recreate `Extra Cheese` separately for each Product.
4. As an organization admin, I want each Product/Add-On attachment to have its own `Add-On Selection Cap`, so that `Burger` and `Pizza` can allow different maximum quantities for the same Add-On.
5. As an organization admin, I want the `Add-On Selection Cap` to default to `1`, so that the common case is quick to configure.
6. As an organization admin, I want a Product/Add-On pair to exist only once, so that there is no ambiguity about which cap or status rule applies.
7. As an organization admin, I want to deactivate an Add-On without deleting its history, so that old bills and reports remain trustworthy.
8. As an organization admin, I want to deactivate a Product/Add-On attachment without deactivating the Add-On globally, so that one Product can stop offering an Add-On while other Products keep using it.
9. As a biller, I want a normal product tap to add the plain Product immediately, so that the fastest-selling flow stays fast.
10. As a biller, I want a separate customize action on a Product, so that I can add optional Add-Ons only when needed.
11. As a biller, I want all Add-Ons in the customize flow to start at selected quantity `0`, so that opening customize does not silently change the bill.
12. As a biller, I want to select multiple different Add-Ons for one Product configuration, so that I can build realistic menu combinations such as `Burger + Extra Cheese + Mayo`.
13. As a biller, I want Add-On quantities to respect each attachment's `Add-On Selection Cap`, so that invalid combinations are blocked before they reach the bill.
14. As a biller, I want Add-On quantities to be whole-number counts only, so that extras behave like countable menu items instead of fractional goods.
15. As a biller, I want Product quantities to be whole-number counts only, so that the POS never stores impossible fractional item counts.
16. As a biller, I want `Burger`, `Burger + Extra Cheese x1`, and `Burger + Extra Cheese x2` to appear as separate Configured Sale Items in one Draft Sale, so that I can represent what the customer actually ordered.
17. As a biller, I want the same normalized configuration to merge by quantity, so that repeating `Burger + Extra Cheese x2` is handled with a quick quantity increase instead of duplicate lines.
18. As a biller, I want add-on click order not to matter, so that `Mayo then Cheese` and `Cheese then Mayo` count as the same configuration when their final quantities match.
19. As a biller, I want a customized Product with no selected Add-Ons to merge back into the plain Product line, so that the Draft Sale stays clean.
20. As a biller, I want a Configured Sale Item's Add-On selection to become frozen once added, so that I can safely adjust line quantity without unexpectedly mutating its configuration.
21. As a biller, I want to remove and re-add a Configured Sale Item when I need a different Add-On combination, so that edits stay explicit and easy to reason about.
22. As a biller, I want increasing a Configured Sale Item quantity to multiply both the parent Product and its selected Add-Ons, so that repeating the same configuration is fast.
23. As a biller, I want already-added Draft Sale lines to keep their frozen snapshots even if catalog data changes later, so that my in-progress bill does not change under my hands.
24. As a biller, I want to commit a Draft Sale even if one of its already-selected Add-Ons or attachments was deactivated afterward, so that valid in-progress work can still be completed.
25. As a biller, I want the POS client to send only Product ids, Add-On ids, and quantities, so that pricing and discount trust stays on the backend.
26. As a backend developer, I want Billing to derive the Configured Sale Item Signature and pricing snapshots itself, so that all business rules live in one trusted place.
27. As a backend developer, I want invalid customized selections to fail atomically, so that the recorded bill always matches what the biller intended to sell.
28. As a store operator, I want receipts and bill details to show Add-Ons nested under their parent Product rows, so that customers and staff can both understand the bill.
29. As a business owner, I want Add-On sales to be analyzable under the parent Product, so that I can see which Products are driving Add-On usage.
30. As a business owner, I want Add-On sales to be aggregatable by Add-On across all Products, so that I can see the overall performance of `Extra Cheese`, `Mayo`, and similar extras.
31. As a finance user, I want Product discounts and Add-On discounts to stay separate from Payments, so that billing totals and settlement logic remain accurate.
32. As a finance user, I want order-level discount to reduce the whole configured sale total while remaining represented at the Sale level, so that bill totals are correct without adding complex row-level discount allocation in v1.

## Implementation Decisions

- Add `Add-On` as a first-class organization-scoped catalog concept with its own price, discount, active/inactive lifecycle, and audit fields.
- Keep the Add-On catalog flat in v1 rather than introducing Add-On categories.
- Add a `Product Add-On Attachment` concept that links one Product to one Add-On, is unique per Product/Add-On pair, and owns only attachment status plus `Add-On Selection Cap`.
- Treat attached Add-Ons as optional in v1. Attachment means "eligible to choose", not "required to choose".
- Keep Add-On pricing global on the Add-On itself. Product attachments do not override Add-On price or Add-On discount.
- Restrict both Product quantities and Add-On quantities to whole counts everywhere in the system, including client validation, API validation, service logic, and database constraints.
- Keep Add-On selection single-level only. Products may have Add-Ons, but Add-Ons cannot themselves have child Add-Ons.
- Keep `sale_items` as the parent Product billing rows rather than replacing the whole sale-item model.
- Add child `Sale Item Add-On Row` records under each parent `sale_item` for selected Add-Ons in configured Product lines.
- Store full historical snapshots on both parent Product rows and Add-On child rows. Add-On child snapshots should include Add-On name, trusted unit price, trusted unit discount, selected quantity per parent unit, computed total quantity for the line, and computed money totals.
- Persist a normalized `Configured Sale Item Signature` on the parent `sale_item` so Draft Sale merge behavior can distinguish plain Product lines from configured Product lines efficiently.
- Define line identity as parent Product plus normalized Add-On quantities. Add-On selection order must not affect identity.
- Replace the current product-only duplicate-line rule with configuration-aware merge behavior:
  - same Product and same normalized Add-On selection merges by quantity
  - same Product with different Add-On selection stays on a separate line
  - customize with no selected Add-Ons merges into the plain Product line
- Freeze Add-On selection once a Configured Sale Item has been added to a Draft Sale. Quantity may change, but configuration edits require removing and re-adding the line.
- Keep parent `sale_item` money fields parent-only. Parent rows represent only parent Product pricing, while Add-On pricing lives only on child rows.
- Compute `sales.subtotal`, `sales.discount_total`, and `sales.grand_total` from both parent `sale_items` and child `sale_item_add_ons`.
- Keep order-level discount represented at the Sale level in v1 rather than proportionally distributing it down into parent and child rows.
- Make the frontend send a selection-only payload for configured Product billing: parent Product id, parent quantity, and only selected Add-On ids plus quantities greater than zero.
- Do not accept cashier-supplied Product or Add-On pricing/discounts in Billing payloads. The backend must load trusted catalog values and write billing snapshots itself.
- Validate configured Product selections atomically. A line is accepted only when every selected Add-On is valid for the Product, active where required, non-duplicated, whole-count, and within cap.
- Stop inactive Products, Add-Ons, and attachments from appearing in future POS customize flows immediately, while allowing already-added Draft Sale lines to keep their frozen snapshots until removed.
- Allow already-configured Draft Sale lines to commit even if the related Product, Add-On, or attachment becomes inactive later.
- Support reporting in both dimensions:
  - Add-On sales rolled up under parent Products
  - Add-On sales aggregated by Add-On across all Products
- Extend the catalog management surface to support Add-On CRUD and Product/Add-On attachment CRUD in addition to existing Product and Category management.
- Extend the POS billing workspace to support a customize flow, nested configured-line rendering, and quantity-only edits for frozen configurations.

## Testing Decisions

- Good tests should verify externally visible billing and catalog behavior, not internal helper structure. They should prove that the system accepts valid configurations, rejects invalid ones, computes trusted totals correctly, preserves snapshots, and renders the expected configured-line behavior.
- Prefer the highest seams possible:
  - billing service behavior for Draft Sale creation, update, merge, commit, and totals
  - catalog service behavior for Add-On and attachment lifecycle rules
  - API contract validation for whole-count and selection-only payload rules
  - POS workflow integration around plain tap, customize add, merge, and frozen configuration behavior
- The first high-value backend tests should cover:
  - creating a plain Product line
  - creating a configured Product line with one Add-On
  - creating a configured Product line with multiple Add-Ons
  - merging identical configurations by quantity
  - keeping different configurations on separate lines
  - rejecting duplicate Add-On ids in one selection
  - rejecting inactive Product, inactive Add-On, or inactive attachment for new selections
  - rejecting quantity above `Add-On Selection Cap`
  - rejecting decimal Product or Add-On quantities
  - recomputing totals from parent Product rows plus Add-On child rows
  - preserving frozen snapshots across later catalog changes
  - committing a Draft Sale that contains now-inactive but already-frozen configured lines
- The first high-value catalog tests should cover:
  - creating and updating Add-Ons
  - enforcing unique Product/Add-On attachment pairs
  - attachment-level cap defaults and cap validation
  - attachment-level deactivation independent of Add-On deactivation
- The first high-value UI or workflow tests should cover:
  - normal tap adds plain Product
  - customize flow starts Add-On quantities at zero
  - customize with no selected Add-Ons merges into plain Product
  - identical configured lines merge by quantity
  - quantity updates scale the whole frozen configuration
  - configuration cannot be edited in place from the Draft Sale line
  - nested child-line rendering in bill detail and receipt views
- There is little existing test prior art in the current repo, so this feature should establish the first consistent Billing and Catalog behavior tests at the service and workflow seams.

## Out of Scope

- Required Add-Ons or minimum-selection rules
- Per-Product price overrides for the same Add-On
- Add-On categories or multi-level Add-On trees
- Add-Ons on Add-Ons
- Fractional or weight-based sale quantities
- In-cart editing of an already-added line's Add-On configuration
- Automatic proportional allocation of order-level discount into parent and child rows
- Refund, return, or post-payment reversal flows
- Inventory effects for Products or Add-Ons
- Store-private Add-On catalogs in v1
- Manual free-text sale lines that bypass the Product catalog

## Further Notes

- This feature extends the existing Billing language around `Draft Sale`, `Sale Item Snapshot`, `Discount`, and `Payment` rather than introducing a separate invoice-style model.
- The implementation should respect the existing architectural direction that catalog pricing and billing settlement are separate concepts.
- The expected highest implementation seam is the Billing service plus its shared request/response contract, with the catalog service acting as the supporting reference-data seam for Add-On and attachment lifecycle rules.
- The PRD assumes GitHub Issues is the project issue tracker and `ready-for-agent` is the correct triage label, matching the repo's engineering-skill configuration.
