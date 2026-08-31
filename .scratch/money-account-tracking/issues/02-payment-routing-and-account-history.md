# 02 — Payment Routing and Account History

**What to build:** Add administrator-owned per-Store UPI and Card Payment Routing Rules and append-only Money Account Movement persistence/history. Rules may select Organization-wide accounts or accounts scoped to the same Store, and UPI and Card may select the same account.

**Blocked by:** 01 — Store Activation and Opening Balances

**Status:** ready-for-agent

- [ ] An administrator can view, create, replace, and clear one UPI and one Card route for each Store in its Organization.
- [ ] A route accepts only an active eligible Money Account: Organization-wide or Store-scoped to that exact Store. It rejects cross-Organization, another-Store, inactive, invalid-method, and invalid-ID selections.
- [ ] A route change affects only future Payments; prior Movements retain their original Money Account relationship.
- [ ] The system has append-only Movement records linked uniquely to a POS Payment, with Organization, Store, amount, timestamp, and source metadata sufficient for Admin history.
- [ ] Money Account balance is derived from Opening Balance and Movement totals, and account history returns a stable Opening Balance entry plus payment-linked Movement entries.
- [ ] Admin exposes UPI/Card route configuration and a read-only Money Account history/detail view with balance, source Sale/Payment information, loading, empty, and error states.
- [ ] Contracts, persistence constraints, authorization, tenant isolation, future-only routing, shared-destination behavior, and history totals are tested.

