# 03 — Platform dashboard metrics

**What to build:** Give authenticated Ganatri owners a read-only dashboard that truthfully summarizes platform scale and recent adoption. It shows all-time Organization, Store, Customer Count, and completed-bill totals; fixed seven-day Active Organization and Active Store totals; and selectable-period completed-bill count, Completed Sales Value, and new Customer count.

**Blocked by:** 01 — Platform Owner authentication and console entry.

**Status:** ready-for-agent

- [ ] The dashboard is available only to active Owner Users and returns no reporting data to customer Users, Store Devices, or inactive Owner Users.
- [ ] All-time totals count Organizations, Stores, Customer records regardless of customer active status, and completed Sales only.
- [ ] Active Store means at least one completed Sale in the preceding seven Asia/Kolkata calendar days; Active Organization means at least one Active Store, including the correct treatment of Organizations with no Stores.
- [ ] Operators can select all-time, 7-day, 30-day, 90-day, and validated custom Platform Reporting Periods using Asia/Kolkata inclusive-start/exclusive-end boundaries.
- [ ] Reporting-period metrics count completed Sales and their `grand_total` as Completed Sales Value, exclude drafts and voids, and show Customer records created in the period; they never substitute Payment totals.
- [ ] The dashboard clearly distinguishes its fixed activity totals from metrics controlled by the selected reporting period and handles empty periods without error.
- [ ] Tests cover authorization, Sale status/payment-status semantics, customer active-state semantics, timezone boundaries, custom-range validation, and dashboard user-visible states.
