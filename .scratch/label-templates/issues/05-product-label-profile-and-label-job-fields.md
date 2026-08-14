# 05 — Product Label Profile and Label Job fields

**What to build:** Administrators store optional packaging facts on a Product Label Profile and, at print time, fill only the Label Job values the chosen Label Template binds — packed date, expiry, and batch number — so a packaging label can show nutrition, On-pack MRP, ingredients, and dates without changing Billing.

**Blocked by:** 04 — Label Element composer for catalog bindings

**Status:** ready-for-agent

- [ ] An administrator can save optional Product Label Profile fields: ingredients, nutrition rows (`name`, `quantity`, `unit`), net weight, unit selling price text, On-pack MRP, and shelf life in days.
- [ ] Product Label Profile changes do not alter Product selling price, discount, Product Code, Sale Item snapshots, receipts, or Trusted Catalog Snapshot Pricing.
- [ ] The composer palette can place bound text for those profile fields plus a nutrition table Label Element; missing optional bindings omit the Element.
- [ ] The print dialog asks only for Label Job fields the Template actually binds (packed date, expiry, batch number) and still asks for copy count and sheet starting position when relevant.
- [ ] Expiry may default from packed date plus shelf life days and remain overridable; packed/expiry/batch are not written back onto the Product by printing.
- [ ] On-pack MRP on a Template shows the same reprint warning pattern as selling price; Hisab does not claim the pack is FSSAI-complete.
- [ ] Catalog tests cover optional profile round-trip and snapshot isolation; renderer tests cover omitted bindings, nutrition table output, and job-field preview for a real Product.
