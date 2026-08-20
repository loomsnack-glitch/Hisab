# 04 — Move the POS Customers workflow

**What to build:** Make the Store Device customer workflow available from Ganatri POS `/customers`, including customer lookup, allowed customer changes, quick creation, and due-reminder actions.

**Blocked by:** 02 — Create the standalone Ganatri POS core.

**Status:** ready-for-agent

- [ ] An authenticated Store Device can browse and search Organization-scoped customers from POS `/customers`.
- [ ] Existing POS customer quick-create and permitted customer-update behavior remains available without granting Admin authentication.
- [ ] POS due-reminder behavior continues to use the device-scoped API contract and preserves existing user-visible outcomes.
- [ ] Any shared customer UI is intentionally shared rather than copied, and Admin's read-only customer view remains intact.

