# 02 — Ship central Product defaults and Store override workflow

**What to build:** An Organization administrator can manage Catalog Product default price, default discount, and global publication, while a Store administrator can independently override or clear price and discount and locally activate or deactivate the same Product. POS and Billing use the resulting effective Store Product Offering values.

**Blocked by:** 01 — Expand the effective Store Product Offering contract.

**Status:** ready-for-agent

- [ ] Organization Product screens clearly show editable Organization defaults and global publication status rather than presenting a default as a particular Store's live selling price.
- [ ] Store Product screens show effective inherited or overridden values and support independent set and clear actions for price and discount, plus local menu status changes.
- [ ] New Products and Bundle Products begin Organization-inactive with locally active rows for current Stores; new Stores receive locally inactive Product Offerings; global status changes preserve local statuses.
- [ ] Existing Offerings migrate without changing effective values: values matching the Organization default become inherited and differing values become explicit overrides, with an Organization-admin review of inferred counts.
- [ ] Product default updates affect only inheriting Stores, reject invalid effective price/discount combinations, never overwrite overrides, and are enforced consistently by Admin, POS, and Billing.

