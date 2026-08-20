# 02 — Create the standalone Ganatri POS core

**What to build:** Deliver Ganatri POS as its own Turbo application with Device Login and the core Store-Scoped POS Workflow. A Store Device operator can sign in at POS `/login`, work from the POS root, create and manage bills, and use POS Appearance without relying on an Admin route.

**Blocked by:** 01 — Rename the customer web app to Ganatri Admin.

**Status:** claimed

- [x] Ganatri POS independently runs, builds, lints, type-checks, and tests as a Turbo application.
- [x] POS `/login` establishes only a Device-Authenticated Billing Session, and unauthenticated workspace requests return to that POS login.
- [x] POS `/` provides the existing Products and Bills experience using the unchanged device-scoped POS API contract.
- [x] POS `/appearance` and its settings alias work inside POS, with POS-specific title, manifest, start route, and browser preferences.
- [x] The migration reuses shared workspace code deliberately where required and does not create copied Admin/POS implementations.

## Comments

`apps/pos` is a first-class Turbo application (`pos`) on port 5174 with independent `dev`, `build`, `lint`, `check-types`, and `test` commands. Device Login is at `/login`; the workspace is at `/` (Products) with `/bills`, `/appearance`, and `/settings` → `/appearance`. POS uses same-origin `/api` to the unchanged device-scoped backend `/pos` contract via `@repo/services`. Admin `/pos` routes were left in place.

POS identity is standalone: document title, `pos.webmanifest` start URL `/`, POS display-scale/printer keys, and `ganatri-pos-theme` storage. It does not call user authentication.

Shared packages (`@repo/services`, `@repo/ui`, `@repo/types`, `@repo/assets`) remain the API/UI primitive source. Billing/POS view modules currently live in both apps so Admin's temporary `/pos` tree can stay until ticket 08.

## Review notes

- Later tickets still own Tables, Customers, Reports, Purchases, and WhatsApp POS routes.
- Two compile-only fixes landed in shared packages so POS `check-types` could pass: `CreateLabelTemplateSchema` `@ts-expect-error` and PhoneInput `collisionBoundary` typing.
