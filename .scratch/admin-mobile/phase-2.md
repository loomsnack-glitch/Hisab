# Admin Mobile — Phase 2: Auth UI Foundation

Status: subphase 2.1 completed with follow-up — ready for 2.2

## User-facing outcome

Provide a native authentication UI foundation that carries the Ganatri Admin web portal's visual language into Android without importing web-only components or implementing authentication behavior. The phase covers reusable shell, form controls, validation feedback, loading/error presentation, and static login/registration compositions. Network calls, session state, and navigation behavior remain later phases.

## Source of truth

The native adaptation is based on the approved Admin web references:

- `apps/admin/src/components/auth/auth-shell.tsx`
- `apps/admin/src/components/auth/auth.css`
- `apps/admin/src/components/auth/phone-number-field.tsx`
- `apps/admin/src/components/auth/otp-field.tsx`
- `apps/admin/src/pages/login-page.tsx`
- `apps/admin/src/pages/register-page.tsx`

The mobile implementation will preserve the visual hierarchy, Ganatri branding, blue primary action, light/dark surface treatment, rounded form surfaces, OTP/resend presentation, and four-step registration progression while adapting layout and interaction to native Android constraints.

## Subphase map

| Subphase | Scope | Exit condition |
| --- | --- | --- |
| 2.1 Auth shell and visual language | Mobile-owned auth shell, semantic tokens, keyboard-safe layout, brand/header treatment, title/subtitle hierarchy, and step-progress presentation. | A reusable shell renders the approved auth hierarchy and has no API or POS dependency. |
| 2.2 Auth controls and feedback | Phone input, text/password fields, OTP input, buttons, inline validation, retry/resend affordances, loading, and recoverable error states. | Controls expose stable app-owned props and cover the observable auth form states without network behavior. |
| 2.3 Static auth compositions | Login and four-step registration screen compositions using the reusable controls with local-only state transitions and representative states. | Login, OTP verification, registration steps, and error/loading states are visually composed and ready for Phase 3–5 wiring. |

## Subphase 2.1 plan — Auth shell and visual language

### Scope

- Add an app-owned auth component boundary under `apps/admin-mobile/src/components/auth/`.
- Establish mobile semantic auth tokens using the existing Admin palette in `global.css`.
- Build a keyboard-safe, safe-area-aware `AuthShell` for portrait Android screens.
- Add Ganatri brand/header treatment, title/subtitle hierarchy, and optional registration step progress.
- Support light and dark surfaces through semantic classes already available to Uniwind.
- Keep the foundation screen as the temporary host until later auth compositions replace it.

### Acceptance criteria

- The shell accepts app-owned title, subtitle, optional step metadata, and children props.
- Content remains reachable when the Android keyboard is open and respects safe-area insets.
- The layout is usable on narrow portrait screens without relying on web CSS or browser APIs.
- Visual choices trace to the listed Admin web references.
- No login, registration, OTP request, session, organization, or POS behavior is added.
- `apps/admin-mobile` remains independent from `apps/mobile` and `apps/admin` runtime imports.

### Dependencies and public seams

- Phase 1 `SafeAreaProvider`, React Navigation shell, and Uniwind setup.
- `react-native-safe-area-context` for insets.
- The app-owned `AuthShell` is the only public UI seam required by later auth screens.
- No changes to backend, shared services, token storage, or API configuration.

### Verification

- `bun run --cwd apps/admin-mobile check-types`
- `git diff --check`
- Read-only boundary scan confirming no POS imports or browser-only APIs.
- Android build, emulator, device, and runtime visual checks remain deferred under repository `AGENTS.md`.

### Risks and rollback

- Avoid copying web CSS or using browser-only layout/focus behavior.
- Avoid adding a second UI kit or introducing auth behavior early.
- Keep the shell isolated so it can be reverted without affecting the Phase 1 app foundation.

### 2.1 implementation record

Status: completed with follow-up

- Added `apps/admin-mobile/src/components/auth/auth-shell.tsx` as the app-owned native shell seam.
- Added safe-area-aware scrolling and Android keyboard avoidance.
- Added Ganatri Admin brand treatment, title/subtitle hierarchy, semantic light/dark surfaces, and accessible registration progress.
- Updated the foundation screen to host a static auth-shell preview without adding auth behavior.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- `git diff --check` — passed.
- Admin mobile boundary scan for browser APIs, POS imports, and POS session identifiers — passed with no matches.
- Native build, emulator, device, and runtime visual validation remain pending under repository `AGENTS.md`.

Subphase review:

- Standards: shell is app-owned, uses existing React Native/Uniwind/safe-area seams, and contains no browser-only or POS dependency.
- Spec: implementation is limited to the approved visual shell; login, registration, OTP, session, and organization behavior remain excluded.

Next subphase: 2.2 Auth controls and feedback.

## Phase-level non-goals

- API requests or mutations.
- Auth bootstrap, secure-session hydration, logout, or expiry handling.
- Password/OTP/login/registration business behavior.
- Organization setup, picker, or dashboard screens.
- Android build or emulator/device validation.

## Phase completion gate

Phase 2 completes when all three subphases are committed, the reusable auth UI covers the approved login/registration states without business behavior, focused checks pass, and the phase status records any native runtime validation still pending.
