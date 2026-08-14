# 01 — Template-shaped renderer for existing A4 and thermal labels

**What to build:** Internal label printing consumes a Label Template document instead of an `"a4" | "thermal"` layout enum, while A4 sheet and 58×40 mm thermal output, quiet zones, copy count, starting position, optional Product name and selling price, and the test-scan gate stay identical for administrators.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The renderer accepts a Label Template, Product, and Label Job and returns preview plus printable document; receipt printing is unused.
- [ ] In-code A4 (3×8, 70×35 mm cells) and thermal (58×40 mm, 1 per row) Label Templates preserve exact Internal Product Code EAN-13 modules, quiet zones, human-readable digits, optional name/price placement, black bars on white, copy count, A4 starting position, and the selling-price reprint warning.
- [ ] Product text never appears in the encoded barcode payload.
- [ ] The products-list print dialog still works for Internal Product Code labels; bulk print remains gated on test print and scan confirmation.
- [ ] Tests assert rendered document behaviour at the existing label-printing seam, not private helper structure.
