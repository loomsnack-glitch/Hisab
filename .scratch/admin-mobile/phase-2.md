# Admin Mobile — Phase 2: Auth UI Foundation

Status: completed with follow-up

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

## Subphase 2.2 plan — Auth controls and feedback

### Scope

- Add app-owned text/password fields, phone-number input, six-digit OTP input, primary/secondary buttons, and inline feedback components.
- Reuse `@repo/types` phone normalization and country metadata so visual controls do not invent an auth contract.
- Cover disabled/loading, validation-error, informational, success, and retryable-error presentation through props only.
- Keep all controls controlled and independent from React Query, auth mutations, session state, and navigation.

### Acceptance criteria

- Each control has a small app-owned prop interface suitable for React Hook Form integration in Phase 2.3 and auth behavior wiring later.
- Phone input emits normalized values and provides a native country-code picker without browser APIs.
- OTP input accepts digits only and caps input at six digits.
- Password input supports an accessible show/hide affordance without exposing the value by default.
- Buttons prevent interaction while disabled or loading and expose accessible states.
- Feedback distinguishes recoverable errors from neutral or success messages.
- No API request, auth mutation, session write, or POS import is added.

### Dependencies and public seams

- Subphase 2.1 `AuthShell` and existing Uniwind semantic Admin tokens.
- `@repo/types` phone helpers and `PHONE_COUNTRIES` metadata.
- Native React Native `TextInput`, `Pressable`, `Modal`, `FlatList`, and `ActivityIndicator`.
- These controls are the reusable seam consumed by static compositions in 2.3.

### Verification

- `bun run --cwd apps/admin-mobile check-types`
- `git diff --check`
- Read-only boundary scan for POS imports and browser-only APIs.
- Android build, emulator, device, and runtime visual checks remain deferred under repository `AGENTS.md`.

### Risks and rollback

- Keep form controls controlled and avoid embedding validation or API behavior that belongs to later phases.
- Keep country selection behavior local to the phone control and preserve the normalized shared value contract.
- Revert only the 2.2 control files if the implementation needs adjustment; leave the committed 2.1 shell checkpoint intact.

### 2.2 implementation record

Status: completed with follow-up

- Added app-owned `AuthField`, `PhoneNumberField`, `OtpField`, `AuthButton`, and `AuthFeedback` components.
- Reused shared phone normalization and country metadata from `@repo/types`.
- Added password visibility, six-digit numeric filtering, native country selection, loading/disabled button states, and error/info/success feedback tones.
- Added Admin auth danger, success, and info semantic tokens to `global.css`.
- Kept all components controlled and independent from API, auth mutations, session state, navigation, and POS storage.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- `git diff --check` — passed.
- Admin mobile boundary scan for browser APIs and POS imports/session identifiers — passed; only the intentional Phase 1 shared storage-provider setup remains.
- Native build, emulator, device, and runtime visual validation remain pending under repository `AGENTS.md`.

Subphase review:

- Standards: controls use app-owned React Native seams, shared type helpers, controlled props, and no second UI kit or browser API.
- Spec: controls cover the planned form, OTP, loading, validation, and recoverable-feedback presentation without implementing auth behavior.

Next subphase: 2.3 Static auth compositions.

## Subphase 2.3 plan — Static auth compositions

### Scope

- Add local-only login and registration preview screens under the app-owned auth screen boundary.
- Compose password login, WhatsApp OTP request/verification, and the four registration steps from the 2.1 shell and 2.2 controls.
- Add local validation, step navigation, retry/resend presentation, and representative feedback states without calling `@repo/services`.
- Make the preview reachable from the existing root navigator so the phase output has an app-owned visual host.

### Acceptance criteria

- Login preview shows phone/password mode, WhatsApp OTP mode, OTP verification, validation errors, and a recoverable informational state.
- Registration preview shows phone, profile, password, and OTP steps with progress metadata and local back/continue transitions.
- Forms use the reusable controls rather than duplicating their visual or input behavior.
- Preview actions never create a session, send an OTP, mutate the backend, or persist data.
- Root navigation remains a single app-owned preview route with no protected/authenticated behavior.
- No POS imports, Device Login, browser APIs, or web-only components are introduced.

### Dependencies and public seams

- Subphase 2.1 `AuthShell` and subphase 2.2 controls.
- Existing Phase 1 root navigator; only the temporary foundation route/component is replaced by the auth preview host.
- React Native local state only; actual auth hooks and mutations belong to Phases 3–5.

### Verification

- `bun run --cwd apps/admin-mobile check-types`
- `git diff --check`
- Read-only boundary scan for POS imports, browser-only APIs, auth service calls, and storage writes.
- Android build, emulator, device, and runtime visual checks remain deferred under repository `AGENTS.md`.

### Risks and rollback

- Keep preview-only copy explicit so it cannot be mistaken for a working auth flow.
- Do not add timers or fake network loading that could obscure later mutation behavior.
- Keep the preview host replaceable when Phase 3 introduces real auth bootstrap and navigation state.

### 2.3 implementation record

Status: completed with follow-up

- Added the local-only `AuthPreviewScreen` host and root navigation route.
- Added password and WhatsApp OTP login previews, including OTP verification, local validation, retry/resend presentation, and explicit preview feedback.
- Added four registration previews: phone, profile, password, and OTP verification, with local back/continue transitions and progress metadata.
- Composed every preview from the reusable 2.1 shell and 2.2 controls.
- Kept all preview actions free of API calls, auth mutations, storage writes, session state, and POS dependencies.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- `bun run --cwd apps/admin-mobile test` — no tests found; UI behavior remains pending native visual validation and later auth behavior tests.
- `git diff --check` — passed.
- Admin mobile boundary scan for browser APIs, POS imports, auth service calls, and storage writes — passed with no matches in the Phase 2 screens/components/navigation.
- Native build, emulator, device, and runtime visual validation remain pending under repository `AGENTS.md`.

Subphase review:

- Standards: preview screens use app-owned React Native components and local state, keep the navigation seam small, and avoid browser/runtime-specific code.
- Spec: the approved login, WhatsApp OTP, registration-step, validation, and feedback states are composed without prematurely implementing authentication behavior.

## Phase 2 completion review

Phase 2 is complete with the native-runtime follow-up. The reusable shell, controls, feedback states, and static login/registration compositions are committed and ready for Phase 3 auth infrastructure wiring.

Phase commits:

- `15251fb feat(admin-mobile): add auth shell foundation`
- `e2d7fad feat(admin-mobile): add auth form controls`
- The current Phase 2.3 commit records the static compositions and this phase completion state.

Deferred validation:

- Android build, emulator, physical-device, and runtime visual validation remain release follow-ups because repository `AGENTS.md` prohibits those commands while planned POS mobile phases remain incomplete.

Next phase: Phase 3 Auth infrastructure.

## Phase-level non-goals

- API requests or mutations.
- Auth bootstrap, secure-session hydration, logout, or expiry handling.
- Password/OTP/login/registration business behavior.
- Organization setup, picker, or dashboard screens.
- Android build or emulator/device validation.

## Phase completion gate

Phase 2 completes when all three subphases are committed, the reusable auth UI covers the approved login/registration states without business behavior, focused checks pass, and the phase status records any native runtime validation still pending.
