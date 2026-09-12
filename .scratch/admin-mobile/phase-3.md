# Admin Mobile — Phase 3: Auth Infrastructure

Status: subphase 3.1 completed with follow-up — ready for 3.2

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

## Phase-level non-goals

- Login or registration API mutations.
- OTP request, verification, resend, or form validation wiring.
- Organization loading or picker behavior.
- Dashboard/business modules.
- Android build, emulator, physical-device, or runtime validation.

## Phase completion gate

Phase 3 completes when auth state, bootstrap, persistence, logout, expiry cleanup, and public/protected navigation are implemented and focused checks pass. Native/runtime validation remains a separate documented follow-up if unavailable.
