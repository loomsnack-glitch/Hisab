# 04 — Settle Purchases with Outgoing Payments

**What to build:** Let an Organization administrator settle recorded Purchases fully, partially, or later through immutable Outgoing Payments. Payments work with or without Money Account Tracking, calculate Vendor Outstanding, and—when tracking is active—debit the explicitly selected eligible Money Account atomically.

**Blocked by:** 02 — Draft and record Vendor Purchases.

**Status:** ready-for-agent

- [ ] Recorded Purchases accept one or more Outgoing Payments and derive `due`, `partial`, and `paid` states from the active payment total; payments cannot exceed the remaining due.
- [ ] Without Money Account Tracking, Cash, UPI, and Card payments are accepted and no Money Account Movement is created.
- [ ] With tracking active, Cash, UPI, Card, Bank Transfer, and Other require explicit selection of an active eligible Money Account with sufficient balance; POS Payment Routing Rules are never used.
- [ ] A tracked payment and its negative Money Account Movement are created atomically, contribute to calculated balance and account history, and roll back together on failure; tracking state at payment time controls this behavior with no backfill.
- [ ] Purchase detail exposes immediate and later settlement; Purchase lists expose payment state and due amount; Vendor Outstanding is calculated from recorded Purchases only.
- [ ] External-behavior tests cover tenant isolation, payment and balance validation, Store/account eligibility, tracking transitions, partial/later payment paths, account-history visibility, idempotency, and rollback.
