# 02 — Manage Store-Scoped Money Accounts

**What to build:** Organization administrators can configure eligible non-cash Money Accounts for exactly one Store rather than every Store. A Bank, UPI, Card Settlement, Petty Cash, or Other account clearly shows whether it is Store-scoped or Organization-wide, and Store-scoped accounts are selectable only after the administrator chooses a Store in the same Organization.

**Blocked by:** 01 — Manage Organization-Wide Money Accounts

**Status:** ready-for-agent

- [x] An Organization administrator can create and edit a non-cash Money Account as Store-scoped by selecting exactly one Store in their Organization.
- [x] A Store-scoped account is clearly distinguishable from an Organization-Wide account in the list and edit experience, including its selected Store.
- [x] The administrator can change an eligible non-cash account between Store scope and Organization-wide scope; changing to Organization-wide removes its Store assignment, while changing to Store scope requires a valid Store.
- [x] Search and filtering let the administrator find accounts by scope and Store as well as the existing type and status controls.
- [x] The system rejects missing Store selection for Store scope, a Store outside the Organization, and any invalid scope/Store combination, while continuing to isolate every Organization's accounts and Stores.
- [x] The complete typed-contract, persistence, authorized-route, Admin UI, and external-behaviour test coverage stays green for both scope variants.

