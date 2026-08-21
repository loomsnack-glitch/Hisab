# 06 — Store-filtered Billing inspection

**What to build:** Add Store-Filtered Billing Inspection to the Organization Inspection Workspace. A Platform Administrator can inspect all Organization bills by default, narrow to one Store, and open a complete Read-Only Sale Inspection without performing a billing action.

**Blocked by:** 01 — Inspection route shell and organization overview.

**Status:** ready-for-agent

- [ ] Billing supports explicit Store, date, lifecycle, payment-status, payment-method, search, sort, and pagination filters in an Inspection URL, independent of the Platform Reporting Period.
- [ ] Read-Only Sale Inspection presents draft, completed, and voided Sales with line items, discounts, payments, Customer, Store, Store Device attribution, and receipt data.
- [ ] Platform and Console tests prove Organization/Store scoping, pagination/filter validation, Owner User authorization, and the absence of sale mutation, payment collection, void, print, download-for-operation, and messaging actions.

