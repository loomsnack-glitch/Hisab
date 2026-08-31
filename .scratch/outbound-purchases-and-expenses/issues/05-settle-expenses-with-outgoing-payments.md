# 05 — Settle Expenses with Outgoing Payments

**What to build:** Extend the shared Outgoing Payment workflow to recorded Expenses so an administrator can settle category-based spending fully, partially, or later using the same untracked and tracked Money Account behavior as Purchases.

**Blocked by:** 03 — Draft and record Expenses; 04 — Settle Purchases with Outgoing Payments.

**Status:** ready-for-agent

- [ ] Recorded Expenses accept one or more Outgoing Payments and derive `due`, `partial`, and `paid` states without allowing overpayment.
- [ ] The Expense settlement UI supports Cash, UPI, and Card without tracking, and explicit eligible Money Account selection—including Bank Transfer and Other—when tracking is active.
- [ ] Each tracked Expense payment atomically writes one negative Money Account Movement and appears in the existing account-history presentation with a source-specific Expense link/label.
- [ ] Expense lists and details expose paid and due totals and support immediate or later settlement without changing historical recorded Expense values.
- [ ] External-behavior tests prove that Expense settlement reuses the established Outgoing Payment, account-eligibility, balance, tracking-transition, transaction, and tenant-isolation guarantees.
