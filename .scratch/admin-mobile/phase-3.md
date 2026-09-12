# Admin Mobile — Phase 3: Auth Infrastructure

Status: completed with follow-up

## User-facing outcome

Replace the Phase 2 visual-only auth preview boundary with a predictable Admin user session lifecycle. The phase will establish auth state, restore a securely persisted Admin JWT, route signed-out/signed-in/loading states, handle logout, and clear expired sessions. Login and registration form mutations remain in Phases 4 and 5.

## Approved contract

- Use the existing user-authenticated methods from `@repo/services`: `userAuthenticate` and `userLogout`.
- Use the Admin-only Keychain-backed token adapter configured in `apps/admin-mobile/src/lib/admin-storage.ts`.
- Do not reuse POS Device session state, POS storage, or POS navigation.
- A token is not trusted until `GET /auth` confirms the current user.
- A missing or rejected token routes to the public auth surface and clears the stored Admin JWT.
- Authentication remains English-only and Android-first.

## Subphase map

| Subphase | Scope | Exit condition |
| --- | --- | --- |
| 3.1 Auth state seam | Admin-owned Zustand auth state, lifecycle statuses, actions, and query-key boundary. | State transitions are explicit, small, and covered by focused tests without native runtime dependencies. |
| 3.2 Bootstrap and persistence | Token hydration, `GET /auth` bootstrap, successful-user hydration, rejected-token cleanup, and loading boundary. | App startup distinguishes checking, signed-out, and signed-in states without trusting stale storage. |
| 3.3 Logout and protected navigation | Logout orchestration, expiry cleanup, public/protected root navigation, and placeholder authenticated destination. | Logout and rejected-session paths clear Admin state and never expose protected content to an unauthenticated user. |

## Subphase 3.1 plan — Auth state seam

### Scope

- Add an app-owned auth store under `apps/admin-mobile/src/store/` using the approved Zustand dependency.
- Model explicit `checking`, `signed-out`, `signed-in`, and `logging-out` lifecycle states.
- Store only the authenticated Admin user DTO in memory; the JWT remains behind the shared Keychain-backed service adapter.
- Add stable Admin auth query-key constants for the later TanStack Query bootstrap.
- Add focused pure state tests where possible; do not import React Native or invoke native storage in the tests.

### Acceptance criteria

- The store cannot represent a signed-in state without an authenticated user.
- Clearing the user returns the lifecycle to signed-out and removes in-memory identity.
- Logout state is distinguishable from initial bootstrap checking.
- No POS store, POS session, Device Login, or Owner User state is imported.
- No API call, token write, navigation change, or UI replacement is included in this subphase.

### Dependencies and public seams

- Phase 1 Admin storage adapter and Phase 2 UI remain unchanged.
- `AuthenticatedUserDTO` from `@repo/types`.
- Zustand for the app-owned in-memory user state.
- `AUTH_QUERY_KEY`/Admin auth query keys consumed by 3.2 and later auth behavior phases.

### Verification

- `bun run --cwd apps/admin-mobile check-types`
- Focused Admin auth-state test file if added.
- `git diff --check`
- Read-only boundary scan for POS imports and native/browser runtime leakage.

### Risks and rollback

- Keep the JWT out of Zustand and avoid persisting the user DTO as a second session source.
- Avoid adding auth effects to the store; bootstrap and logout orchestration belong in hooks.
- Keep the query-key name app-owned so future cache invalidation does not collide with POS state.

### 3.1 implementation record

Status: completed with follow-up

- Added the app-owned `AdminAuthSnapshot` reducer and Zustand store.
- Added explicit checking, signed-out, signed-in, and logging-out statuses.
- Added Admin-owned `adminAuthKeys` for later TanStack Query bootstrap and invalidation.
- Kept the JWT and native storage out of the store; only the authenticated user DTO is held in memory.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- `bun test apps/admin-mobile/src/store/auth-state.test.ts` — 4 passed.
- `git diff --check` — passed.
- Admin auth-state boundary scan found no POS, Device Login, Owner User, browser, API, or native-storage imports.

Subphase review:

- Standards: state transitions are isolated in a pure reducer, the Zustand store is a thin app-owned seam, and tests avoid native runtime dependencies.
- Spec: the store cannot represent signed-in without a user and keeps token persistence in the previously approved secure adapter boundary.

Next subphase: 3.2 Bootstrap and persistence.

## Subphase 3.2 plan — Bootstrap and persistence

### Scope

- Add an Admin-owned bootstrap hook that hydrates the shared auth-token seam from the dedicated Keychain adapter.
- Call `userAuthenticate` only after token hydration confirms a token exists.
- Set the authenticated Admin user only from a successful `GET /auth` response containing a user.
- Clear an absent, rejected, or malformed session token and return to signed-out state.
- Add a loading/status boundary to the root navigator while bootstrap is checking and a non-dashboard placeholder for a restored signed-in session until 3.3 adds protected navigation.

### Acceptance criteria

- Cold start with no stored token reaches signed-out/public auth state without calling `GET /auth`.
- Cold start with a stored token remains checking until `GET /auth` succeeds or rejects.
- A successful authenticated response hydrates the Admin user in memory without duplicating the JWT in Zustand.
- A rejected or user-less response clears the Admin JWT and returns to signed-out state.
- Bootstrap is idempotent per mounted root and does not create an effect/update loop.
- No POS session, Device Login, Owner User, login mutation, registration mutation, or Organization behavior is added.

### Dependencies and public seams

- Subphase 3.1 Admin auth store and `adminAuthKeys.me`.
- Phase 1 Admin Keychain adapter and shared `hydrateAuthToken`, `clearAuthToken`, and `userAuthenticate` methods.
- Existing TanStack Query provider and root navigator.
- A small status screen is an interim seam; Phase 3.3 will replace the signed-in placeholder with protected navigation.

### Verification

- `bun run --cwd apps/admin-mobile check-types`
- Focused bootstrap decision test(s) that do not require native Keychain or network runtime.
- `git diff --check`
- Read-only boundary scan for POS imports and duplicate token/session stores.

### Risks and rollback

- Never call `GET /auth` before token hydration completes.
- Treat all non-success or user-less bootstrap responses as signed-out and clear only the Admin token.
- Do not claim protected navigation is complete until 3.3.

### 3.2 implementation record

Status: completed with follow-up

- Added `useAdminAuthBootstrap` to hydrate the Admin JWT, conditionally call `userAuthenticate`, hydrate the Admin user, and clear rejected/user-less sessions.
- Added `resolveBootstrapUser` as a pure response decision seam with focused tests.
- Added a root loading/status screen and routed signed-out users to the Phase 2 public auth preview.
- Routed a restored signed-in session to an explicit non-dashboard placeholder until 3.3 adds protected navigation.
- Kept token persistence behind the existing Admin Keychain adapter and avoided duplicate session storage.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- `bun test apps/admin-mobile/src/store/auth-state.test.ts apps/admin-mobile/src/hooks/use-admin-auth-bootstrap.test.ts` — 7 passed.
- `git diff --check` — passed.
- Admin mobile boundary scan found no POS session, Device Login, Owner User, browser, or duplicate storage imports.

Subphase review:

- Standards: bootstrap is isolated in a hook, query identity is app-owned, response interpretation is pure-testable, and the root navigator has an explicit loading boundary.
- Spec: no token is trusted before `GET /auth`; absent/rejected sessions are cleared; protected workspace behavior remains deferred to 3.3.

Next subphase: 3.3 Logout and protected navigation.

## Subphase 3.3 plan — Logout and protected navigation

### Scope

- Add an Admin-owned logout hook using the shared `userLogout` method.
- Clear the Admin JWT, auth query cache, and in-memory user state after logout succeeds or fails locally.
- Switch the root navigator between the public auth preview and a protected placeholder workspace using the Admin auth status.
- Keep the placeholder workspace intentionally empty of dashboard, Organization, or business behavior while proving protected-route ownership.
- Treat a rejected bootstrap session as the expiry cleanup path for the current infrastructure phase.

### Acceptance criteria

- Signed-out users can only reach the public auth preview route.
- Signed-in users reach the protected Admin workspace route and cannot reach the public route through the root navigator.
- Logout marks the session as logging out, disables the logout action, and returns to signed-out/public state after local cleanup.
- Local cleanup runs even when the server logout request fails.
- Admin JWT and auth query cache are cleared; POS or Owner User credentials are untouched.
- Bootstrap rejection clears expired/invalid Admin sessions and routes back to public auth.
- No dashboard, Organization, login, registration, OTP, or backend contract behavior is added.

### Dependencies and public seams

- Subphase 3.1 auth store and `adminAuthKeys`.
- Subphase 3.2 bootstrap hook and root loading boundary.
- Shared `userLogout` and `clearAuthToken` services.
- Phase 2 `AuthButton` for the placeholder logout action.

### Verification

- `bun run --cwd apps/admin-mobile check-types`
- Focused auth-state and logout decision tests where pure seams are available.
- `git diff --check`
- Read-only boundary scan for POS/Owner User storage and route imports.

### Risks and rollback

- Always clear local Admin state in a `finally`-equivalent path; server logout failure must not leave a local credential active.
- Use a keyed navigation boundary so authenticated and public route trees are not retained together.
- Keep the protected screen a placeholder until later product phases define its Organization destination.

### 3.3 implementation record

Status: completed with follow-up

- Added `useAdminLogout` using the shared `userLogout` method and guaranteed local Admin cleanup on settlement.
- Added protected/public root navigation switching keyed by the Admin auth lifecycle.
- Added an authenticated placeholder workspace with a loading/disabled sign-out action.
- Kept the protected workspace free of dashboard, Organization, and business behavior.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- `bun test apps/admin-mobile/src/store/auth-state.test.ts apps/admin-mobile/src/hooks/use-admin-auth-bootstrap.test.ts` — 7 passed.
- `git diff --check` — passed.
- Admin mobile boundary scan found no POS, Device Login, Owner User, browser, or duplicate storage imports.

Subphase review:

- Standards: logout orchestration is isolated in a hook, query cleanup uses the Admin-owned key boundary, and public/protected route trees are keyed separately.
- Spec: local logout cleanup runs from the settlement path, rejected bootstrap sessions are cleared, and no dashboard or Organization behavior was added.

## Phase 3 completion review

Phase 3 is complete with native-runtime follow-ups. Admin auth state, secure-token bootstrap, rejected-session cleanup, logout, and protected/public navigation are implemented and focused checks pass.

Phase commits:

- `a333429 feat(admin-mobile): add auth state seam`
- `c02f2aa feat(admin-mobile): bootstrap admin auth session`
- The current Phase 3.3 commit records logout, protected navigation, and this phase completion state.

Deferred validation:

- Android build, emulator, physical-device, and runtime validation remain pending because repository `AGENTS.md` prohibits those commands while planned POS mobile phases remain incomplete.

Next phase: Phase 4 Login.

## Phase-level non-goals

- Login or registration API mutations.
- OTP request, verification, resend, or form validation wiring.
- Organization loading or picker behavior.
- Dashboard/business modules.
- Android build, emulator, physical-device, or runtime validation.

## Phase completion gate

Phase 3 completes when auth state, bootstrap, persistence, logout, expiry cleanup, and public/protected navigation are implemented and focused checks pass. Native/runtime validation remains a separate documented follow-up if unavailable.
