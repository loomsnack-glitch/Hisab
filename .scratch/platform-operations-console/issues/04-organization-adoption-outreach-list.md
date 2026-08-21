# 04 — Organization adoption outreach list

**What to build:** Add an outreach-oriented Organization list to Ganatri Console. Owners can search and paginate across every Organization, filter it by the stable Active Organization signal, and see enough adoption data and creator contact information to decide whom to approach.

**Blocked by:** 03 — Platform dashboard metrics.

**Status:** ready-for-agent

- [ ] An active Owner User can search Organizations by name or username and receive stable, paginated results across the platform.
- [ ] Operators can filter Organizations by Active Organization or inactive status without changing the canonical seven-day activity definition.
- [ ] Each Organization result includes its identity, creator contact details, Store count, Active Store count, Customer Count, selected-period completed-Sale count, selected-period Completed Sales Value, and last completed-Sale timestamp.
- [ ] A newly registered Organization with no Store, and a formerly active Organization with no completed Sale in the preceding seven days, appear correctly in the inactive outreach list.
- [ ] The list retains the operator's selected Platform Reporting Period for displayed reporting metrics and makes zero-result search/filter states clear.
- [ ] The console exposes no customer-level records, bill details, Payments, device secrets, or tenant mutation actions.
- [ ] Tests cover reporting aggregation per Organization, active/inactive filtering, search, pagination, selected-period behavior, authorization, and the visible list states.
