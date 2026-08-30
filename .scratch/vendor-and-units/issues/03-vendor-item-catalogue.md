# 03 — Vendor Item catalogue

**What to build:** Add the Items tab under Vendors so an Organization administrator can manage the Vendor Items each Vendor offers. The tab groups Items by Vendor, defaults to active Items, and lets administrators find inactive Items through filters. A Vendor Item has exactly one Vendor, a name, an active Unit, a required non-negative two-decimal default purchase price, and active/inactive status; it is retained rather than deleted.

**Blocked by:** 01 — Organization-wide Unit management; 02 — Vendor directory.

**Status:** ready-for-agent

- [ ] The Vendors destination has an Items tab that groups the Organization's Vendor Items by their Vendor, with search, active/inactive filtering, and loading, empty, and failure states.
- [ ] Administrators can add and edit a Vendor Item using exactly one Vendor, an active Unit, a name, a required non-negative two-decimal default purchase price, and status; new Items default to active.
- [ ] The same normalized Item name may be used by different Vendors, while every Item remains associated with exactly one Vendor.
- [ ] Vendor Items cannot be deleted through the Admin UI or API contract; activation status is the supported lifecycle operation.
- [ ] An inactive Vendor leaves its Items' statuses unchanged but makes them unavailable for future selection; an inactive Unit cannot be assigned to a new or edited Item while existing references still display it.
- [ ] Vendor Item data is Organization-scoped and does not create Products, inventory, Purchases, or Store-specific catalogues.
- [ ] API, validation, authorization, Organization isolation, status availability, and visible Admin grouping/filter/dialog behavior are covered by external-behavior tests.
