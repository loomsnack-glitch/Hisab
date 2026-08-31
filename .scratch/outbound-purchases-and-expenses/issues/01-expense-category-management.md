# 01 — Expense Category management

**What to build:** Let an Organization administrator manage the Expense Categories available to every Store. Provide Hisab's predefined categories, Organization-defined categories, active/inactive lifecycle, and a responsive Ganatri Admin configuration workflow so future Expenses can be classified consistently.

**Blocked by:** None — can start immediately.

**Status:** claimed

- [x] Every Organization receives the agreed predefined read-only Expense Categories: Rent, Electricity, Water, Internet & Phone, Salaries & Wages, Maintenance & Repairs, Transport, Supplies, Marketing, Taxes & Fees, and Other.
- [x] Administrators can create and edit Organization-defined categories, and can activate or inactivate both predefined availability and custom categories without deleting historical meaning.
- [x] Predefined definitions cannot be renamed or deleted; category names are normalized and unambiguous within the Organization, including inactive categories.
- [x] The typed API, tenant authorization, Organization isolation, and responsive Admin configuration UI expose loading, empty, error, create, edit, and availability states.
- [x] External-behavior tests cover category seeding, validation, read-only predefined behavior, lifecycle, authorization, isolation, and visible Admin interactions.

## Comments

Implemented Organization-wide Expense Category management on 2026-08-31: seeded predefined categories, custom create/edit, active/inactive lifecycle with no delete command, tenant-isolated API, and a Ganatri Admin configuration page. Apply migration `20260831070000_create_expense_categories.sql` before using the feature.
