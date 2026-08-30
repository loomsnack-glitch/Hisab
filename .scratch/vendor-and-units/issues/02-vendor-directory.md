# 02 — Vendor directory

**What to build:** Give an Organization administrator a Vendors sidebar destination that opens on a searchable, filterable Vendor table. Administrators can add and edit a Vendor's name, optional description, and active/inactive status, and can deactivate or reactivate Vendors without ever deleting them.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] The Vendors sidebar destination opens its default Vendors tab for the selected Organization.
- [x] The Vendor table provides search, active/inactive filtering, clear status presentation, and appropriate loading, empty, and failure states.
- [x] Administrators can add and edit an Organization-owned Vendor with a required name, optional description, and status; new Vendors default to active.
- [x] Vendors cannot be deleted through the Admin UI or API contract; activation status is the supported lifecycle operation.
- [x] Vendor data is isolated to the selected Organization and protected by the existing Organization-administrator boundary.
- [x] API, validation, authorization, Organization isolation, and visible Admin table/dialog behavior are covered by external-behavior tests.

## Comments

Implemented the Organization-scoped Vendor directory vertical slice. The Items tab is present as destination chrome with a placeholder only; Vendor Item catalogue remains Ticket 03.
