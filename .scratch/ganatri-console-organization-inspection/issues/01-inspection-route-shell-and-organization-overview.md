# 01 — Inspection route shell and organization overview

**What to build:** Give a Platform Administrator a first-class, authorization-protected Inspection URL for a selected Organization and render its read-only overview without replacing the existing Console sidebar. The overview must make identity, creator, activity state, adoption KPIs, Store performance, and recent Sales easy to inspect and link onward to the relevant workspace section.

**Blocked by:** None — can start immediately.

**Status:** claimed

- [x] An active Owner User can directly open, refresh, and use browser history within an Organization Inspection Workspace; invalid, missing, and non-owner access is handled safely.
- [x] The overview shows labeled Platform Reporting Period adoption metrics, Store performance, recent Sales with Store attribution, and clear loading, empty, unavailable, and not-found states.
- [x] The platform read model exposes only read-only overview data and behavior tests prove that no tenant mutation controls are present.

## Comments

Ticket 01 implemented and verified against the platform HTTP/read-model and Console behavior-test seams. Inspection URLs live under `/organizations/:organizationId` (plus section/resource segments). Later section routes currently render a read-only workspace shell so tickets 03–09 can fill in Stores, Catalog, Billing, Customers, Reports, Tables, Purchases, and WhatsApp without replacing this route contract.

