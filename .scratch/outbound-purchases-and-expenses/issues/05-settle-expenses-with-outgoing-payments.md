# 05 — Settle Expenses with Outgoing Payments

**What to build:** Extend the shared Outgoing Payment workflow to recorded Expenses so an administrator can settle category-based spending fully, partially, or later using the same untracked and tracked Money Account behavior as Purchases.

**Blocked by:** 03 — Draft and record Expenses; 04 — Settle Purchases with Outgoing Payments.

**Status:** claimed

- [x] Recorded Expenses accept one or more Outgoing Payments and derive `due`, `partial`, and `paid` states without allowing overpayment.
- [x] The Expense settlement UI supports Cash, UPI, and Card without tracking, and explicit eligible Money Account selection—including Bank Transfer and Other—when tracking is active.
- [x] Each tracked Expense payment atomically writes one negative Money Account Movement and appears in the existing account-history presentation with a source-specific Expense link/label.
- [x] Expense lists and details expose paid and due totals and support immediate or later settlement without changing historical recorded Expense values.
- [x] External-behavior tests prove that Expense settlement reuses the established Outgoing Payment, account-eligibility, balance, tracking-transition, transaction, and tenant-isolation guarantees.

## Comments

Implemented Expense settlement on the shared Outgoing Payment model on 2026-08-31: recorded Expenses accept later Cash/UPI/Card (untracked) and explicit eligible-account payments when tracking is active, derive due/partial/paid without overpayment, and write one negative `outgoing_expense_payment` Movement atomically. Apply migrations `20260831100200_allow_outgoing_expense_payments.sql` then `20260831100300_constrain_outgoing_expense_movements.sql` after the ticket 04 outgoing-payment migrations. Payment reversal and Payable Void remain later tickets.
