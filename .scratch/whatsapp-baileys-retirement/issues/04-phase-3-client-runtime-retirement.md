# Phase 3 — Remove Baileys clients, worker, and deployment wiring

Status: complete

Type: task

## Objective

Remove QR/linking UI and the unused Baileys worker package and runtime wiring without affecting Cloud API account management or POS sending controls.

## Acceptance criteria

- Admin and POS no longer render Baileys QR, session, link, disconnect, or change-number controls.
- Baileys feature flags and obsolete worker credentials are removed from runtime config and examples.
- The worker dependency, auth-state/session code, scripts, and PM2 configuration are removed only after backend references are gone.
- Cloud API UI paths remain usable.
- Admin/POS builds and focused tests pass.
- The worker package, development scripts, PM2 entry, obsolete environment variables, QR UI, and linked-device controls are removed.
