# 01 — Typed Bundle Product catalog foundation

**What to build:** deliver the first end-to-end catalog flow for a `Bundle Product` as a typed `Product`, so organization admins can create, edit, view, and inactivate a bundle inside the normal category structure and operators can recognize it as a bundle in catalog and POS browsing.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Organization admins can create and edit a `Bundle Product` through a bundle-specific catalog flow while keeping it inside the normal `Product` and category model.
- [ ] Bundle Products are visually identified as bundles in catalog management and POS browsing.
- [ ] Validation enforces the minimum bundle shape: typed bundle identity, at least one top-level Product component, no add-on-only bundles, and no bundle-in-bundle composition.
- [ ] The slice includes behavior tests at the catalog service and API seam for typed bundle creation and status-based retirement.
