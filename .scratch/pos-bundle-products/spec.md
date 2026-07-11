# POS Bundle Products For Fixed Offer Billing

Status: ready-for-agent

## Problem Statement

Organizations need to sell fixed combo offers such as `Burger Combo` where `Burger + Extra Cheese + Cold Coffee` is sold for `99`, even though the current catalog sum of those parts is `119`. The current Catalog and Billing model supports plain Products and parent-scoped Add-Ons, but it does not support a fixed commercial offer that is itself a Product, has its own explicit price, preserves its internal composition for receipts and reporting, and remains trustworthy when catalog data changes later.

## Solution

Introduce `Bundle Product` as a typed Product inside the normal catalog, created through a bundle-specific authoring flow and backed by normalized component records. A Bundle Product has its own Product `price`, `discount`, category, status, and POS presence, while its internal composition is a fixed tree of one or more top-level Product components plus optional parent-scoped Add-Ons under those Product components. Billing sells the bundle as one priced Sale Item, stores dedicated child bundle-component snapshot records underneath it, merges identical bundle lines by quantity, scales the full component tree with bundle quantity, keeps bundle lines indivisible in the Draft Sale, and supports reporting in both bundle and component dimensions without allocating bundle revenue into components.

## User Stories

1. As an organization admin, I want to create a `Bundle Product`, so that a combo offer can be sold as its own Product.
2. As an organization admin, I want a Bundle Product to live in the normal category structure, so that POS browsing stays familiar.
3. As an organization admin, I want bundle creation to happen in a dedicated bundle flow, so that I do not accidentally author a normal Product as a bundle.
4. As an organization admin, I want a bundle to use only existing catalog Products and Add-Ons, so that its internals stay connected to real catalog identities.
5. As an organization admin, I want a bundle to support multiple top-level Products, so that offers like `Burger + Cold Coffee` are modeled naturally.
6. As an organization admin, I want a bundle to allow just one top-level Product when needed, so that fixed offers like `Burger + Extra Cheese` are still valid bundles.
7. As an organization admin, I want every bundle to require at least one top-level Product, so that Add-Ons never become standalone bundle roots.
8. As an organization admin, I want bundle components to support whole-number quantities, so that a combo can contain repeated items such as `Cold Coffee x2`.
9. As an organization admin, I want the same Product to appear twice in one bundle when its Add-On shape differs, so that `Burger plain` and `Burger + Extra Cheese` can coexist in one offer.
10. As an organization admin, I want identical repeated bundle components to merge into quantity, so that the definition stays normalized.
11. As an organization admin, I want Add-Ons inside a bundle to stay attached to their parent Product components, so that bundle structure preserves the existing add-on meaning.
12. As an organization admin, I want bundle Add-Ons to reuse normal `Product Add-On Attachment` rules, so that bundles do not invent a second add-on eligibility model.
13. As an organization admin, I want bundle Add-On quantities to obey `Add-On Selection Cap`, so that curated bundles still respect the same attachment validity rules.
14. As an organization admin, I want only active Products, active Add-Ons, and active attachments to be selectable into a bundle, so that saved bundles start valid.
15. As an organization admin, I want bundle price changes to be explicit edits on the bundle itself, so that component price changes do not silently reprice offers.
16. As an organization admin, I want to edit a bundle in place for future sales, so that menu maintenance stays practical without version churn.
17. As an organization admin, I want to retire a used bundle by inactivating it rather than deleting it, so that historical bills remain explainable.
18. As an organization admin, I want active bundle dependencies to block component inactivation, so that an active bundle never points at inactive internals.
19. As an organization admin, I want active bundle dependencies to block attachment deactivation too, so that a bundle cannot silently lose a required `Product -> Add-On` link.
20. As a biller, I want a bundle to appear in POS as a clearly labeled Bundle Product, so that I can distinguish it from normal Products quickly.
21. As a biller, I want tapping a bundle to add one fixed commercial item, so that selling a combo stays as fast as selling a normal Product.
22. As a biller, I want the POS to send only bundle id and quantity, so that bundle structure and pricing stay backend-trusted.
23. As a backend developer, I want Billing to load the trusted bundle definition and write the priced bundle snapshot plus component snapshots itself, so that the client cannot mutate combo internals.
24. As a biller, I want the charged amount of a bundle to come only from the bundle Product's own price and discount, so that component pricing does not distort combo billing.
25. As a biller, I want component prices and discounts to remain non-billing metadata inside a bundle sale, so that the bundle remains the commercial line item.
26. As a biller, I want adding the same bundle again to merge by quantity, so that Draft Sales stay clean.
27. As a biller, I want changing bundle quantity to scale the full component tree automatically, so that repeated combos remain mathematically consistent.
28. As a biller, I want an already-added bundle line to stay indivisible, so that it cannot explode into separate normal lines and lose its offer identity.
29. As a biller, I want bundle snapshots to freeze once added to a Draft Sale, so that later catalog edits do not rewrite an in-progress bill.
30. As a store operator, I want receipts and bill details to show one priced bundle line with nested component details, so that customers and staff can both understand what the combo contains.
31. As a business owner, I want bundles reported as commercial items, so that I can see how often a combo itself sells.
32. As a business owner, I want component usage inside bundles reported separately, so that I can still analyze which Products and Add-Ons appear inside combos.
33. As a finance user, I want component-level bundle reports to stay usage-only instead of carrying allocated revenue, so that bundle money meaning remains honest.
34. As a finance user, I want order-level discount to still apply to Sales that contain bundle lines, so that bundles participate in the normal Sale-wide discount model.

## Implementation Decisions

- Keep bundles inside the existing `Product` model with an explicit product type such as `single` vs `bundle`.
- Keep Bundle Products in the normal category structure and the normal POS product browsing grid.
- Create bundles through a bundle-specific catalog flow instead of optional composition fields on every product form.
- Reuse the normal Product money shape for bundles:
  - bundle `price`
  - bundle `discount`
  - no special final-price-only schema
- Keep bundle pricing explicit on the bundle itself. Component Product and Add-On prices or discounts do not affect billed totals for bundle Sales.
- Model bundle composition through normalized child records rather than a JSON blob.
- Model bundle composition as a fixed tree:
  - bundle
  - one or more top-level Product components
  - optional Add-On components nested only under their parent Product component
- Keep bundle composition single-level in v1:
  - bundles may not contain other bundles
  - Add-Ons may not have children
- Require every bundle to contain at least one top-level Product component.
- Allow bundles with exactly one top-level Product when that still represents a meaningful fixed offer.
- Allow multiple top-level Product components in one bundle.
- Allow whole-number quantities on Product and Add-On components inside bundles.
- Keep same-product components separate when their Add-On shapes differ.
- Merge repeated same-product components into quantity when their Add-On shapes are identical.
- Reuse normal `Product Add-On Attachment` as the only source of truth for bundle Add-On eligibility.
- Require bundle Add-On quantities to obey the underlying attachment's `Add-On Selection Cap`.
- Do not allow direct Add-On attachments on Bundle Products themselves in v1.
- Allow only active Products, active Add-Ons, and active attachments to be selected into bundle definitions.
- Prevent inactivation of an active Product or Add-On while it is still depended on by an active Bundle Product.
- Prevent deactivation of an active `Product Add-On Attachment` while it is still depended on by an active Bundle Product.
- Allow bundle definitions to be edited in place for future sales.
- Prefer inactivation over hard deletion once a bundle has history or meaningful dependencies.
- Make POS send a selection-only bundle payload:
  - `bundleProductId`
  - `quantity`
- Do not accept cashier-authored bundle component trees or cashier-authored component pricing in Billing payloads.
- Keep the priced commercial billing row as the bundle `sale_item`.
- Store bundle internals in dedicated child bundle-component billing records rather than reusing priced `sale_items` for bundle internals.
- Freeze the bundle snapshot and component snapshots once the bundle has been added to a Draft Sale.
- Merge identical bundle lines by quantity in Draft Sales.
- Scale the full bundle component tree automatically when bundle quantity changes.
- Keep bundle lines indivisible in Draft Sales:
  - quantity may change
  - line may be removed
  - line may not explode into separate normal Product or Add-On rows
- Render bundle receipts and bill details as:
  - one priced bundle parent line
  - nested component detail rows underneath
- Support reporting in both dimensions:
  - bundle-level commercial sales reporting
  - component-level usage reporting across internal Products and Add-Ons
- Keep component-level bundle reporting usage-only. Do not allocate bundle revenue or discount down into components.
- Allow Sale-wide order discount to apply normally to Sales that contain bundle lines.
- Keep inventory and stock effects out of scope for bundle v1.

## Testing Decisions

- Good tests should verify externally visible bundle catalog and Billing behavior rather than helper implementation details.
- Prefer the highest seams possible. The main seams for this feature should be:
  - Catalog service behavior for typed Product bundle authoring, dependency validation, and lifecycle locks
  - Billing service behavior for bundle Draft Sale creation, merge, scaling, commit, and snapshot preservation
  - API contract validation for typed Products and selection-only bundle payloads
  - POS workflow integration around browsing, bundle add, nested rendering, and quantity edits
- Prior art already exists in the repo for:
  - configured product Billing behavior tests
  - Add-On catalog and attachment service tests
  - request schema validation around Billing and Catalog payloads
- The first high-value catalog tests should cover:
  - creating a typed Bundle Product
  - enforcing at least one top-level Product component
  - allowing multiple top-level Product components
  - allowing one top-level Product plus fixed Add-Ons
  - rejecting bundle-in-bundle composition
  - rejecting Add-On-only bundles
  - rejecting inactive Product, inactive Add-On, or inactive attachment during bundle authoring
  - rejecting bundle Add-On quantity above `Add-On Selection Cap`
  - preserving separate components when same Product has different Add-On shapes
  - merging identical repeated components by quantity
  - blocking Product, Add-On, or attachment deactivation when an active bundle depends on it
  - allowing in-place bundle edits for future sales
- The first high-value Billing tests should cover:
  - creating a bundle Draft Sale line from bundle id plus quantity only
  - writing one priced bundle `sale_item`
  - writing dedicated child bundle-component snapshot records
  - keeping component money non-billing for charged totals
  - merging identical bundle lines by quantity
  - scaling the full component tree when bundle quantity changes
  - freezing bundle snapshots across later bundle-definition edits
  - keeping bundle lines indivisible in the Draft Sale
  - exposing nested component detail in bill detail and receipt-like output
  - allowing order-level discount to apply on a Sale containing bundle lines
- The first high-value reporting tests should cover:
  - bundle-level sales counts
  - component usage counts across bundle internals
  - no allocated revenue on component-level bundle reports
- The first high-value UI tests should cover:
  - visible bundle type badge in catalog and POS
  - separate bundle creation and edit flow
  - add bundle to composer from the normal product browse grid
  - nested component rendering under a priced bundle line
  - quantity updates on bundle lines
  - inability to customize or explode bundle lines in place

## Out of Scope

- POS-time customization of bundle internals
- Direct Add-Ons on the bundle wrapper itself
- Bundles containing other bundles
- Multi-level Add-On trees
- Freeform typed bundle components that are not catalog-backed
- Component-driven automatic bundle repricing
- Revenue allocation from bundle lines down into component reports
- Inventory or stock decrement from bundle component trees
- Refund, return, or post-payment reversal flows specific to bundles
- Store-private bundle catalogs in v1
- Separate bundle-only category or bundle-only POS browsing tree
- Mandatory new bundle version creation for every bundle edit

## Further Notes

- This feature extends the existing Billing language around `Product`, `Draft Sale`, `Sale Item Snapshot`, `Add-On`, and `Order-Level Discount` rather than introducing a separate offer-engine domain.
- Bundles deliberately build on the Add-On model instead of replacing it:
  - Add-Ons remain parent-scoped
  - bundles curate fixed valid combinations of Products and Add-Ons
- The main architectural decisions behind this spec are:
  - bundle pricing stays on the bundle Sale Item
  - bundles are typed Products, not a separate catalog root
  - bundle composition uses normalized child records
  - bundle Billing uses dedicated component records
