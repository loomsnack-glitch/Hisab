# 02 — Barcode settings and POS catalog delivery

**What to build:** Organizations can control Barcode Scanning and each Store Device can control Direct Barcode Scan, while the device-scoped POS catalog delivers the active Product Codes needed for local lookup.

**Blocked by:** 01 — Product Code catalog lifecycle

**Status:** ready-for-agent

- [ ] Existing Organizations receive a safe disabled default for Barcode Scanning.
- [ ] Disabling Barcode Scanning hides management and scanning controls without deleting saved Product Codes.
- [ ] Direct Barcode Scan is independently configurable per Store Device with a safe disabled default.
- [ ] A Store Device can change only its own Direct Barcode Scan preference and cannot mutate Organization catalog identity.
- [ ] The device-scoped POS catalog includes active Products, Product Codes, code kinds, selling prices, and discounts.
- [ ] Catalog data is scoped to the authenticated Store Device's Organization and does not resolve across Organizations.
