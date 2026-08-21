# 05 — Organization and Store adoption drill-down

**What to build:** Let an Owner User open one Organization from the outreach list and inspect its aggregate adoption health plus a Store-by-Store read-only breakdown. This makes it possible to distinguish an entirely inactive business from a partially adopted multi-Store business before outreach.

**Blocked by:** 04 — Organization adoption outreach list.

**Status:** ready-for-agent

- [ ] An Owner User can navigate from an Organization result to a read-only detail view while retaining the selected Platform Reporting Period.
- [ ] The detail view presents Organization identity, creator contact details, Store count, Active Store count, Customer Count, selected-period completed-Sale count, selected-period Completed Sales Value, and the latest completed Sale.
- [ ] Every Store is listed with identity, active/inactive status, Customer Count, selected-period completed-Sale count, selected-period Completed Sales Value, and its last completed Sale.
- [ ] Store and Organization activity use the same fixed seven-day Asia/Kolkata rules as the dashboard and outreach list, independent of the selected reporting period.
- [ ] Missing, unauthorized, and expired-session states do not expose cross-organization data and return the operator to a safe console state.
- [ ] The detail view contains no controls that alter tenant data and no customer, bill, Payment, or device-secret detail.
- [ ] Tests cover aggregate consistency with the list/dashboard, mixed active/inactive Store behavior, retained reporting periods, authorization, and user-visible detail states.
