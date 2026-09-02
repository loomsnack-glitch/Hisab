# 03 — Measured-Product Workflow Compatibility

**What to build:** Make measured portions a reliable part of advanced and historical sales workflows. A custom Product portion retains its identity, price, and display consistently when the Sale is configured, saved as a Draft, restored, sent to operational output, finalized, or viewed later, without changing existing fixed Bundle or Combo behavior.

**Blocked by:** 01 — Default Product Selling Units; 02 — Custom Selling Quantities in POS

**Status:** resolved

- [x] Configured single Product Sale Items merge only when Product, normalized sold amount, and existing add-on configuration all match; a different amount stays a distinct line even when the add-ons match.
- [x] Existing add-ons remain priced per sold portion while the parent Product price alone is proportional to the chosen amount; parent and add-on totals remain accurate after line quantity changes.
- [x] Draft Sale saves and restores preserve custom amount, Unit display, calculated one-portion rate, configuration identity, and totals without recomputing them from later catalogue changes.
- [x] KOTs where applicable, billing detail, printed and shared receipts/invoices, sale history, and reporting summaries display the persisted Sold Product Name and monetary snapshots consistently.
- [x] Existing sale-level discounts, payments, voids, device audit, and money-account behavior continue to operate from the resulting Sale totals without a measured-quantity-specific path.
- [x] Bundles, Combos, and existing non-measured configured Product flows retain their current fixed-portion behavior.
- [x] Regression tests exercise add-on configuration merges, draft restoration, operational output, historical output, and fixed Bundle/Combo behavior using externally visible results.

## Answer

Measured portions now keep identity through configured add-on lines, drafts, KOTs, receipts/invoices, and checkout totals.

Sale Items merge only when Product, normalized sold amount, and add-on/combo configuration all match. Add-ons stay priced per sold portion; only the parent Product rate scales with the chosen amount. Draft restore, Table KOT checkout, and standalone KOT batch matching all use that same identity, so `Cake (250g)` and `Cake (500g)` with the same add-ons stay separate while equal amounts still merge. Receipts, invoices, bill detail, and reporting continue to print the persisted Sold Product Name. Combos remain fixed `1pc` portions. POS still uses separate customize and custom-amount actions; a custom amount with add-ons is carried by the sale-writing path and draft restore.

## Comments
