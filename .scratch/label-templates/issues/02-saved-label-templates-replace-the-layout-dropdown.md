# 02 — Saved Label Templates replace the layout dropdown

**What to build:** Administrators manage Organization-owned Label Templates, each Organization is seeded with the A4 and 58×40 mm thermal designs, and the print dialog picks a saved Label Template instead of a hardcoded layout dropdown.

**Blocked by:** 01 — Template-shaped renderer for existing A4 and thermal labels

**Status:** ready-for-agent

- [ ] An administrator can create, list, update, deactivate, and delete Label Templates that belong only to their Organization.
- [ ] Store Devices cannot create or mutate Label Templates; another Organization cannot read or overwrite them.
- [ ] Existing Organizations receive seeded A4 sheet and 58×40 mm thermal Label Templates that print equivalently to today’s layouts.
- [ ] The print dialog lists the Organization’s active Label Templates and no longer offers an `"a4" | "thermal"` layout enum.
- [ ] Changing the chosen Label Template resets test-scan confirmation before bulk print.
- [ ] Catalog contract/service tests cover Organization scoping, administrator-only writes, and seeding; renderer tests still pass against the seeded records.
