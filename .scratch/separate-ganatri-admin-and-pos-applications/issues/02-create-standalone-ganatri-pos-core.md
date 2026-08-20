# 02 — Create the standalone Ganatri POS core

**What to build:** Deliver Ganatri POS as its own Turbo application with Device Login and the core Store-Scoped POS Workflow. A Store Device operator can sign in at POS `/login`, work from the POS root, create and manage bills, and use POS Appearance without relying on an Admin route.

**Blocked by:** 01 — Rename the customer web app to Ganatri Admin.

**Status:** ready-for-agent

- [ ] Ganatri POS independently runs, builds, lints, type-checks, and tests as a Turbo application.
- [ ] POS `/login` establishes only a Device-Authenticated Billing Session, and unauthenticated workspace requests return to that POS login.
- [ ] POS `/` provides the existing Products and Bills experience using the unchanged device-scoped POS API contract.
- [ ] POS `/appearance` and its settings alias work inside POS, with POS-specific title, manifest, start route, and browser preferences.
- [ ] The migration reuses shared workspace code deliberately where required and does not create copied Admin/POS implementations.

