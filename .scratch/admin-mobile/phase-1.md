# Admin Mobile — Phase 1: New App Foundation

Status: completed with follow-up

## User-facing outcome

Create an isolated Expo/React Native application at `apps/admin-mobile` that has the approved Ganatri Admin identity, shared-package access, mobile API configuration, native navigation shell, safe-area support, and a minimal foundation screen. The app must not contain POS flows or reuse POS session state.

## Scope

### Included

- New workspace package and root development scripts.
- Expo app metadata for `Ganatri Admin` and `in.ganatri.admin`.
- Strict TypeScript configuration.
- Expo Metro and Uniwind/Tailwind v4 setup.
- React Navigation native stack and root navigation seam.
- QueryClient and SafeArea providers.
- Admin mobile API base URL configuration using `EXPO_PUBLIC_BASE_API_URL`.
- Shared `@repo/services` and `@repo/types` wiring.
- English foundation screen proving the app shell is separate from POS.

### Excluded

- Login, registration, OTP, session persistence, or logout behavior.
- Organization creation or selection screens.
- POS imports, Device Login, device IDs, billing, or POS storage.
- Android build, emulator, physical-device, or release verification in this phase.
- Backend or shared-package changes.

## Acceptance criteria

- `apps/admin-mobile` is a separate workspace package named `ganatri-admin-mobile`.
- Expo metadata uses the approved Admin display name and Android package.
- Root scripts can target the new app without changing POS scripts.
- Shared API/services/types are imported through workspace dependencies.
- Mobile API configuration supports the Expo public base URL without embedding secrets.
- Navigation and provider composition have stable app-owned seams for later auth phases.
- No POS-specific module, store, session, or route is imported.
- Focused type validation passes, or any baseline/tooling failure is explicitly recorded.

## Implementation plan

1. Add the workspace manifest, Expo metadata, TypeScript, Metro, styles, and entry point.
2. Add API configuration and provider composition.
3. Add the root navigator and minimal foundation screen.
4. Add only the root scripts required to run or type-check this app.
5. Update the lockfile through the package manager.
6. Run focused type validation and diff checks; do not run build or Android commands.

## Review points

- Confirm app identity cannot collide with POS (`in.ganatri.pos`).
- Confirm user-auth API configuration is independent from POS API/session setup.
- Confirm the dependency list contains no unnecessary POS-only capabilities.
- Confirm the new root scripts do not alter existing script behavior.

## Exit condition

Phase 1 is complete with follow-up: the new app foundation and workspace wiring are implemented, focused static validation is recorded, and the next auth/UI phase can begin without changing the POS boundary. Native runtime/build validation remains pending under the repository's mobile validation rule.

## Verification evidence

- `bun install` completed and updated the workspace lockfile.
- `bun run --cwd apps/admin-mobile check-types` passed.
- `git diff --check` passed.
- No build, emulator, physical-device, or POS runtime command was run.
