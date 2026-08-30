# 02 — Vendor directory

**What to build:** Give an Organization administrator a Vendors sidebar destination that opens on a searchable, filterable Vendor table. Administrators can add and edit a Vendor's name, optional description, and active/inactive status, and can deactivate or reactivate Vendors without ever deleting them.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The Vendors sidebar destination opens its default Vendors tab for the selected Organization.
- [ ] The Vendor table provides search, active/inactive filtering, clear status presentation, and appropriate loading, empty, and failure states.
- [ ] Administrators can add and edit an Organization-owned Vendor with a required name, optional description, and status; new Vendors default to active.
- [ ] Vendors cannot be deleted through the Admin UI or API contract; activation status is the supported lifecycle operation.
- [ ] Vendor data is isolated to the selected Organization and protected by the existing Organization-administrator boundary.
- [ ] API, validation, authorization, Organization isolation, and visible Admin table/dialog behavior are covered by external-behavior tests.
