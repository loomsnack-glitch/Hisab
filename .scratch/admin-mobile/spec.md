# Ganatri Admin Mobile App

Status: Phase 7 MVP complete with native validation follow-up

## Objective

Create a new independent Android-first mobile application for Ganatri Admin users. The app will use the visual language of the Ganatri Admin web portal while providing a native mobile experience. The first release is limited to reliable app setup, user authentication, registration, session restoration, and logout.

This is a new application. It must not replace or rename `apps/mobile` (Ganatri POS) and must not turn `apps/admin` into a mobile app.

## Product boundary

- Ganatri Admin Mobile is for authenticated Organization administrators.
- Ganatri POS remains the Store Device-authenticated billing application.
- Ganatri Console remains the internal Platform Administrator application.
- Admin mobile must not use POS Device Login, POS session state, or POS billing writes.
- The workspace is `apps/admin-mobile`.
- The Android identity is display name `Ganatri Admin` and package `in.ganatri.admin`.
- First platform: Android. iOS is deferred until the mobile foundation is stable.

## Initial scope

### Included

- Expo and React Native application foundation.
- TypeScript, navigation, safe-area handling, shared API/services/types, and mobile configuration.
- Web-portal-aligned auth visual system adapted for native screens.
- User session bootstrap and secure session persistence.
- Password login.
- WhatsApp OTP login and OTP resend.
- Four-step registration: phone, profile, password, and OTP verification.
- Logout, expired-session handling, loading states, and recoverable API errors.
- Authenticated landing behavior for zero, one, and multiple Organizations.
- Focused behavior tests and type validation.

### Excluded

- POS Device Login or billing.
- Product catalog, sales, payments, reports, customers, tables, KOT, printer, or WhatsApp inbox workflows.
- Full Admin dashboard implementation.
- Backend schema or authentication-contract changes unless the contract audit proves one is required and it is separately approved.
- Production deployment, store publishing, and release automation.

## Proposed technology baseline

Reuse the stable mobile conventions from `apps/mobile` without copying POS business logic:

- Expo and React Native.
- React Navigation with a root public/protected navigator.
- TanStack Query for server state and authentication bootstrap.
- Zustand only for small client state such as the current authenticated user.
- React Hook Form and Zod for form state and validation.
- `@repo/services` and `@repo/types` for the shared API boundary.
- Uniwind and mobile-owned semantic tokens for the web portal visual language.
- `react-native-safe-area-context` and `react-native-screens` for native navigation layout.
- Secure native storage for authentication material; ordinary preferences must remain separate from credentials.
- Existing localization infrastructure only if required by the Admin product decision; no POS-specific translations or workflows.

Do not add Redux, a second navigation system, a second UI kit, or a custom authentication client.

## Authentication contract

The app will audit and then reuse the existing user-authenticated contract:

- `GET /auth` restores the current user session.
- `POST /auth/login` supports password, OTP request, and OTP verification request types.
- `POST /auth/register` supports registration and OTP verification request types.
- `POST /auth/logout` ends the user session.
- Registration currently creates a User session only; it does not create an Organization.
- After registration, zero Organizations will open first-Organization setup; one Organization will open directly; multiple Organizations will open the Organization picker.
- Current OTP delivery is WhatsApp-only with a five-minute expiry; SMS and email fallback are not part of the existing auth contract.
- The first auth release will use WhatsApp-only OTP; delivery failure will show a retryable error rather than switching channels.
- The first Admin mobile auth release will use English UI; Gujarati and Hindi remain a later localization scope.
- The Admin JWT will be stored with `react-native-keychain` in a dedicated service/account namespace; MMKV is reserved for non-sensitive preferences.
- POS Device credentials and POS session records must never be reused by Admin mobile.
- Admin mobile will persist a separate non-secret Admin installation ID and send it as `X-Device-Id` for OTP request/verification correlation; this identifier is not a POS Device credential or POS session.
- Registration and login validation remain aligned with the shared Zod schemas.
- The mobile API base URL is configured through the Expo public environment boundary.
- Authentication headers/storage must be isolated from POS Device authentication.

## Phase roadmap

| Phase | Outcome | Exit condition |
| --- | --- | --- |
| 0. Planning and boundary | Confirm app identity, scope, dependencies, auth contract, and organization landing decision | Approved spec, phase map, and open decisions recorded |
| 1. New app foundation | New Admin mobile shell exists independently from POS | App starts through the intended root navigator with shared packages wired |
| 2. Auth UI foundation | Reusable native auth components match the Admin web visual language | Auth shell, fields, OTP, buttons, errors, and loading states are usable |
| 3. Auth infrastructure | Session lifecycle is safe and predictable | Bootstrap, persistence, logout, expiry, and protected navigation pass tests |
| 4. Login | Existing Admin user can sign in | Password and OTP paths pass focused behavior checks |
| 5. Registration | New Admin user can register | Four-step registration and OTP paths pass focused behavior checks |
| 6. Organization landing | Authenticated user reaches the correct first destination | Zero/one/multiple Organization behavior is approved and implemented |
| 7. Auth release gate | The limited MVP is reviewed and documented | Focused checks pass, scope is clean, and the phase commits are recorded |

## Open decisions

There are no remaining product decisions for the limited auth MVP. Keychain accessibility/security options are implementation-time validation gates.
