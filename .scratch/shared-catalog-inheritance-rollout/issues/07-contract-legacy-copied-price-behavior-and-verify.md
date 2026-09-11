# 07 — Contract legacy copied-price behavior and verify the complete catalog flow

**What to build:** The transitional copied-price compatibility path is removed once every catalog workflow uses Organization defaults and Store Commercial Overrides, leaving one clear model with complete cross-application regression coverage.

**Blocked by:** 01 — Expand the effective Store Product Offering contract; 02 — Ship central Product defaults and Store override workflow; 03 — Ship Store Category presentation; 04 — Ship Store Add-On Offerings; 05 — Make Bundle Products respect local commercial settings; 06 — Ship audited central multi-store catalog operations.

**Status:** ready-for-agent

- [ ] Legacy copied Store Product Offering price/discount behavior and transitional compatibility paths are removed only after no supported caller depends on them.
- [ ] Product, Category, Add-On, Bundle Product, Admin, POS, Billing, migration, and audit behavior all use the approved shared-catalog inheritance model.
- [ ] Regression coverage proves Organization defaults, independent overrides, global/local lifecycle, Store Category presentation, and snapshots coexist without cross-Store leakage.
- [ ] The release path verifies migration safety and documents any Organization-admin follow-up required for inferred legacy inheritance states.
