# 04 — Ship Store Add-On Offerings

**What to build:** An Organization manages shared Add-On definitions, attachments, caps, defaults, and global publication once; each Store inherits or independently overrides Add-On price and discount and controls local Add-On availability for its POS customization flow.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every Add-On has one retained Store Add-On Offering per Store with nullable independent price/discount overrides and local status, while the Add-On retains Organization defaults and global status.
- [ ] New Add-Ons start Organization-inactive with locally active rows for current Stores, and new Stores receive locally inactive Add-On Offerings for the existing catalog.
- [ ] Store and Organization Add-On screens clearly distinguish defaults, effective values, inherited values, overrides, global publication, and local availability.
- [ ] POS customization and Billing server-side validation require active Organization Add-On, active Store Add-On Offering, active Product Add-On Attachment, and an active parent Product Offering, and use trusted effective Add-On values.
- [ ] Existing Add-On sale snapshots and attachment/selection-cap behavior remain intact, with migration and end-to-end tests proving no historical repricing.

