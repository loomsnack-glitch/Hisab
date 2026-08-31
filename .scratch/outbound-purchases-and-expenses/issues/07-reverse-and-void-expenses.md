# 07 — Reverse and void Expenses

**What to build:** Apply the same immutable correction model to Expenses: administrators can reverse one Expense payment or void a recorded Expense with a reason, preserving a complete payable and Money Account audit trail.

**Blocked by:** 05 — Settle Expenses with Outgoing Payments; 06 — Reverse and void Purchases.

**Status:** resolved

- [x] A mistaken Expense Outgoing Payment can be reversed only with a reason; the original remains immutable, the Expense totals and Payable Status recalculate, and any tracked debit receives one positive compensating Movement in its original Money Account.
- [x] A recorded Expense can be voided only with a reason; its remaining due is cancelled and every still-active payment is reversed exactly once without editing or deleting financial history.
- [x] Draft Expenses remain freely discardable, voided Expenses cannot receive further payments, and corrected replacement Expenses can be recorded under the appropriate active category.
- [x] Expense and Money Account history clearly distinguish original outbound payments from individual reversals and Expense-void reversals.
- [x] External-behavior tests cover reasons, retries/idempotency, transaction rollback, mixed tracked and untracked payments, balance restoration, recalculated state, category history, and authorization/isolation.

## Comments

Implemented Expense payment reversal and Payable Void on 2026-08-31, reusing the Purchase reverse/void rules from ticket 06: required-reason reverse and void, compensating positive Money Account Movements (`outgoing_expense_payment_reversal` vs `outgoing_expense_void_reversal`) without editing or deleting originals, idempotent retries, draft discard unchanged, voided Expenses blocked from further payments, and Admin replacement as a new draft (`copyFrom`). Apply migrations `20260831100600_add_outgoing_expense_reversals.sql` then `20260831100700_constrain_outgoing_expense_reversal_movements.sql` after the ticket 04/05/06 outgoing-payment and purchase-reversal migrations.
