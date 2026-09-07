# 05 — Introduce Store Customer Accounts

**What to build:** Customers remain one searchable Organization identity, but every Store receives an independent Store Customer Account and Customer Ledger. Existing balances are migrated safely, with explicit owner allocation wherever historical Store attribution cannot be proven.

**Blocked by:** 01 — Store workspace foundation.

**Status:** ready-for-agent

- [ ] A Store can search and select an existing Customer from the Organization without creating a duplicate Customer.
- [ ] First use of a Customer at a Store creates or resolves that Store's independent account with a zero opening balance.
- [ ] Customer account and ledger data are uniquely scoped to the Customer and Store within one Organization.
- [ ] Historical ledger entries with trustworthy Sale or Payment Store attribution are migrated to the matching Store Customer Account.
- [ ] An Organization administrator can explicitly allocate any unresolved legacy Organization-wide balance before Store-segregated credit is enabled, and the system never silently invents an allocation.
- [ ] Organization customer views distinguish individual Store balances from a visibility-only aggregate.
