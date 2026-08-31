# 02 — Draft and record Vendor Purchases

**What to build:** Let an Organization administrator create, edit, discard, and record Store-scoped Purchases from one Vendor. The Purchase workflow selects active Vendor Items, captures trustworthy line snapshots and adjustments, records a due-only payable, and provides usable Purchase list and detail views.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Administrators can create, edit, and discard a Draft Purchase without creating a payable balance, Outgoing Payment, or Money Account Movement.
- [ ] A Draft Purchase requires one Store and one active Vendor; it offers only that Vendor's active Vendor Items, each with its default price and Unit prefilled.
- [ ] Purchase Lines capture quantity, agreed unit price, and Vendor Item/Unit/name snapshots; the final total visibly includes an optional signed Purchase Adjustment.
- [ ] Recording a valid Purchase creates a due-only recorded Purchase with effective date, optional invoice/reference and notes, calculated total, paid total of zero, and Payable Status `due`.
- [ ] Purchase lists and details show Store, Vendor, lifecycle, totals, due amount, lines, and snapshots with responsive loading, empty, error, and validation states.
- [ ] Typed contracts, tenant authorization, Organization isolation, active configuration checks, decimal/date validation, snapshot preservation, and Admin behavior are covered by external-behavior tests.
