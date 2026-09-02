# 03 — Measured-Product Workflow Compatibility

**What to build:** Make measured portions a reliable part of advanced and historical sales workflows. A custom Product portion retains its identity, price, and display consistently when the Sale is configured, saved as a Draft, restored, sent to operational output, finalized, or viewed later, without changing existing fixed Bundle or Combo behavior.

**Blocked by:** 01 — Default Product Selling Units; 02 — Custom Selling Quantities in POS

**Status:** ready-for-agent

- [ ] Configured single Product Sale Items merge only when Product, normalized sold amount, and existing add-on configuration all match; a different amount stays a distinct line even when the add-ons match.
- [ ] Existing add-ons remain priced per sold portion while the parent Product price alone is proportional to the chosen amount; parent and add-on totals remain accurate after line quantity changes.
- [ ] Draft Sale saves and restores preserve custom amount, Unit display, calculated one-portion rate, configuration identity, and totals without recomputing them from later catalogue changes.
- [ ] KOTs where applicable, billing detail, printed and shared receipts/invoices, sale history, and reporting summaries display the persisted Sold Product Name and monetary snapshots consistently.
- [ ] Existing sale-level discounts, payments, voids, device audit, and money-account behavior continue to operate from the resulting Sale totals without a measured-quantity-specific path.
- [ ] Bundles, Combos, and existing non-measured configured Product flows retain their current fixed-portion behavior.
- [ ] Regression tests exercise add-on configuration merges, draft restoration, operational output, historical output, and fixed Bundle/Combo behavior using externally visible results.
