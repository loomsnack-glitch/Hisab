# 03 — Sell Store Product Offerings

**What to build:** POS and Billing show and sell only active Store Product Offerings for the authenticated Store, applying that Store's trusted price and discount while leaving historical bills unchanged by future offering edits.

**Blocked by:** 02 — Manage Store Product Offerings.

**Status:** ready-for-agent

- [ ] POS product discovery for a Store Device contains only active Store Product Offerings for that Device's Store.
- [ ] Billing derives product price and discount from the selected Store Product Offering on the server and never accepts those values from the client.
- [ ] Billing rejects a product with no active Offering at the Sale's Store, even if the product identifier belongs to the same Organization.
- [ ] Later changes to a Store Product Offering do not change Sale Item, KOT, or receipt snapshots already recorded.
- [ ] Existing product and billing behavior remains valid for the migrated default offerings.
