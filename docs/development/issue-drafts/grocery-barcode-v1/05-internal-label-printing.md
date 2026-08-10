# 05 — Internal label printing

**What to build:** Administrators can preview and print generated Internal Product Codes as reliable A4 or thermal labels for the store's actual scanner and label workflow.

**Blocked by:** 04 — Internal Product Code generation and reuse

**Status:** ready-for-agent

- [ ] The exact 13-digit Internal Product Code is rendered as an EAN-13 barcode.
- [ ] Human-readable digits appear below the bars.
- [ ] Required quiet zones are preserved with black bars on a white background by default.
- [ ] Product name and selling price can be shown outside the quiet zones without changing the encoded Product Code.
- [ ] A4 sheet labels support starting position and copy count.
- [ ] A dedicated thermal-label layout is available.
- [ ] Label printing remains separate from receipt printing.
- [ ] A preview and test-print workflow exists, and bulk printing is gated until a test label scans successfully on production-like hardware and stock.
- [ ] Printing selling price warns that a later price change requires label reprinting.
