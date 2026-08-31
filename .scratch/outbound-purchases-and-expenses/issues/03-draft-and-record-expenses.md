# 03 — Draft and record Expenses

**What to build:** Let an Organization administrator create, edit, discard, and record Store-scoped Expenses under one active Expense Category. The workflow creates due-only recorded Expenses and provides usable list and detail views without yet settling them.

**Blocked by:** 01 — Expense Category management.

**Status:** ready-for-agent

- [ ] Administrators can create, edit, and discard a Draft Expense without creating a payable balance, Outgoing Payment, or Money Account Movement.
- [ ] A Draft Expense requires one Store, exactly one active Expense Category, an effective date, and a payable total; it may include an invoice/reference and notes.
- [ ] Recording a valid Expense creates a due-only recorded Expense with paid total of zero and Payable Status `due`; an inactive category remains visible on historical records but cannot be newly selected.
- [ ] Expense lists and details show Store, Category, lifecycle, totals, due amount, and supplied reference/notes with responsive loading, empty, error, and validation states.
- [ ] Typed contracts, tenant authorization, Organization isolation, category availability, date/amount validation, historical snapshots, and Admin behavior are covered by external-behavior tests.
