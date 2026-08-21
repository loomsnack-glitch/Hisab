# 02 — Single-KOT Table Order workflow

**What to build:** Staff can open an allocated Service Table as one Active Table Order, optionally associate a Customer, generate its first Table KOT from the cart, return to the table workspace, and check out that KOT into one final Sale through the existing payment and table-release lifecycle.

**Blocked by:** 01 — Parcel KOT foundation and Store configuration.

**Status:** ready-for-agent

- [ ] An allocated Service Table can have at most one device-scoped Active Table Order and does not require a Customer assignment.
- [ ] When both the KOT System and Table Management are enabled, staff can generate the first Table KOT, receive its KOT Number, and return to the table workspace.
- [ ] The engaged table presents enough state for staff to reopen its Table Order and continue its first KOT.
- [ ] Checkout of the Table Order produces one final table-linked Sale from its KOT snapshots and preserves existing paid and due table-release behavior.
- [ ] Table exclusivity, cross-device continuation, feature gating, trusted snapshots, checkout, and legacy non-KOT table workflow have external-behavior tests.
