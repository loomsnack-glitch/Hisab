# 06 — Enforce Store-local customer credit collection

**What to build:** Customer credit sales, payments, void reversals, and adjustments affect only the Store Customer Account for the Sale's Store. A Store cannot collect or settle another Store's receivable.

**Blocked by:** 05 — Introduce Store Customer Accounts.

**Status:** ready-for-agent

- [ ] A receivable Sale affects only the Customer's Store Customer Account for that Sale's Store.
- [ ] A payment, void reversal, or adjustment changes only the corresponding Store Customer Account and Store Customer Ledger.
- [ ] The backend rejects any attempt to collect or settle a receivable from another Store.
- [ ] Customer balance displays in Store billing and customer views show only the selected Store's balance.
- [ ] Existing same-Store billing lifecycle behavior remains correct after Store Customer Account enforcement.
