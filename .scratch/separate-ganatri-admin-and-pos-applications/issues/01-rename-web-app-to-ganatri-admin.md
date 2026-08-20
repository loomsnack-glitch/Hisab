# 01 — Rename the customer web app to Ganatri Admin

**What to build:** Move the existing customer-facing application into its Ganatri Admin identity without changing the behavior available to Organization administrators. This is the safe mechanical foundation for the later POS extraction: Admin continues to build, run, authenticate Organization Users, and expose its current routes while the current embedded POS behavior remains temporarily intact.

**Blocked by:** None — can start immediately.

**Status:** claimed

- [x] Ganatri Admin is a first-class Turbo application with independent development, build, lint, type-check, and test commands.
- [x] Existing Organization User authentication, Organization-management workflows, and read-only billing inspection continue to work unchanged.
- [x] Existing embedded POS behavior remains available only as a temporary migration state, so this refactor lands with a green application.
- [x] Application identity and version metadata identify the application as Ganatri Admin without changing Ganatri Console.

## Comments

The customer app now lives at `apps/admin` with package name `admin`. Identity, version metadata, and Turbo commands (`dev`, `build`, `lint`, `check-types`, `test`) are in place. Embedded `/pos` routes remain for later tickets. Ganatri Console was not changed.

Leftover `apps/web` was deleted after Vite released the folder. Root `bun run dev` now starts `admin#dev` at http://localhost:5173/.

`bun run lint` and `bun run check-types` currently fail on pre-existing Admin source issues; they were not introduced by this rename. Tests and production build pass.

## Review (before ticket 02)

Ticket 01 rename/identity is enough to start 02. Do not wait on Admin lint/type-check cleanup.

Actionable for 02:
- Create `apps/pos` from the current Admin `/pos` routes; do not look for `apps/web`.
- POS must independently pass lint and type-check. Failures already exist in files such as `pos-layout.tsx` and `pos-purchases-panel.tsx`; fix them in the POS app rather than copying a red quality gate.
- Keep Admin `/pos` routes in place until ticket 08; 01 is supposed to leave them as a temporary migration state.
- Reuse shared packages instead of copying Admin POS modules. `turbo.json` already has a `test` task.

