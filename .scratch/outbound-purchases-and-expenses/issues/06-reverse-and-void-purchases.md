# 06 — Reverse and void Purchases

**What to build:** Let an Organization administrator correct a recorded Purchase without destroying financial history. Individual Outgoing Payments can be reversed with a reason, and a Purchase can be voided with a reason, cancelling its due and compensating every active payment and tracked Money Account debit exactly once.

**Blocked by:** 04 — Settle Purchases with Outgoing Payments.

**Status:** claimed

- [x] A mistaken Purchase Outgoing Payment can be reversed only with a reason; the original stays immutable, the Purchase totals and Payable Status are recalculated, and a tracked payment receives one positive compensating Movement in its original Money Account.
- [x] A recorded Purchase can be voided only with a reason; its remaining due is cancelled, every still-active payment is reversed exactly once, and no original Purchase, payment, or Movement is edited or deleted.
- [x] Draft Purchases remain freely discardable, while voided Purchases cannot receive further payments; an administrator can create a corrected replacement Purchase afterward.
- [x] Purchase and Money Account history clearly distinguish original outbound payments from individual reversals and Purchase-void reversals.
- [x] External-behavior tests cover required reasons, retries/idempotency, transaction rollback, mixed tracked and untracked payments, balance restoration, recalculated state, and authorization/isolation.

## Comments

Implemented Purchase payment reversal and Payable Void on 2026-08-31: required-reason reverse and void, compensating positive Money Account Movements (`outgoing_purchase_payment_reversal` vs `outgoing_purchase_void_reversal`) without editing or deleting originals, idempotent retries, draft discard unchanged, voided Purchases blocked from further payments, and Admin replacement as a new draft. Apply migrations `20260831100400_add_outgoing_purchase_reversals.sql` then `20260831100500_constrain_outgoing_purchase_reversal_movements.sql` after the ticket 04/05 outgoing-payment migrations. Expense reverse/void remains ticket 07.
