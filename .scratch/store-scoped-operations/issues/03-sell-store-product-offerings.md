# 03 — Sell Store Product Offerings

**What to build:** POS and Billing show and sell only active Store Product Offerings for the authenticated Store, applying that Store's trusted price and discount while leaving historical bills unchanged by future offering edits.

**Blocked by:** 02 — Manage Store Product Offerings.

**Status:** resolved

- [x] POS product discovery for a Store Device contains only active Store Product Offerings for that Device's Store.
- [x] Billing derives product price and discount from the selected Store Product Offering on the server and never accepts those values from the client.
- [x] Billing rejects a product with no active Offering at the Sale's Store, even if the product identifier belongs to the same Organization.
- [x] Later changes to a Store Product Offering do not change Sale Item, KOT, or receipt snapshots already recorded.
- [x] Existing product and billing behavior remains valid for the migrated default offerings.

## Comments

POS `getProductsForDevice` lists only the Device Store's active Offerings, overlaying trusted offering price/discount. Billing `prepareSaleItems` looks up the Sale Store's Offering and rejects missing/inactive products even when the Catalog Product ID is valid. Frozen draft lines and recorded Sale Item / KOT snapshots keep their original prices after later offering edits. Admin/POS billing (non-device) overlays active offerings for the selected Store; backend validation remains authoritative.

Ticket 02 now always creates one Offering per Product × Store, so "no offering" should be rare. Billing still rejects a missing Offering defensively. Live availability is `status: inactive`, not deletion.
