# Admin Mobile — Phase 0: Planning and Boundary

Status: approved — all Phase 0 product gates resolved; implementation not started

## User-facing outcome

Produce a safe, implementation-ready blueprint for a new Ganatri Admin mobile app whose first usable capability is user registration and login. No application code is changed in this phase.

## Read-only findings

- `apps/mobile` is the existing Ganatri POS mobile app. Its Expo identity is Ganatri POS and its Android package is `in.ganatri.pos`.
- `apps/admin` is the existing Admin web portal and is not a mobile foundation.
- No Admin mobile workspace currently exists.
- The existing mobile app already demonstrates Expo, React Native, React Navigation, TanStack Query, Zustand, React Hook Form, Uniwind, and shared package wiring.
- Shared user auth services already expose authentication, registration, login, and logout methods.
- Shared auth schemas already define the registration steps, password rules, login request types, and six-digit OTP validation.
- The shared mobile API client already supports an Expo public API base URL and React Native authorization headers.
- The backend registration flow creates a User and returns a token; it does not create an Organization.
- The existing web Admin sends an authenticated user without a starred Organization to `/organizations`, where the user can create or select an Organization.
- The shared services package exposes a pluggable async auth-token storage adapter. The POS implementation stores its token in encrypted MMKV with an encryption key protected by Keychain/Android Keystore, alongside POS Device session data.
- Admin needs only the user JWT and must use a separate storage namespace; it must not reuse the POS storage module or persist POS Device identifiers/session records.
- The backend keys login/registration OTPs by `deviceId`. Native requests cannot depend on the browser `deviceId` cookie, so Admin requires a stable, separate installation ID sent as `X-Device-Id` on OTP requests and verification.
- Repository domain documentation separates Ganatri Admin user authentication from Ganatri POS Device authentication and Ganatri Console Owner User authentication.
- The current branch was clean at the start of planning; existing POS work remains preserved and out of scope.

## Approved decision

- New workspace: `apps/admin-mobile`.
- Display name: `Ganatri Admin`.
- Android package: `in.ganatri.admin`.
- First platform: Android; iOS is deferred until the mobile foundation is stable.
- Post-registration: zero Organizations open first-Organization setup; one opens directly; multiple open the Organization picker.
- OTP: WhatsApp-only, six digits, five-minute expiry, retry/resend on delivery failure, with no SMS or email fallback.
- Language: English-only for the first auth release; Gujarati and Hindi are deferred.
- Session storage: Admin JWT in a dedicated `react-native-keychain` service/account namespace; MMKV is reserved for non-sensitive preferences.

## Planned subphases

### 0.1 App identity and workspace boundary

Define the new workspace, Expo slug, display name, Android package, app-owned entry points, and explicit non-overlap with POS and web Admin.

### 0.2 Dependency and foundation audit

Compare the stable POS mobile foundation with the new Admin requirements. Confirm which packages are reused, which are app-owned, and which POS-only packages are excluded.

### 0.3 Authentication contract audit

Trace the shared service methods, schemas, API base URL, token/session persistence, and backend responses needed for user login, registration, OTP, bootstrap, logout, and expiry handling.

### 0.4 Auth UX and organization landing decision

Map native screens and all loading, validation, network, OTP, and session states. Record the approved zero/one/multiple Organization behavior and the separate Admin installation-ID requirement.

## Acceptance criteria

- A separate Admin mobile app boundary is documented.
- POS mobile remains unchanged and retains its device-authenticated boundary.
- The required library baseline is documented with reasons and exclusions.
- The user-authenticated API and storage boundary is documented.
- Login and registration states are mapped as observable behavior.
- Dependencies and implementation order are explicit.
- Open product decisions are listed instead of being guessed.
- No build, emulator, device-start, or POS runtime command is required for this planning checkpoint.

## Non-goals

- Creating `apps/admin-mobile`.
- Installing dependencies.
- Modifying backend or shared packages.
- Implementing screens, navigation, or auth behavior.
- Running an Android build or emulator.
- Starting POS or changing the paused POS redesign.

## Main risks

- Accidentally sharing POS Device authentication with Admin user authentication.
- Selecting a package identity that conflicts with an existing or future Android app.
- Persisting user credentials in ordinary preference storage.
- Assuming registration creates an Organization without backend/product confirmation.
- Reusing web-only UI components directly in React Native.
- Adding overlapping libraries because the POS foundation already contains similar capabilities.

## Resolved contract follow-up

The Admin app will configure the shared `@repo/services` device-ID provider with a dedicated Admin installation ID. It will be persisted independently from the POS storage module and sent only as the request-correlation header required by the existing auth middleware. It does not grant Store Device access and must not be called or treated as a POS Device credential.

## Contract implication for the approved flow

Registration should not promise an Organization dashboard immediately. The current backend contract and web Admin behavior support routing a newly registered user with no Organization to an Organization setup/picker experience. The approved mobile behavior is a dedicated first-Organization setup screen for zero Organizations, direct opening for one Organization, and the Organization picker for multiple Organizations.

## OTP delivery finding

- Current login and registration OTP requests are delivered through WhatsApp only.
- OTP records expire after five minutes.
- Development mode uses the fixed OTP `123123`; production generates a random six-digit OTP.
- No SMS fallback is part of the current auth contract.
- Email notification helpers exist elsewhere, but the current auth flow does not use email as an OTP fallback.

## Session storage recommendation

Use `react-native-keychain` directly for the Admin JWT with a dedicated service/account namespace. Use MMKV only for non-sensitive Admin preferences. This is the smallest secure boundary for an app that has no POS Device session, avoids mixing trust domains, and fits the shared async auth-token adapter. The exact Keychain accessibility/security options will be validated during implementation.

## UI source of truth

The native auth UI will be adapted from these existing Admin web references:

- `apps/admin/src/components/auth/auth-shell.tsx` — shell composition, branding, responsive hierarchy, theme treatment, and auth artwork intent.
- `apps/admin/src/components/auth/auth.css` — auth-specific visual rules.
- `apps/admin/src/components/auth/phone-number-field.tsx` — phone field behavior and validation presentation.
- `apps/admin/src/components/auth/otp-field.tsx` — OTP input behavior and resend presentation.
- `apps/admin/src/pages/login-page.tsx` — password/OTP login states and service payloads.
- `apps/admin/src/pages/register-page.tsx` — four-step registration states and service payloads.

React Native will reuse the visual decisions and shared auth contract, not import web-only components directly.

## Phase 0 exit review

- Scope is limited to a new Admin mobile app foundation and authentication.
- App identity, Android-first platform, post-registration behavior, OTP channel, language scope, and storage boundary are approved.
- POS mobile, web Admin, backend behavior, and shared contracts remain outside implementation changes unless a separately approved incompatibility is found.
- Phase 1 may begin with its own subphase plan and commit boundary.

## Next gate

Phase 0 is approved. Phase 1 can begin with a reviewed plan for creating the new app foundation in an isolated workspace.
