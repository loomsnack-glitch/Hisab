# 02 — Custom Selling Quantities in POS

**What to build:** Let a cashier sell a measured amount different from an eligible single Product's Default Selling Quantity. The POS control starts at the default amount, accepts a valid custom amount, calculates its proportional one-portion price, and saves a distinct or merged Sale Item with the correct Sold Product Name and rate.

**Blocked by:** 01 — Default Product Selling Units

**Status:** resolved

- [x] An administrator can enable or disable Custom Selling Quantity only for an eligible single Product; it is off by default and unavailable for Bundles and Combos.
- [x] POS exposes a separate custom-amount action for an enabled Product, prefilled with the Default Selling Quantity and labelled with the configured Unit.
- [x] The action accepts only positive numeric amounts with at most two decimal places and leaves the cart unchanged for blank, zero, negative, or over-precision input.
- [x] POS and the authoritative sale-writing flow calculate the custom portion rate as configured price multiplied by chosen amount divided by Default Selling Quantity, rounded once to the nearest paise, with no cashier price override.
- [x] Choosing the unchanged default amount merges with the normal default-portion Sale Item; choosing a different amount creates or merges only the matching amount line.
- [x] A Cake configured as 250 g for ₹250 produces `Cake (250g)` at ₹250 for normal/default selections and `Cake (500g)` at ₹500 for a 500 g selection; the two amounts never merge.
- [x] Sale Item identity includes the normalized sold amount in addition to Product and existing configuration identity, and custom portion snapshots survive Product edits and draft reloading.
- [x] The new flow is covered by backend pricing/merge tests and POS validation, cart, bill, and receipt interaction tests.

## Answer

Custom Selling Quantity is live for eligible single Products.

Administrators can enable it on the single-product form; it stays off by default, and Bundles/Combos cannot turn it on. POS shows a separate scale action that opens an amount field prefilled with the Default Selling Quantity and labelled with the Unit. Invalid input is rejected before the cart changes. The sale-item preparation seam is the authority: it prices `configured price × amount ÷ Default Selling Quantity`, rounds once to the nearest paise, and merges by Product + normalized sold amount + existing add-on/combo identity. `Cake (250g)` at ₹250 and `Cake (500g)` at ₹500 stay distinct; confirming 250 g merges with the ordinary tap. Custom snapshots survive later Product edits. Ticket 03 (add-on/KOT/history compatibility) is untouched.

## Comments

- Merge identity uses the `soldQuantity` snapshot plus the existing add-on/combo `configurationSignature`. The stored signature string is still the add-on/combo part so ticket-01 merge assertions remain valid.
- POS always sends `soldQuantity` on sale writes. Omitted `soldQuantity` on draft update still restores a unique frozen line for that Product and configuration (ticket 01).
