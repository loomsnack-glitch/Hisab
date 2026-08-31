# 03 — Draft and record Expenses

**What to build:** Let an Organization administrator create, edit, discard, and record Store-scoped Expenses under one active Expense Category. The workflow creates due-only recorded Expenses and provides usable list and detail views without yet settling them.

**Blocked by:** 01 — Expense Category management.

**Status:** claimed

- [x] Administrators can create, edit, and discard a Draft Expense without creating a payable balance, Outgoing Payment, or Money Account Movement.
- [x] A Draft Expense requires one Store, exactly one active Expense Category, an effective date, and a payable total; it may include an invoice/reference and notes.
- [x] Recording a valid Expense creates a due-only recorded Expense with paid total of zero and Payable Status `due`; an inactive category remains visible on historical records but cannot be newly selected.
- [x] Expense lists and details show Store, Category, lifecycle, totals, due amount, and supplied reference/notes with responsive loading, empty, error, and validation states.
- [x] Typed contracts, tenant authorization, Organization isolation, category availability, date/amount validation, historical snapshots, and Admin behavior are covered by external-behavior tests.

## Comments

Implemented Store-scoped Draft and recorded Expenses on 2026-08-31: create/edit/discard drafts, record as due-only with Expense Category snapshots, and Ganatri Admin list/detail workflows. Apply migration `20260831090000_create_expenses.sql` before using the feature (it reuses `payable_status_enum` from `20260831080000_create_purchases.sql`). Outgoing Payments and Money Account Movements are not part of this ticket.
