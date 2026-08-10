# 03 — Scan-to-cart billing

**What to build:** A cashier can scan or type a Product Code in the POS and use the existing billing behavior to add Products quickly without weakening selection-only billing or catalog permissions.

**Blocked by:** 01 — Product Code catalog lifecycle; 02 — Barcode settings and POS catalog delivery

**Status:** ready-for-agent

- [ ] A visible scan field is available when Barcode Scanning is enabled.
- [ ] Direct capture supports USB/Bluetooth HID scanners with an Enter suffix and removes only that transport terminator.
- [ ] Pause/resume and focus ownership prevent scanner capture from stealing normal typing in unrelated fields or dialogs.
- [ ] A successful simple scan adds one whole-number unit through the existing add-to-bill behavior.
- [ ] Repeated intentional scans increment the existing whole-number quantity without debouncing separate HID scans.
- [ ] A configurable Product opens its existing configuration flow rather than silently choosing options.
- [ ] Unknown and inactive scans leave the bill unchanged and show a useful error with the received value where applicable.
- [ ] Unknown scans support manual search, copying the value, and sending it to an administrator linking workflow.
- [ ] An unknown scan never creates a Product or grants a Store Device catalog-admin permission.
- [ ] Manual Product search and category browsing continue to work for Products without Product Codes.
