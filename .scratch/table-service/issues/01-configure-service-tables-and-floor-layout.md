# 01 — Configure Service Tables and floor layout

**What to build:** Administrators can open Admin → Tables for a selected Store, create Service Tables with a required Store-unique Table no label and optional positive whole-number Persons no capacity, and arrange persistent table-shaped boxes to match the Store’s floor.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] An administrator can create a Service Table with a trimmed short label and optional capacity; blank capacity is accepted, while zero, negative, and fractional capacities are rejected.
- [ ] A Table no label is unique case-insensitively within a Store but may be reused by another Store.
- [ ] Service Tables and floor positions are Store-scoped; one Store cannot read or mutate another Store’s configuration.
- [ ] Admin → Tables renders each configured table as a table-like box with the optional person count beneath its center.
- [ ] Dragging a table changes and persists its normalized floor position, which remains usable after reload and at different viewport sizes.
- [ ] Admin Billing remains read-only; this ticket grants only table configuration authority to the Admin workspace.
- [ ] Contract, service/persistence, and user-visible admin behavior are covered by tests.
