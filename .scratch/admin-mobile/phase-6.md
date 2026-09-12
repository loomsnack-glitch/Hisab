# Admin Mobile — Phase 6: Organization Landing

Status: planned — subphase 6.1 ready

## User-facing outcome

After Admin authentication, route the user to the correct first destination based on their Organizations: first-Organization setup when none exist, the single Organization workspace when exactly one exists, or an Organization picker when multiple exist.

## Approved contract

- Registration creates only the User; Organization creation is an explicit authenticated action.
- Zero Organizations open first-Organization setup.
- One Organization opens directly to its Admin workspace landing.
- Multiple Organizations open the picker.
- Use shared `getOrganizations` and `createOrganization` services and shared Organization types/schema.
- Keep the workspace a bounded landing placeholder; catalog, sales, finance, reports, POS, and dashboard modules are out of scope.

## Subphase map

| Subphase | Scope | Exit condition |
| --- | --- | --- |
| 6.1 Organization route seam | Add app-owned query keys, pure zero/one/multiple routing, and replace the protected placeholder entry. | Protected navigation loads Organizations and selects the correct mode with deterministic tests. |
| 6.2 First-Organization setup | Add authenticated name/username creation using the shared schema/service and transition to the created workspace. | Zero-Organization users can create one Organization with validation, pending, errors, and safe response handling. |
| 6.3 Picker and workspace landing | Add multiple-Organization selection, workspace summary, change-organization, loading/error/retry, and logout continuity. | One and multiple Organization users can reach an explicit bounded workspace destination. |
| 6.4 Organization integration review | Review query invalidation, creation/selection transitions, protected boundaries, and scope. | Zero/one/multiple behavior passes focused checks and Phase 6 is ready for release gate. |

## 6.1 plan — Organization route seam

### Scope

- Add a pure `resolveOrganizationLanding` helper for zero/one/multiple Organization lists.
- Add Admin-owned Organization query keys.
- Replace the authenticated placeholder root screen with the Organization landing boundary.
- Preserve the existing Admin logout/session lifecycle.

### Acceptance criteria

- Empty, singleton, and multi-Organization lists resolve to distinct modes.
- Loading and service errors do not expose a false workspace.
- No Organization data or selection is persisted into POS storage.
- The protected root remains unavailable when the Admin auth store is signed out.

### Verification

- Admin typecheck and pure routing tests.
- `git diff --check` and boundary scan.
- No native build, emulator, device, or runtime-start command under repository `AGENTS.md`.

## Phase-level non-goals

- Full Admin dashboard or business modules.
- Store selection, catalog, billing, POS Device Login, or Owner User authentication.
- Organization editing/management beyond the minimum create-and-select landing path.
- Native build, emulator, physical-device, or release validation.

## Phase completion gate

Phase 6 completes when zero/one/multiple Organization routing, first-Organization creation, picker selection, bounded workspace landing, errors/loading, and logout continuity are covered and committed.
