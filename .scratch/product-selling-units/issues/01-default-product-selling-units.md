# 01 — Default Product Selling Units

**What to build:** Make the configured default portion a complete Product-selling path. Existing Catalog Products become `1pc` at their current price. Administrators can configure an eligible Product's Unit and Default Selling Quantity, and ordinary POS taps or product-code scans sell that one portion. The cart, bill, receipt, and history show the Sold Product Name, such as `Cake (250g)` or `Water Bottle (1pc)`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] All existing Products are safely backfilled to the Organization's predefined Piece Unit, a Default Selling Quantity of `1`, and custom quantity disabled, without changing current selling prices.
- [ ] An administrator can create and edit an eligible single Product with an active Organization Unit and a positive Default Selling Quantity of up to two decimal places; cross-Organization and inactive Unit assignments are rejected.
- [ ] Bundle and Combo Products remain fixed `1pc` portions and cannot be configured for a different Unit, Default Selling Quantity, or custom quantity in V1.
- [ ] An ordinary POS tap and a product-code scan add exactly one configured default portion; repeated equal selections increase the Sale Item quantity.
- [ ] Saved Sale Items preserve the default portion amount, Unit label, one-portion rate, and Sold Product Name so cart restoration, bill detail, receipts, sale history, invoices, reports, and applicable KOT output remain historically accurate after Product or Unit changes.
- [ ] Cart, bill, receipt, and history output render the amount suffix for every Product line without renaming the underlying Catalog Product.
- [ ] Behaviour is covered through catalogue and billing public behavior tests plus POS interaction and rendered-output tests.
