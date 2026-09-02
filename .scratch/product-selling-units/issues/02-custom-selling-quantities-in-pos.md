# 02 — Custom Selling Quantities in POS

**What to build:** Let a cashier sell a measured amount different from an eligible single Product's Default Selling Quantity. The POS control starts at the default amount, accepts a valid custom amount, calculates its proportional one-portion price, and saves a distinct or merged Sale Item with the correct Sold Product Name and rate.

**Blocked by:** 01 — Default Product Selling Units

**Status:** ready-for-agent

- [ ] An administrator can enable or disable Custom Selling Quantity only for an eligible single Product; it is off by default and unavailable for Bundles and Combos.
- [ ] POS exposes a separate custom-amount action for an enabled Product, prefilled with the Default Selling Quantity and labelled with the configured Unit.
- [ ] The action accepts only positive numeric amounts with at most two decimal places and leaves the cart unchanged for blank, zero, negative, or over-precision input.
- [ ] POS and the authoritative sale-writing flow calculate the custom portion rate as configured price multiplied by chosen amount divided by Default Selling Quantity, rounded once to the nearest paise, with no cashier price override.
- [ ] Choosing the unchanged default amount merges with the normal default-portion Sale Item; choosing a different amount creates or merges only the matching amount line.
- [ ] A Cake configured as 250 g for ₹250 produces `Cake (250g)` at ₹250 for normal/default selections and `Cake (500g)` at ₹500 for a 500 g selection; the two amounts never merge.
- [ ] Sale Item identity includes the normalized sold amount in addition to Product and existing configuration identity, and custom portion snapshots survive Product edits and draft reloading.
- [ ] The new flow is covered by backend pricing/merge tests and POS validation, cart, bill, and receipt interaction tests.
