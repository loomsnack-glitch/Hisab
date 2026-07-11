# 05 — Draft-safe bundle sale behavior

**What to build:** complete Draft Sale behavior for bundles so bundle lines behave like stable repeated commercial items: identical bundles merge by quantity, quantity changes scale the full component tree, bundle lines remain indivisible, and already-added bundle snapshots stay frozen across later catalog edits while still committing safely.

**Blocked by:** 03 — Active bundle dependency locks; 04 — Sell a bundle with trusted snapshots.

**Status:** ready-for-agent

- [ ] Adding the same Bundle Product again with the same frozen definition merges by quantity instead of creating duplicate Draft Sale lines.
- [ ] Changing bundle quantity automatically scales the full internal component tree without allowing independent child quantity edits.
- [ ] Bundle lines remain indivisible in the Draft Sale: operators may change quantity or remove the line, but may not explode it into normal Product or Add-On lines.
- [ ] Frozen bundle snapshots survive later catalog edits and can still be committed successfully, with behavior covered by Billing workflow tests.
