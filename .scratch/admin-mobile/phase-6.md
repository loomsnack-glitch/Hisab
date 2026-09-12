# Admin Mobile — Phase 6: Organization Landing

Status: completed with follow-up — ready for Phase 7

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

### 6.1 implementation record

Status: completed with follow-up

- Added Admin-owned Organization query keys and a pure `resolveOrganizationLanding` seam for zero, one, and multiple Organizations.
- Replaced the protected placeholder root with an Organization query boundary using shared `getOrganizations` and native loading/error states.
- Kept sign-out available through loading, error, and temporary landing states while setup and picker interactions remain in later subphases.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- Organization routing, auth-state, and bootstrap tests — 10 passed.
- `git diff --check` — passed.
- Boundary scan found no POS, Device Login, Owner User, browser, or ordinary-storage dependency.
- Native build, emulator, device, and runtime validation remain pending under repository `AGENTS.md`.

Subphase review:

- Standards: Organization state is fetched through TanStack Query and routing policy is isolated in a pure helper.
- Spec: zero/one/multiple policy is represented without prematurely adding dashboard or business modules.

Next subphase: 6.2 First-Organization setup.

## 6.2 implementation record

Status: completed with follow-up

- Added the zero-Organization setup form using `CreateOrganizationSchema`, React Hook Form, and the shared `createOrganization` service.
- Added native validation, lowercase username input, pending state, recoverable service errors, and invalid-response handling.
- Transitioned to the newly created Organization workspace landing and invalidated the Admin Organization query for consistency.
- Kept Organization creation authenticated and separate from registration/POS credentials.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- Organization routing, auth-state, and bootstrap tests — 10 passed.
- `git diff --check` — passed.
- Setup boundary scan found no POS, Device Login, Owner User, browser, or ordinary-storage dependency.
- Native build, emulator, device, and runtime validation remain pending under repository `AGENTS.md`.

Subphase review:

- Standards: the form uses the shared Organization schema/service and existing native auth controls; no duplicate API client was added.
- Spec: zero Organizations now have an explicit first-workspace setup path without adding dashboard or business modules.

Next subphase: 6.3 Picker and workspace landing.

## 6.3 implementation record

Status: completed with follow-up

- Added a native multiple-Organization picker with accessible organization actions and sign-out.
- Added a bounded selected-Organization workspace landing with change-organization behavior when multiple Organizations exist.
- Added retry behavior for Organization query errors and retained sign-out across loading, error, setup, picker, and workspace states.
- Kept the landing intentionally free of catalog, billing, POS, and broader Admin business modules.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- Organization routing, auth-state, and bootstrap tests — 10 passed.
- `git diff --check` — passed.
- Landing boundary scan found no POS, Device Login, Owner User, browser, or ordinary-storage dependency.
- Native build, emulator, device, and runtime validation remain pending under repository `AGENTS.md`.

Subphase review:

- Standards: selection remains in protected app state, while server Organization data remains in the Admin TanStack Query boundary.
- Spec: one Organization opens directly, multiple use a picker, and zero uses setup; no Organization is silently inferred during registration.

Next subphase: 6.4 Organization integration review.

## 6.4 implementation record

Status: completed with follow-up

- Reviewed the complete zero/one/multiple Organization transition set, including query loading, service-response errors, retry, creation invalidation, selection, change-organization, and logout.
- Confirmed the protected root cannot render Organization landing while the Admin auth bootstrap is signed out or pending.
- Confirmed the workspace is deliberately bounded and does not expose catalog, billing, POS, or broader Admin modules.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- Full Admin mobile focused suite — 17 passed across auth, registration, OTP timing, and Organization routing tests.
- `git diff --check` — passed.
- Organization landing boundary scan found no POS, Device Login, Owner User, browser, or ordinary-storage dependency; deferred-module words only occur in explanatory copy.
- Native build, emulator, device, and runtime validation remain pending under repository `AGENTS.md`.

Phase review:

- Standards: Organization query state, creation, and selection stay inside the Admin mobile boundary and shared services; routing policy is pure and testable.
- Spec: zero Organizations use setup, one opens directly, and multiple use a picker, with explicit recoverable states and no hidden Organization assumption.

Phase 6 is complete with native validation follow-up. Phase 7 Auth release gate is next.

## Phase-level non-goals

- Full Admin dashboard or business modules.
- Store selection, catalog, billing, POS Device Login, or Owner User authentication.
- Organization editing/management beyond the minimum create-and-select landing path.
- Native build, emulator, physical-device, or release validation.

## Phase completion gate

Phase 6 completes when zero/one/multiple Organization routing, first-Organization creation, picker selection, bounded workspace landing, errors/loading, and logout continuity are covered and committed.
