# 03 — Move the POS Tables workflow

**What to build:** Make the complete table-service workflow available from Ganatri POS `/tables`, preserving its Store Device authorization and all existing operational table states.

**Blocked by:** 02 — Create the standalone Ganatri POS core.

**Status:** resolved

- [x] An authenticated Store Device can open POS `/tables` and see only its Store's Service Tables and Service Areas.
- [x] Allocation, draft-order continuation, billing, payment collection, release, and discard actions retain their current permitted-state behavior.
- [x] POS table layout, simple view, state labels, and relevant device-scoped caching continue to behave as before.
- [x] Existing table-service behavior tests move with POS and remain green.

## Answer

Ganatri POS now owns the Store Device table-service workflow at `/tables`. Layout, simple view, state labels, Store-scoped cache keys, and permitted actions (allocate, continue draft, collect, release, discard) are unchanged. Table-service behavior tests live in `apps/pos` and stay green. Admin `/pos/tables` remains until ticket 08.

## Comments

POS `/tables` is nested under the authenticated workspace. Desktop nav shows Tables; mobile reaches it from More. Billing still returns table-linked sales to `/tables`. Device-scoped `getPosServiceTables` / `getPosServiceAreas` and the existing POS API contract were not changed. Admin `/pos` table routes were left in place.

