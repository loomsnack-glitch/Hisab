# 02 — Manage Store Product Offerings

**What to build:** Every Organization Catalog Product is present at every Store through a Store Product Offering. The Organization creates the shared Catalog Product once. Each Store configures that product's selling price, discount, and active/inactive status. Availability is status only; Offerings are never deleted, and a Store never creates a private Catalog Product.

**Blocked by:** 01 — Store workspace foundation.

**Status:** resolved

- [x] Creating a Catalog Product creates one Store Product Offering for every current Store in the Organization, default **active**, seeded from the create-form price and discount.
- [x] Creating a Store creates one Store Product Offering for every existing Catalog Product, default **inactive**, seeded from the Catalog Product's stored price and discount.
- [x] A Store workspace Products list shows every Organization Catalog Product joined to that Store's offering (price, discount, status). Inactive products stay visible and do not vanish from the list.
- [x] A Store can change offering price, discount, and status only. It cannot create Catalog Products, edit shared catalog details, add a missing offering, or delete an offering.
- [x] DELETE of a Store Product Offering is not available. The backend has no delete route or repository delete; availability is `status: inactive` only.
- [x] Organization product editing does not expose live price, discount, or status. Those belong to Store offerings. Create-time price/discount are seed values for the new active offerings.
- [x] Existing Catalog Product price, discount, and status are migrated into an offering for every existing Store, preserving the current effective menu on rollout.
- [x] Store/Organization mismatches are rejected by the backend.

## Comments

Reviewed implementation used target Stores, an "Add catalog product" flow, and DELETE that made a product disappear from the Store list. That model is rejected.

Every Product × Store pair has exactly one Offering. New products are active at current Stores. New Stores inherit existing products as inactive. The Store Products page lists all Organization products with that Store's commercial configuration. POS/Billing still sell only **active** offerings (ticket 03). Full Store-workspace sidebar destinations remain ticket 08; this ticket makes Store Products the Store-scoped Products list, not a separate "product offerings" shortcut.

## Answer

Offerings are created for every Product × Store pair: active when a Catalog Product is created, inactive when a Store is created. POST/DELETE offering APIs are gone; the Store Products page lists inactive products and can only change price, discount, and status. Organization product edit no longer exposes live commercial fields. Product nav in a Store workspace opens that Store's Products list.
