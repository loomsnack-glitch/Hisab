# 01 — Store workspace foundation

**What to build:** An administrator can choose a Store and enter a URL-backed Store workspace that is visibly distinct from the Organization workspace. The selected Store becomes explicit context for subsequent Store operations, while the Organization workspace remains available for shared setup and all-Store views.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] An Organization administrator can select any Store belonging to the current Organization and reach a refresh-safe Store workspace URL.
- [x] The application clearly identifies the selected Store and provides a way to return to the Organization workspace or choose another Store.
- [x] Store context cannot name a Store from another Organization, and navigation visibility is not used as the only authorization check.
- [x] Existing Organization-level routes and workflows retain their current behavior.

## Comments

Store workspace foundation landed as `/organizations/:organizationId/workspaces/:storeId`, with a header workspace switcher, an Organization-owned store list entry point, and backend `GET /organizations/:organizationId/stores/:storeId` as the authoritative Store membership check. Organization store-detail, catalog, billing, and other existing routes are unchanged.
