# 04 — Allow customer-optional Due Sales and later collection

**What to build:** POS can place and later collect customer-optional Due or partial Sales without inventing an unpaid payment method, while keeping Customer Ledger effects correct when a Customer is present.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The existing Due settlement option continues to mean no Payment record; no `unpaid` tender or payment-method value is added.
- [ ] A committed pending or partial Sale is valid with a Customer, a Service Table, both, or neither.
- [ ] The normal POS can place a customerless Due or partial Sale, and table service can supply a table association in later tickets.
- [ ] Later Payment collection succeeds for a customerless due Sale when a valid positive amount and real tender are supplied, and still rejects overpayment or payment on a fully paid/non-committed Sale.
- [ ] Customer balance and Customer Ledger entries are written only for Customer-linked Sales and Payments; unassigned Sales and Payments create no synthetic ledger owner.
- [ ] Database invariants, request contracts, billing-service behavior, and existing paid/partial/Due paths have regression coverage.
