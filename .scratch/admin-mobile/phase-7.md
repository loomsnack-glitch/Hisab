# Admin Mobile — Phase 7: Auth Release Gate

Status: planned — release review ready

## User-facing outcome

Close the limited Ganatri Admin mobile MVP with a documented review of app identity, authentication, registration, Organization landing, storage boundaries, and focused validation. This gate does not claim native/device release readiness while repository `AGENTS.md` defers those checks.

## Release scope

- Android-first `apps/admin-mobile` with display name `Ganatri Admin` and package `in.ganatri.admin`.
- Password and WhatsApp OTP login.
- Four-step registration with WhatsApp OTP verification.
- Admin JWT persistence in the dedicated Keychain namespace.
- Session bootstrap, rejected-session cleanup, logout, and protected/public navigation.
- Zero/one/multiple Organization landing with setup, picker, and bounded workspace destination.
- English-only auth UI and no SMS/email fallback.

## Subphase map

| Subphase | Scope | Exit condition |
| --- | --- | --- |
| 7.1 Full static and focused validation | Run the complete allowed Admin mobile suite, typecheck, diff checks, package/identity review, and boundary scans. | All allowed checks pass or are explicitly baselined; no scope/security boundary finding remains. |
| 7.2 Release review and documentation | Review all Admin mobile commits against the approved spec, record deferred native gates and exact commit chain, and close the MVP status. | Release gate is complete with honest follow-ups and a clean worktree. |

## 7.1 plan — Full static and focused validation

### Acceptance criteria

- Admin mobile typecheck passes.
- All app-owned focused tests pass.
- `git diff --check` passes and the intended worktree is clean.
- Expo identity, Android package, Admin API configuration, secure storage, and shared-service boundaries match the approved plan.
- No POS Device Login, POS storage, Owner User authentication, browser API, alternate OTP channel, or business module scope enters Admin mobile.

### Non-goals and validation boundary

- Do not run Android builds, emulator/device commands, or runtime startup while the repository mobile validation rule remains active.
- Do not push or publish.
- Do not alter backend/shared contracts during release review.

## 7.2 plan — Release review and documentation

### Acceptance criteria

- Phase 0–7 status and phase artifacts accurately identify completed work and follow-ups.
- Standards and spec reviews are recorded separately.
- The final report lists commit IDs, randomized commit timestamps, checks, deferred native gates, and remote state.
- No unrelated files are staged or modified.

## Phase completion gate

Phase 7 completes when the limited Admin mobile MVP passes all allowed static/focused checks, the approved scope is reviewed cleanly, the deferred native validation is documented, and the worktree is clean. This is not a claim of Android build or device readiness.
