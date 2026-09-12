# Ganatri Admin Mobile — Planning Status

Status: Phase 2 completed with follow-up — Phase 3 ready

Last updated: 2026-09-12

## Scope

Create a new Android-first Ganatri Admin mobile app with the Admin web portal's visual language. The initial implementation is limited to app setup, user authentication, registration, OTP, session restoration, logout, and the first authenticated destination.

## Boundaries

- New app: approved `apps/admin-mobile`.
- Existing `apps/mobile`: Ganatri POS; paused redesign and POS Device authentication remain untouched.
- Existing `apps/admin`: Ganatri Admin web portal; visual and contract reference only.
- Ganatri Console: separate Platform Administrator application; not part of this effort.

## Phase tracker

| Phase | Status | Notes |
| --- | --- | --- |
| 0. Planning and boundary | Approved | Identity, platform, post-registration flow, WhatsApp OTP, English-only auth, and secure storage are approved. |
| 1. New app foundation | Completed with follow-up | New isolated shell and workspace wiring implemented; focused type validation passed; native runtime/build validation remains pending. |
| 2. Auth UI foundation | Completed with follow-up | Shell, controls, feedback, and static login/registration compositions are committed; native runtime validation remains pending. |
| 3. Auth infrastructure | Ready | Phase 2 UI seams are ready; storage boundary is approved. |
| 4. Login | Not started | Depends on Phase 2 and 3. |
| 5. Registration | Not started | Depends on Phase 2 and 3. |
| 6. Organization landing | Not started | Post-registration behavior is approved; implementation follows auth foundation. |
| 7. Auth release gate | Not started | Depends on all previous phases. |

## Current decision gates

None for the limited auth MVP. Keychain security options and any discovered API incompatibility are implementation-time validation gates.

## Contract finding

The backend creates only the User during registration. The web Admin routes users without an Organization to the Organization picker, which also supports creating an Organization.

Approved post-registration behavior: zero Organizations open first-Organization setup; one Organization opens directly; multiple Organizations open the Organization picker.

## Storage finding

The shared auth-token boundary accepts an async storage adapter. POS uses encrypted MMKV with a Keychain/Android Keystore-protected key plus POS Device session data. Admin should use a separate secure Keychain namespace for its User JWT and must not reuse POS session storage.

Approved session storage: Admin JWT in a dedicated `react-native-keychain` service/account namespace; MMKV is reserved for non-sensitive preferences and POS storage is not reused.

## Review follow-up resolved

Admin mobile uses a separate stable installation ID as the shared API's `X-Device-Id` correlation header for login/registration OTP requests. It is not a POS Device credential, POS session, or authorization grant.

The native UI source of truth is recorded in Phase 0: Admin web AuthShell, auth CSS, phone/OTP fields, login page, and registration page.

## Verification policy

No builds, emulator/device commands, or runtime startup checks were run for this planning checkpoint. Implementation phases will use focused tests and type checks first; native/device verification will be reported separately when authorized and available.
