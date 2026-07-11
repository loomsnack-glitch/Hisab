# 06 — Bundle sales visibility and discount-compatible reporting

**What to build:** add the read-model and reporting behavior that makes bundle sales visible in both commercial and component dimensions, while keeping component reporting usage-only and ensuring Sales with bundle lines continue to participate in the normal Sale-wide order discount model.

**Blocked by:** 04 — Sell a bundle with trusted snapshots; 05 — Draft-safe bundle sale behavior.

**Status:** ready-for-agent

- [ ] Reporting can show bundle-level commercial sales for Bundle Products as sellable items in their own right.
- [ ] Reporting can also show component-level usage counts and quantities across internal Products and Add-Ons without allocating bundle revenue or discount into those components.
- [ ] Sale detail, receipt-style output, and any reporting-facing read paths preserve the nested bundle structure clearly enough to explain composition.
- [ ] Behavior tests cover bundle-level reporting, component usage-only reporting, and Sales that contain bundle lines plus Sale-wide order discount.
