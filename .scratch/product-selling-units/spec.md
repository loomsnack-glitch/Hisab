Status: ready-for-agent

# Product Selling Units and Custom Quantities

## Problem Statement

Ganatri Admin already provides Organization-wide Units for Vendor Items, but Catalog Products are always treated as a single unnamed portion at one price. A business cannot define Cake as 250 g for ₹250, show that amount clearly in POS and bills, or sell a different amount such as 500 g without creating a separate Product.

This causes the Product catalogue to duplicate the same sellable item for each requested amount and prevents POS staff from recording the portion actually sold.

## Solution

Give every Catalog Product one Unit and a Default Selling Quantity. Its configured selling price is the price of exactly that amount. All existing Products become `1pc` at their current prices.

Ganatri POS adds one Default Selling Quantity on an ordinary Product tap. The cart, bill, receipt, and sale history identify every portion using the Sold Product Name format `Product name (amount<label>)`, for example `Cake (250g)` or `Water Bottle (1pc)`.

An administrator may enable Custom Selling Quantity for a plain single Product. POS then offers a separate custom-amount action, prefilled with the Product's Default Selling Quantity. The cashier may enter any positive amount with no more than two decimal places. POS calculates the price proportionally, rounds the one sold portion to the nearest paise, and creates or merges the corresponding Sale Item. The Product price is never manually overridden in this flow.

Bundles and Combos remain fixed `1pc` portions in V1.

## User Stories

1. As an Organization administrator, I want every existing Catalog Product to be treated as `1pc` at its current selling price, so that adopting Units does not change my existing catalogue or prices.
2. As an Organization administrator, I want to select an active Organization Unit for a new single Catalog Product, so that I can sell it in grams, kilograms, litres, pieces, or another configured measure.
3. As an Organization administrator, I want to set a positive Default Selling Quantity for a Product, so that I define what one ordinary POS tap sells.
4. As an Organization administrator, I want to set the Product price for exactly its Default Selling Quantity, so that the Product's base price is clear.
5. As an Organization administrator, I want `Cake`, `250`, `g`, and `₹250` to mean one sellable portion of `Cake (250g)`, so that POS staff do not need to calculate its ordinary price.
6. As an Organization administrator, I want the Unit picker to show only active Units for new or edited Product settings, so that retired Units are not assigned again.
7. As an Organization administrator, I want an inactive Unit to remain visible on Products that already use it, so that historical and existing catalogue data remains understandable.
8. As an Organization administrator, I want to opt a plain single Product into Custom Selling Quantity, so that only measured Products expose extra POS controls.
9. As an Organization administrator, I want ordinary Products to remain tap-only by default, so that selling bottles, packets, and other fixed portions stays fast.
10. As an Organization administrator, I want bundles and combos to remain fixed `1pc` Products, so that their configured components are not incorrectly scaled.
11. As a POS cashier, I want one tap on a 250 g Cake to add one `Cake (250g)` portion at ₹250, so that normal sales require no extra input.
12. As a POS cashier, I want a second normal tap on the same Cake to make the existing line quantity 2, so that the line total becomes ₹500.
13. As a POS cashier, I want the custom-amount action to begin with the Product's Default Selling Quantity, so that accepting the usual amount is quick.
14. As a POS cashier, I want accepting the prefilled 250 g amount to merge into the existing `Cake (250g)` line, so that I do not receive duplicate identical cart lines.
15. As a POS cashier, I want entering 500 g for a Cake configured as 250 g for ₹250 to add `Cake (500g)`, quantity 1, rate ₹500, so that the actual portion sold is recorded.
16. As a POS cashier, I want a later 500 g Cake selection to merge with the existing `Cake (500g)` line, so that each distinct portion has one cart line.
17. As a POS cashier, I want to enter amounts such as `250.5g` or `0.75kg`, so that measured goods can be sold accurately without a quantity-step configuration.
18. As a POS cashier, I want invalid amounts—blank, zero, negative, or more than two decimal places—to be rejected before they change the cart, so that a Sale cannot contain an invalid portion.
19. As a POS cashier, I want POS to calculate a custom portion price automatically, so that I cannot accidentally charge a price unrelated to the configured Product rate.
20. As a POS cashier, I want a custom portion whose calculated price has fractions of a paise to be rounded once to the nearest paise, so that the displayed rate and line total agree.
21. As a POS cashier, I want the POS cart to show the amount suffix on every Product line, including `1pc`, so that I can verify exactly what is being sold.
22. As a customer, I want the bill and receipt to show `Cake (250g)`, quantity `2`, rate `₹250`, and total `₹500`, so that the amount purchased and charged are unambiguous.
23. As an Organization administrator, I want sale history and sale detail views to retain the amount suffix and charged rate from the Sale, so that later Product edits do not rewrite the historical bill.
24. As a Product manager, I want two Sale Items for the same Product but different sold amounts to remain separate even if their add-on configuration is otherwise identical, so that `Cake (250g)` and `Cake (500g)` are never merged.
25. As a Product manager, I want the same Product, same sold amount, and same add-on configuration to merge according to existing configuration rules, so that the new amount does not regress configured Sale Item behavior.
26. As a POS cashier, I want product-code scanning to add the Product's Default Selling Quantity, so that scanning has the same behavior as an ordinary Product tap.
27. As an Organization administrator, I want to edit a Product's current Unit, Default Selling Quantity, price, or custom-quantity setting without rewriting existing Sale Items, so that completed and Draft Sale snapshots remain trustworthy.
28. As an Organization administrator, I want Product listings and edit forms to make the configured Unit and Default Selling Quantity understandable, so that I can audit what a Product price represents.

## Implementation Decisions

- Extend the Product contract, persistence model, and catalogue create/update operations with the selected Unit, a positive Default Selling Quantity, and the boolean Custom Selling Quantity setting. The configured Product price remains the price for exactly one Default Selling Quantity.
- Backfill every existing Product to the Organization's predefined Piece Unit with a Default Selling Quantity of `1` and Custom Selling Quantity disabled. Ensure each Organization has its predefined Piece Unit before this backfill runs.
- All Product types receive a Unit and Default Selling Quantity. Newly created or existing Bundle and Combo Products are fixed to `1pc` and cannot enable Custom Selling Quantity in V1. Plain single Products can use any active Unit and may enable the setting.
- Product creation and editing validate that the selected Unit belongs to the same Organization and is active. A Default Selling Quantity must be positive and may have no more than two decimal places. Unit status continues to follow the existing Unit lifecycle: an inactive Unit stays visible on current and historical records but cannot be newly assigned.
- Add the Unit selector, Default Selling Quantity input, and Custom Selling Quantity control to the Ganatri Admin Product workflow. The custom setting is only offered for eligible single Products. Product list/detail displays should make the price basis understandable without changing the base catalogue Product name.
- Extend POS Product reference data and the cart-composer item shape with the Unit label, the amount represented by one sold portion, and its calculated price. The cart's `quantity` remains the count of equal sold portions; it is not grams, kilograms, or another Unit amount.
- A normal Product tap and product-code scan create one portion at the Default Selling Quantity. For example, a Product configured as 250 g for ₹250 creates `Cake (250g)`, rate ₹250, quantity 1.
- An eligible single Product exposes a separate custom-amount action in POS. It opens an amount field prefilled with the Default Selling Quantity and labelled by the Product Unit. The action accepts only positive numeric values with up to two fractional decimal places; V1 has no product-level minimum, increment, or quantity-step setting.
- Calculate the custom portion rate as `Product price × chosen amount ÷ Default Selling Quantity`. Round this one-portion rate to the nearest paise before any cart quantity multiplication. Do not provide a cashier price override.
- Persist a Sale Item snapshot of the sold amount, Unit identity/label, the computed one-portion rate, and the Sold Product Name. This snapshot is the authoritative source for POS draft restoration, bills, receipts, KOTs where applicable, sale detail, invoice exports, and reporting text; subsequent Product or Unit edits cannot change it.
- Format every Sold Product Name as the base Product name followed by ` (amount<label>)`, without a space between amount and label: `Water Bottle (1pc)`, `Cake (250g)`, and `Rice (0.75kg)`. Use the normalized submitted amount in the suffix, without meaningless trailing decimal zeroes.
- Extend the existing Configured Sale Item Signature and its persisted equivalent to include the sold amount as well as Product and add-on configuration. Exact same Product, normalized amount, and add-on configuration merge into one Draft Sale Item; a differing amount always creates a separate Sale Item.
- Preserve the established add-on behavior for a configured single Product: add-ons are selected and priced per sold portion, while only the parent Product price is calculated proportionally. A custom amount is part of the parent Sale Item identity, so it also prevents merging otherwise equal add-on configurations across different amounts.
- Apply the same validation and pricing preparation on the backend's existing sale-item preparation seam for every sale write or draft update. POS validation improves feedback but is not the authority.
- Existing Product discounts continue to apply to the computed one-portion Product price under the current Sale pricing rules. Sale-level discounts and all existing payment, void, audit, and money-account behavior remain unchanged.

## Testing Decisions

- Test externally observable behavior through the existing sale-item preparation boundary and POS cart interactions, not individual database columns or internal helper calls.
- Add catalogue service/API tests covering default values for new Products, Unit ownership and active-status validation, positive two-decimal Default Selling Quantity validation, the custom-setting eligibility rule, and the migration/backfill outcome.
- Add billing service/API tests covering normal Default Selling Quantity pricing, custom proportional pricing, nearest-paise rounding, invalid custom amounts, the absence of a price override, and preservation of snapshots after Product changes.
- Add merge-behavior tests for the same Product and amount, different amounts for the same Product, and same/different add-on configurations. These extend the existing configured Sale Item merge tests.
- Add POS interaction tests covering ordinary tap, scan, custom-amount dialog defaults and validation, a custom amount matching the default, a different amount creating a new cart line, and cart display of the Sold Product Name.
- Add receipt, bill-detail, history, and invoice-output tests confirming the persisted Sold Product Name, cart quantity, rate, and total are presented consistently.
- Add regression tests proving bundles and combos stay fixed portions and that existing sales, payment handling, KOT handling, product-code behavior, and add-on flows retain their existing outcomes outside the new sold-amount behavior.
- Use the existing catalogue schema/service tests, configured-billing service tests, POS billing-page tests, and receipt/printer tests as prior art. Reuse their public request/response and rendered-output assertions.

## Out of Scope

- Unit conversions, including automatically converting grams to kilograms or litres to millilitres.
- Product-level quantity steps, increments, minimums, maximums, or scale-device integration.
- Cashier-entered custom prices, negotiated prices, or price lists.
- Creating a new Catalog Product for each sold amount.
- Variable quantities for Bundles or Combos.
- Inventory, purchase-to-product mapping, stock deduction, recipes, cost calculation, or vendor-item changes beyond reusing the existing Unit catalogue.
- Changing Unit definitions, introducing Unit dimension metadata, or changing the existing Unit lifecycle.
- Changing payments, discounts, refunds/voids, money-account posting, or tax behavior.

## Further Notes

- Terminology and behavioral decisions are recorded in the shared domain glossary: Catalog Product, Default Selling Quantity, Proportional Product Price, Custom Selling Quantity, Sold Product Name, and the extended Configured Sale Item Signature.
- The implementation must treat the sold amount as a Sale Item snapshot, not a UI-only name suffix. The stored amount is required for correct merge behavior and historical accuracy.
- The canonical acceptance example is: Cake configured as 250 g for ₹250; two ordinary taps yield `Cake (250g)`, quantity 2, rate ₹250, total ₹500; custom 500 g adds `Cake (500g)`, quantity 1, rate ₹500.
