# 03 — Move the POS Tables workflow

**What to build:** Make the complete table-service workflow available from Ganatri POS `/tables`, preserving its Store Device authorization and all existing operational table states.

**Blocked by:** 02 — Create the standalone Ganatri POS core.

**Status:** ready-for-agent

- [ ] An authenticated Store Device can open POS `/tables` and see only its Store's Service Tables and Service Areas.
- [ ] Allocation, draft-order continuation, billing, payment collection, release, and discard actions retain their current permitted-state behavior.
- [ ] POS table layout, simple view, state labels, and relevant device-scoped caching continue to behave as before.
- [ ] Existing table-service behavior tests move with POS and remain green.

