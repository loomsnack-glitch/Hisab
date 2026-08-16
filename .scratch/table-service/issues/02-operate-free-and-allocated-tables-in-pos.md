# 02 — Operate Free and Allocated tables in POS

**What to build:** Device-authenticated POS operators can open POS → Tables to see their Store’s configured floor and manually move physical tables between Free and Allocated before any order exists.

**Blocked by:** 01 — Configure Service Tables and floor layout.

**Status:** ready-for-agent

- [ ] POS → Tables is reachable through the POS navigation and displays only the authenticated Store Device’s Service Tables in their configured layout.
- [ ] Free and Allocated table states are visually distinct and present only the actions valid for that state.
- [ ] Allocating a Free table reserves it without creating a Draft Sale, Payment, Customer Ledger entry, or bill total.
- [ ] Freeing an Allocated table immediately returns it to Free without creating or retaining a financial record.
- [ ] State changes are validated server-side and cannot be performed across Store boundaries.
- [ ] The table view refreshes its live state after a successful operation and has behavior-focused tests for navigation, visibility, and allocation transitions.
