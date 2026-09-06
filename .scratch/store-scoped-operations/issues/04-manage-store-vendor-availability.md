# 04 — Manage Store Vendor Availability and purchase defaults

**What to build:** The Organization creates Vendors and Vendor Items once, assigns Vendors to the Stores allowed to buy from them, and maintains Store-specific default purchase prices. The Purchase workflow shows and accepts only the selected Store's eligible vendors and items.

**Blocked by:** 01 — Store workspace foundation.

**Status:** ready-for-agent

- [ ] Creating a Vendor requires valid target Stores from the current Organization and creates Store Vendor Availability only for those Stores.
- [ ] A Store workspace can manage assignment of an existing Organization Vendor but cannot create a private Vendor or Vendor Item.
- [ ] A Store Vendor Item Offering provides a Store-specific default purchase price for an eligible Vendor Item; the actual agreed Purchase Line price remains editable and historical.
- [ ] Purchase creation and editing list and accept only active, Store-assigned Vendors and their eligible Vendor Items.
- [ ] Existing Vendors and Vendor Items are assigned to all existing Stores with migrated default prices, preserving current purchasing behavior.
- [ ] The backend rejects cross-Organization, inactive, or unassigned Vendor/Vendor Item use in a Purchase.
