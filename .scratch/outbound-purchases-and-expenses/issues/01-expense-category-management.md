# 01 — Expense Category management

**What to build:** Let an Organization administrator manage the Expense Categories available to every Store. Provide Hisab's predefined categories, Organization-defined categories, active/inactive lifecycle, and a responsive Ganatri Admin configuration workflow so future Expenses can be classified consistently.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every Organization receives the agreed predefined read-only Expense Categories: Rent, Electricity, Water, Internet & Phone, Salaries & Wages, Maintenance & Repairs, Transport, Supplies, Marketing, Taxes & Fees, and Other.
- [ ] Administrators can create and edit Organization-defined categories, and can activate or inactivate both predefined availability and custom categories without deleting historical meaning.
- [ ] Predefined definitions cannot be renamed or deleted; category names are normalized and unambiguous within the Organization, including inactive categories.
- [ ] The typed API, tenant authorization, Organization isolation, and responsive Admin configuration UI expose loading, empty, error, create, edit, and availability states.
- [ ] External-behavior tests cover category seeding, validation, read-only predefined behavior, lifecycle, authorization, isolation, and visible Admin interactions.
