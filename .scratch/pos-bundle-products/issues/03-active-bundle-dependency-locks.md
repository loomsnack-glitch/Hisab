# 03 — Active bundle dependency locks

**What to build:** make bundle lifecycle safe by preventing active bundle definitions from silently breaking when dependent Products, Add-Ons, or `Product Add-On Attachments` are retired, while still allowing admins to edit bundle definitions in place for future sales and retire bundles by inactivation.

**Blocked by:** 02 — Add-on-backed bundle composition.

**Status:** ready-for-agent

- [ ] An active Product or Add-On that is used by an active Bundle Product cannot be inactivated until the bundle is updated or inactivated first.
- [ ] An active `Product Add-On Attachment` that is used by an active Bundle Product cannot be deactivated until the bundle is updated or inactivated first.
- [ ] Bundle definitions can still be edited in place for future sales, and bundles with history or dependencies are retired by status rather than destructive deletion.
- [ ] Catalog behavior tests cover both dependency-lock rejection and the happy path after the dependent bundle is changed or retired.
