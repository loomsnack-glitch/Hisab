# 04 — Sell a bundle with trusted snapshots

**What to build:** deliver the first end-to-end POS and Billing flow for selling a `Bundle Product`, where the client sends only bundle identity and quantity, Billing writes one priced bundle `sale_item`, stores dedicated child bundle-component snapshot records, and bill detail shows nested component structure under the priced bundle line.

**Blocked by:** 02 — Add-on-backed bundle composition.

**Status:** ready-for-agent

- [ ] POS can add a bundle by sending only bundle Product id and quantity, with Billing loading the trusted bundle definition from the catalog.
- [ ] Billing persists one priced bundle `sale_item` and dedicated child bundle-component billing records rather than reusing priced `sale_items` for bundle internals.
- [ ] The charged amount of the bundle comes only from the bundle Product's own `price` and `discount`, while nested component snapshots are returned for detail and receipt rendering.
- [ ] Billing service and API tests cover trusted snapshot creation, total calculation, and nested bundle detail output.
