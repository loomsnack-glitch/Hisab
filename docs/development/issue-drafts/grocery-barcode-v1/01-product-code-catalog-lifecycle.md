# 01 — Product Code catalog lifecycle

**What to build:** Administrators can manage the single optional Product Code on a Product while preserving exact manufacturer values, Organization boundaries, Product lifecycle safety, and existing billing data.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] An administrator can create, replace, clear, and view zero or one Product Code per Product.
- [ ] Manufacturer Product Codes preserve every received character except scanner transport terminators; no barcode-shape, check-digit, GS1-ownership, or metadata validation is applied.
- [ ] A Product Code kind is retained for manufacturer versus internal values, and Product Code changes are administrator-only.
- [ ] A code is unique within an Organization, including concurrent writes, while the same value may exist in another Organization.
- [ ] Inactive Products retain their code reservation; successful deletion releases the code; blocked deletion releases nothing.
- [ ] Replacement and clearing warn that the old value stops resolving and release it only after the change succeeds.
- [ ] Existing Product IDs, prices, discounts, sale history, and configured-Product behavior remain unchanged.
