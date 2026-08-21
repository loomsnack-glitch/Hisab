# 05 — Customer inspection

**What to build:** Add an Organization-wide read-only Customer section that lets a Platform Administrator browse Customers and inspect their relevant billing and ledger context without using tenant administration controls.

**Blocked by:** 01 — Inspection route shell and organization overview.

**Status:** ready-for-agent

- [ ] An active Owner User can use an Inspection URL to search, filter, and page through an Organization's Customers and open a Customer detail view.
- [ ] Customer detail presents relevant Customer, Sale, payment, and Customer Ledger context with correct Organization scope and clear state handling.
- [ ] Platform authorization and behavior tests prove tenant/device credentials cannot access the data and Console offers no customer mutation, balance adjustment, or collection action.

