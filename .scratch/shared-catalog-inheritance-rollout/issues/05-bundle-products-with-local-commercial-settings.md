# 05 — Make Bundle Products respect local commercial settings

**What to build:** A Bundle Product (shown as “Combo”) uses its own effective Store Product Offering price, discount, and local availability at every Store, while its fixed Organization-owned composition and global dependency safety rules remain unchanged.

**Blocked by:** 02 — Ship central Product defaults and Store override workflow; 04 — Ship Store Add-On Offerings.

**Status:** ready-for-agent

- [ ] Organization and Store flows consistently treat a Bundle Product as a Product with fixed shared composition and its own inherited-or-overridden commercial values.
- [ ] POS and Billing charge the Bundle Product's effective Store Offering values, never derive Bundle price from component prices, and retain existing trusted component snapshots.
- [ ] A Store-local component or Add-On unavailability removes standalone/customize use without silently changing an independently active Bundle Product; the Bundle Product's own availability controls whether it is sold.
- [ ] Existing global dependency protections continue to prevent a globally active Bundle Product from referring to a globally inactive Product, Add-On, or attachment.
- [ ] Catalog, Admin, POS, and Billing tests cover local Bundle pricing/availability and preserve existing Bundle composition and reporting behavior.

