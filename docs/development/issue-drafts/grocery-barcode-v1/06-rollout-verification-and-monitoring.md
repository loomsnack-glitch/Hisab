# 06 — Rollout verification and monitoring

**What to build:** The store can enable barcode workflows safely on selected Store Devices after catalog and hardware checks, and operators can observe failures and recover without changing billing semantics.

**Blocked by:** 03 — Scan-to-cart billing; 05 — Internal label printing

**Status:** ready-for-agent

- [ ] Barcode Scanning and Direct Barcode Scan remain disabled until individual Product setup and hardware verification are complete.
- [ ] Direct Barcode Scan can be enabled per production Store Device without changing other counters.
- [ ] The rollout records or exposes unknown scans, duplicate-assignment attempts, and scan-to-cart failures for follow-up.
- [ ] Cashier guidance covers pause/resume, manual search, and unknown-code recovery.
- [ ] Production-equivalent HID scanner, label printer, label stock, and POS Device acceptance is documented.
- [ ] Existing whole-count quantities, configured Products, discounts, drafts, commits, payments, receipts, bundles, Combos, Add-Ons, and reporting remain regression-safe.
