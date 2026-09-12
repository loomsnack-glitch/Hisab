# Admin Mobile — Phase 4: Login

Status: completed with follow-up — ready for Phase 5

## User-facing outcome

Allow an existing Ganatri Admin user to sign in from the native app using password login or WhatsApp OTP. The implementation will use the approved Phase 2 controls, Phase 3 session lifecycle, shared Zod schemas, and shared `@repo/services` auth methods.

## Approved contract

- Password and WhatsApp OTP are the two login methods.
- WhatsApp OTP is six digits and expires after five minutes.
- Resend is available after the existing 30-second cooldown; it does not extend the server's five-minute expiry unless a new OTP is requested.
- The Admin JWT is persisted through the dedicated Keychain-backed adapter and handed to the Phase 3 auth store only after a successful response.
- Login failures remain recoverable and must not clear unrelated POS or Owner User state.
- English-only UI; no SMS/email fallback.

## Subphase map

| Subphase | Scope | Exit condition |
| --- | --- | --- |
| 4.1 Password login | Replace the password preview path with React Hook Form, `LoginFormSchema`, shared `userLogin`, loading, validation, service errors, and successful session handoff. | Existing users can complete the password path and reach the Phase 3 protected route after a valid response. |
| 4.2 WhatsApp OTP login | Add OTP request, six-digit verification, resend cooldown, five-minute expiry countdown, expiry error, and successful session handoff. | OTP login handles request, verification, resend, expiry, and recoverable failures without channel fallback. |
| 4.3 Login integration review | Unify method switching, reset stale form state, verify protected/public transitions, and review all login states against the shared contract. | Password and OTP flows pass focused behavior checks and the login phase is ready for registration work. |

## Subphase 4.1 plan — Password login

### Scope

- Add a real Admin login screen using `useForm` and `zodResolver(LoginFormSchema)`.
- Submit `requestType: "user-info"` through the shared `userLogin` service.
- Present field validation, loading, recoverable service errors, and missing-session-response errors.
- Persist a returned JWT through `setAuthToken`, update the Admin auth store, and seed the Admin auth query cache.
- Keep registration and OTP behavior in their later subphases.

### Acceptance criteria

- Invalid phone/password input is blocked by the shared Zod schema.
- Duplicate submission is prevented while login is pending.
- A successful response containing both user and token enters the Phase 3 protected route.
- Error responses leave the user on the login screen with a retryable message.
- A success response without a user/token is treated as an invalid session response and does not enter protected navigation.
- No POS, Device Login, Owner User, registration, or OTP behavior is added in 4.1.

### Dependencies and public seams

- Phase 2 `AuthShell`, `AuthField`, `PhoneNumberField`, `AuthButton`, and `AuthFeedback`.
- Phase 3 `setAuthenticated`, `adminAuthKeys.me`, and secure token adapter.
- Shared `LoginFormSchema` and `userLogin`.

### Verification

- `bun run --cwd apps/admin-mobile check-types`
- Focused login behavior tests with mocked service/storage seams.
- `git diff --check`
- Read-only scan for correct Admin-only service, store, and storage boundaries.
- No Android build, emulator, device, or runtime-start commands during this phase work.

### Risks and rollback

- Never store the password or JWT in Zustand or ordinary preferences.
- Do not treat a service success without a complete session payload as authenticated.
- Keep the existing Phase 2 preview available until the real login screen is verified.
- The planned five-minute timer belongs to 4.2, not password login.

### 4.1 implementation record

Status: completed with follow-up

- Added the real Admin password-login screen using React Hook Form and `zodResolver(LoginFormSchema)`.
- Wired `userLogin` with validation, pending state, recoverable service errors, and invalid-session-response handling.
- Added a pure login-session response seam that requires both an authenticated user and JWT before protected navigation.
- Persisted the JWT through the Admin secure token adapter, updated the Admin auth store, and seeded `adminAuthKeys.me` on success.
- Replaced the login side of the Phase 2 preview host while keeping registration preview behavior isolated for Phase 5.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- `bun test apps/admin-mobile/src/lib/login-session.test.ts` — 3 passed.
- `git diff --check` — passed.
- Admin login boundary scan found no POS, Device Login, Owner User, browser, or ordinary-storage imports.
- Native build, emulator, device, and runtime validation remain pending under repository `AGENTS.md`.

Subphase review:

- Standards: the screen uses native `View`/controls, shared schemas/services, and the existing Admin auth seams; no browser form or duplicate auth client was introduced.
- Spec: password login is wired without adding OTP, registration, Organization, or dashboard behavior; incomplete session responses cannot authenticate.

Next subphase: 4.2 WhatsApp OTP login.

## Subphase 4.2 plan — WhatsApp OTP login

### Scope

- Extend the real Admin login screen with WhatsApp OTP request and verification.
- Use the shared `LoginFormSchema` and `userLogin` request types for `otp-info` and `otp-verification`.
- Display the backend-approved five-minute OTP expiry countdown.
- Keep the existing 30-second resend cooldown separate from the five-minute expiry window.
- Support expired-code recovery by requesting a new OTP; do not fall back to SMS or email.
- Persist the returned JWT and enter the Phase 3 protected route on successful verification.

### Acceptance criteria

- A valid phone can request a WhatsApp OTP and enter verification state only after the service indicates `otp-verification`.
- OTP input is six digits and is validated by the shared Zod schema before verification.
- The UI displays five minutes from the issued challenge and disables verification after expiry.
- Resend is disabled for 30 seconds, then requests a fresh challenge and resets the five-minute expiry window.
- Expired or invalid OTP errors remain recoverable on the verification screen.
- No SMS/email fallback or POS/Owner User behavior is added.

### Dependencies and public seams

- 4.1 real login screen, session handoff, and Admin auth cache.
- Phase 2 `OtpField`, `AuthButton`, `AuthFeedback`, and `PhoneNumberField`.
- Shared `LoginFormSchema` and `userLogin`.
- A pure OTP timing helper for deterministic expiry/cooldown tests.

### Verification

- `bun run --cwd apps/admin-mobile check-types`
- Focused OTP timing and login-response tests.
- `git diff --check`
- Read-only boundary scan for channel fallback, POS imports, and duplicate auth storage.
- No Android build, emulator, device, or runtime-start commands during this phase work.

### Risks and rollback

- Client countdown is presentation/recovery guidance; server expiry remains authoritative.
- A resend creates a new challenge and must reset both the displayed expiry and resend cooldown.
- Do not retain stale OTP state when switching back to password or changing the phone number.

## Phase-level non-goals

- Registration.
- Organization setup or selection.
- Dashboard/business modules.
- SMS/email OTP fallback.
- Backend or shared auth-contract changes unless a separately approved incompatibility is found.
- Android build, emulator, physical-device, or release validation.

## Subphase 4.2 implementation record

Status: completed with follow-up

- Added WhatsApp OTP request and six-digit verification to the real Admin login screen.
- Added the approved five-minute client countdown and separate 30-second resend cooldown, with deterministic timing helpers.
- Added expired-code recovery, resend reset behavior, recoverable service errors, and method switching that clears stale OTP state.
- Reused the shared `LoginFormSchema`, `userLogin`, secure Admin JWT handoff, auth store, and Admin query cache; no SMS or email fallback was added.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- `bun test apps/admin-mobile/src/lib/login-session.test.ts apps/admin-mobile/src/lib/otp-timing.test.ts` — 5 passed.
- `git diff --check` — passed.
- Admin login boundary scan found no POS, Device Login, Owner User, browser, ordinary-storage, or SMS/email fallback imports.
- Native build, emulator, device, and runtime validation remain pending under repository `AGENTS.md`.

Subphase review:

- Standards: OTP timing is isolated in a pure helper, while screen state uses the existing Admin auth and native UI seams.
- Spec: request, verification, cooldown, expiry, recovery, and successful session handoff are covered without adding registration, Organization, dashboard, or channel fallback behavior.

Next subphase: 4.3 Login integration review.

## Subphase 4.3 implementation record

Status: completed with follow-up

- Reviewed password and WhatsApp OTP method switching, stale OTP reset behavior, protected/public session handoff, and Admin-only storage/service boundaries.
- Confirmed the existing registration preview remains isolated and is not part of the completed login contract.
- Confirmed the five-minute expiry is client-side presentation/recovery guidance only; backend OTP expiry remains authoritative.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- Focused Admin auth suite — 12 passed across bootstrap, auth-state, login-session, and OTP timing tests.
- `git diff --check` — passed.
- Full Admin mobile source boundary scan found no POS session/storage, Device Login, Owner User, browser, SMS, or email-auth behavior in the login implementation. Existing registration-preview email fields remain deferred registration UI.
- Native build, emulator, device, and runtime validation remain pending under repository `AGENTS.md`.

Phase review:

- Standards: the implementation stays within the shared service/schema contracts and existing native Admin seams; timing behavior is pure and deterministic-testable.
- Spec: password and WhatsApp OTP login now cover request, verification, expiry, resend recovery, recoverable errors, and protected-route handoff without expanding into registration or Organization behavior.

Phase 4 is complete with native validation follow-up. Phase 5 registration is next.

## Phase completion gate

Phase 4 completes when password and WhatsApp OTP login are wired to the shared contract, the five-minute OTP expiry and resend behavior are covered, protected/public transitions pass focused checks, and all work is committed with native validation follow-ups documented.
