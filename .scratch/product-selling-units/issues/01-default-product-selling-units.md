# 01 — Default Product Selling Units

**What to build:** Make the configured default portion a complete Product-selling path. Existing Catalog Products become `1pc` at their current price. Administrators can configure an eligible Product's Unit and Default Selling Quantity, and ordinary POS taps or product-code scans sell that one portion. The cart, bill, receipt, and history show the Sold Product Name, such as `Cake (250g)` or `Water Bottle (1pc)`.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] All existing Products are safely backfilled to the Organization's predefined Piece Unit, a Default Selling Quantity of `1`, and custom quantity disabled, without changing current selling prices.
- [x] An administrator can create and edit an eligible single Product with an active Organization Unit and a positive Default Selling Quantity of up to two decimal places; cross-Organization and inactive Unit assignments are rejected.
- [x] Bundle and Combo Products remain fixed `1pc` portions and cannot be configured for a different Unit, Default Selling Quantity, or custom quantity in V1.
- [x] An ordinary POS tap and a product-code scan add exactly one configured default portion; repeated equal selections increase the Sale Item quantity.
- [x] Saved Sale Items preserve the default portion amount, Unit label, one-portion rate, and Sold Product Name so cart restoration, bill detail, receipts, sale history, invoices, reports, and applicable KOT output remain historically accurate after Product or Unit changes.
- [x] Cart, bill, receipt, and history output render the amount suffix for every Product line without renaming the underlying Catalog Product.
- [x] Behaviour is covered through catalogue and billing public behavior tests plus POS interaction and rendered-output tests.

## Answer

Default selling units are live for ordinary Product create/edit, POS tap/scan, and Sale/KOT snapshots.

New and backfilled singles default to the Organization Piece Unit at quantity `1` with custom quantity disabled. Administrators can assign an active same-org Unit and a positive two-decimal Default Selling Quantity; the Product price is the price of that one portion. Bundles and Combos stay locked to `1pc`. Ordinary POS taps and product-code scans add that default portion and merge equal lines by incrementing cart quantity. New Sale and KOT lines persist sold amount, Unit identity/label, one-portion rate, and Sold Product Name (`Cake (250g)`, `Water Bottle (1pc)`) so later catalog edits do not rewrite history. Custom amounts and `allowCustomSellingQuantity` remain ticket 02.

## Comments

- Migration `apps/backend/db/migrations/20260903010000_add_product_selling_units.sql` backfills products and snapshots sold quantity/unit, but does not rewrite historical `product_name_snapshot` text. Pre-migration bills keep unsuffixed names; new sales get the suffix.
- Ticket 02 is untouched: `configuration_signature` still matches `productId::addOnSignature`, and POS has no custom-amount action.
