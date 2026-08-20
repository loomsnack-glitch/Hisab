# 06 — Move the POS Purchases workflow

**What to build:** Make Store Device purchase management available from Ganatri POS `/purchases`, preserving the existing device-scoped purchase lifecycle and Ganatri Admin's separate read-only inspection behavior.

**Blocked by:** 02 — Create the standalone Ganatri POS core.

**Status:** ready-for-agent

- [ ] An authenticated Store Device can list, create, update, inspect, and perform the currently permitted void action for purchases at POS `/purchases`.
- [ ] Purchase data remains constrained by the authenticated Store Device's Store through the existing API contract.
- [ ] Existing validation, status, totals, and error behavior remains observable in POS after the move.
- [ ] Ganatri Admin's purchase inspection remains user-authenticated and read-only.

