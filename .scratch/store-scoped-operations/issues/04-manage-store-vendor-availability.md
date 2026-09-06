# 04 — Manage Store Vendor Availability and purchase defaults

**What to build:** Every Organization Vendor is present at every Store through a Store Vendor Availability. The Organization creates the shared Vendor once. Each Store configures that Vendor's active/inactive purchasing status and Store-specific default purchase prices. Availability is status only; Availabilities are never deleted, and a Store never creates a private Vendor or Vendor Item.

**Blocked by:** 01 — Store workspace foundation.

**Status:** resolved

- [x] Creating a Vendor creates one Store Vendor Availability for every current Store in the Organization, default **active**.
- [x] Creating a Store creates one Store Vendor Availability for every existing Organization Vendor, default **inactive**.
- [x] Creating a Vendor Item creates a Store Vendor Item Offering for every Store where its Vendor has an Availability.
- [x] A Store workspace Vendors list shows every Organization Vendor joined to that Store's Availability (status and Store Item Offering prices). Inactive Vendors stay visible and do not vanish from the list.
- [x] A Store can change Availability status and Store Item Offering default purchase prices only. It cannot create Vendors, Vendor Items, pick target Stores, assign a Vendor, or unassign a Vendor.
- [x] DELETE of a Store Vendor Availability is not available. The backend has no delete route or repository delete; availability is `status: inactive` only. Deactivation prevents new Purchases at that Store and retains the Availability and all Store Vendor Item Offering prices.
- [x] Purchase creation and editing list and accept only Vendors whose Store Vendor Availability is active, and only their eligible Store Vendor Item Offerings.
- [x] Existing Vendor × Store pairs are backfilled additively: missing pairs become inactive, existing Store-specific prices are preserved, and already-present Availabilities keep purchasing eligibility via `status: active`.
- [x] Store/Organization mismatches are rejected by the backend.

## Comments

Reviewed implementation used `targetStoreIds`, Assign/Unassign, and DELETE that made a Vendor disappear from the Store list. That model is rejected.

Every Vendor × Store pair has exactly one Store Vendor Availability. New Vendors are active at current Stores. New Stores inherit existing Vendors as inactive. Store Vendor Item Offering prices are retained while a Vendor is inactive at a Store. Reactivating restores purchasing eligibility with those prior Store prices. Full Store-workspace sidebar destinations remain ticket 08; this ticket puts Store Vendors in the Store sidebar next to Store Products.

## Answer

Availabilities are created for every Vendor × Store pair: active when a Vendor is created, inactive when a Store is created. POST/DELETE availability APIs are gone; the Store Vendors page lists inactive Vendors and can only change status and Store default purchase prices. Purchases accept only active Store Vendor Availabilities.
