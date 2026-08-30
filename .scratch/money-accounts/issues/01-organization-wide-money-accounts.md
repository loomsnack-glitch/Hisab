# 01 — Manage Organization-Wide Money Accounts

**What to build:** Organization administrators can manage Organization-Wide Money Accounts in Ganatri Admin. They can create, view, edit, search, filter, deactivate, and reactivate Bank, UPI, Card Settlement, Petty Cash, and Other accounts that are available to every Store in their Organization. This establishes the first usable Money Account configuration path without changing POS or billing behaviour.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] An authenticated Organization administrator can open a Money Accounts Admin destination and see only Organization-Wide Money Accounts belonging to their Organization.
- [ ] The administrator can create and edit a clearly named Bank, UPI, Card Settlement, Petty Cash, or Other Money Account with optional non-sensitive notes and active/inactive status.
- [ ] The interface supports visible loading, empty, validation, error, search, type-filter, and status-filter behaviour, and provides no permanent delete action.
- [ ] An account can be deactivated and reactivated while remaining available in the appropriate filtered list.
- [ ] The system rejects invalid account types, blank or invalid descriptive data, Store assignment for an Organization-Wide account, and sensitive financial identifiers or credentials.
- [ ] Typed contracts, Organization-admin authorization, tenant isolation, persistence, Admin behaviour, and externally observable validation are covered by tests following the existing configuration-module conventions.

