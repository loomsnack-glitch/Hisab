# 02 — Add-on-backed bundle composition

**What to build:** let organization admins define the full fixed component tree of a `Bundle Product`, including multiple top-level Product components and parent-scoped Add-Ons under those Products, while keeping bundle authoring tied to active catalog dependencies and normalized component identity rules.

**Blocked by:** 01 — Typed Bundle Product catalog foundation.

**Status:** ready-for-agent

- [ ] Bundle authoring supports one or more top-level Product components with whole-count quantities and optional Add-Ons nested only under their parent Product components.
- [ ] Bundle Add-Ons reuse normal `Product Add-On Attachment` eligibility and obey the underlying `Add-On Selection Cap`.
- [ ] Only active Products, active Add-Ons, and active attachments can be selected into a bundle definition.
- [ ] Same-product components stay separate when their Add-On shapes differ and merge into quantity when their Add-On shapes are identical, with behavior covered by catalog tests.
