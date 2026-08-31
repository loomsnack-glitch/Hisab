# 06 — Reverse and void Purchases

**What to build:** Let an Organization administrator correct a recorded Purchase without destroying financial history. Individual Outgoing Payments can be reversed with a reason, and a Purchase can be voided with a reason, cancelling its due and compensating every active payment and tracked Money Account debit exactly once.

**Blocked by:** 04 — Settle Purchases with Outgoing Payments.

**Status:** ready-for-agent

- [ ] A mistaken Purchase Outgoing Payment can be reversed only with a reason; the original stays immutable, the Purchase totals and Payable Status are recalculated, and a tracked payment receives one positive compensating Movement in its original Money Account.
- [ ] A recorded Purchase can be voided only with a reason; its remaining due is cancelled, every still-active payment is reversed exactly once, and no original Purchase, payment, or Movement is edited or deleted.
- [ ] Draft Purchases remain freely discardable, while voided Purchases cannot receive further payments; an administrator can create a corrected replacement Purchase afterward.
- [ ] Purchase and Money Account history clearly distinguish original outbound payments from individual reversals and Purchase-void reversals.
- [ ] External-behavior tests cover required reasons, retries/idempotency, transaction rollback, mixed tracked and untracked payments, balance restoration, recalculated state, and authorization/isolation.
