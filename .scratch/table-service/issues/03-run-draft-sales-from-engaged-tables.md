# 03 — Run Draft Sales from Engaged tables

**What to build:** Staff can start, resume, update, and cancel the one Active Table Sale for an Allocated or Engaged Service Table using the existing POS bill composer.

**Blocked by:** 02 — Operate Free and Allocated tables in POS.

**Status:** ready-for-agent

- [ ] Start order on an Allocated table atomically creates a Draft Sale linked to that table and changes the table to Engaged.
- [ ] Opening an Engaged table resumes its current Draft Sale in the existing POS composer, preserving existing catalog selection, trusted pricing, and draft save behavior.
- [ ] Each Service Table has at most one Active Table Sale; competing attempts cannot create duplicate current drafts.
- [ ] Saving edits leaves the table associated with the same Draft Sale and reflects its current draft total in the live table view.
- [ ] Cancel order deletes only the current uncommitted Draft Sale and atomically returns the table to Free; committed Sales cannot be deleted through this action.
- [ ] Draft creation, update, cancel, and resume remain role-neutral for all Active Store Devices in the same Store and remain Store-isolated.
- [ ] Service and POS behavior tests cover the Draft Sale/table transitions, concurrency guard, composer handoff, and cancellation outcome.
