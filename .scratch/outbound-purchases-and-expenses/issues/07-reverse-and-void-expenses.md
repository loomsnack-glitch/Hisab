# 07 — Reverse and void Expenses

**What to build:** Apply the same immutable correction model to Expenses: administrators can reverse one Expense payment or void a recorded Expense with a reason, preserving a complete payable and Money Account audit trail.

**Blocked by:** 05 — Settle Expenses with Outgoing Payments; 06 — Reverse and void Purchases.

**Status:** ready-for-agent

- [ ] A mistaken Expense Outgoing Payment can be reversed only with a reason; the original remains immutable, the Expense totals and Payable Status recalculate, and any tracked debit receives one positive compensating Movement in its original Money Account.
- [ ] A recorded Expense can be voided only with a reason; its remaining due is cancelled and every still-active payment is reversed exactly once without editing or deleting financial history.
- [ ] Draft Expenses remain freely discardable, voided Expenses cannot receive further payments, and corrected replacement Expenses can be recorded under the appropriate active category.
- [ ] Expense and Money Account history clearly distinguish original outbound payments from individual reversals and Expense-void reversals.
- [ ] External-behavior tests cover reasons, retries/idempotency, transaction rollback, mixed tracked and untracked payments, balance restoration, recalculated state, category history, and authorization/isolation.
