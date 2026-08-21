# 02 — Responsive Organization Directory

**What to build:** Replace the current outreach-oriented Organizations list with a responsive Organization Directory that helps a Platform Administrator find and open an Organization Inspection Workspace. It provides organization and creator search, activity filtering, sorting, pagination, a compact desktop table, and mobile cards.

**Blocked by:** 01 — Inspection route shell and organization overview.

**Status:** claimed

- [x] The directory presents Organization identity, creator, adoption health, selected-period completed-sales value, and latest completed Sale in an accessible desktop and mobile design.
- [x] Search includes Organization identity and creator; activity filtering, sorting, pagination, and a recency-first default order are validated through the platform read contract.
- [x] Selecting a row opens the appropriate Inspection URL, and behavior tests cover filters, sort, responsive presentation, empty/loading/error states, and authorization.

## Comments

Ticket 02 implemented after verifying ticket 01 in this checkout. The platform list contract now searches Organization identity and creator, defaults to recency-first order with a name/id fallback, and accepts explicit directory sort. Ganatri Console presents a desktop table plus mobile cards, keeps the existing sidebar, and opens the ticket 01 Inspection URL from a row or name without mutation or credential controls.

