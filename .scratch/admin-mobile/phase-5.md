# Admin Mobile — Phase 5: Registration

Status: in progress — subphase 5.1 completed with follow-up; 5.2 next

## User-facing outcome

Allow a new Admin user to create an account through the approved four-step native flow: phone, profile, password, and WhatsApp OTP verification. Registration creates only the User session; Organization setup remains Phase 6.

## Approved contract

- Use the shared `RegisterFormSchema`, `RegisterFormJSON`, and `register` service.
- Registration submits user information first, then verifies a six-digit WhatsApp OTP.
- OTP delivery is WhatsApp-only, expires after five minutes, and can be resent after a separate 30-second cooldown.
- A successful registration response must contain both a user and JWT before the Admin session is persisted.
- The Admin JWT uses the dedicated Keychain adapter and Admin auth store; POS and Owner User storage remain untouched.
- English-only UI; no SMS/email fallback.

## Subphase map

| Subphase | Scope | Exit condition |
| --- | --- | --- |
| 5.1 Registration form flow | Replace the registration preview with shared-form-backed phone, profile, and password steps. | Invalid fields are blocked, valid details reach the registration mutation, and pending/errors are recoverable. |
| 5.2 Registration OTP/session | Add WhatsApp OTP verification, five-minute expiry, resend cooldown, and secure session handoff. | A valid registration OTP creates the Admin session; expired/invalid requests remain recoverable. |
| 5.3 Registration integration review | Review step resets, back navigation, duplicate submissions, response handling, and Phase 4 compatibility. | The complete four-step registration flow passes focused checks and is ready for Organization landing. |

## 5.1 plan — Registration form flow

### Scope

- Use React Hook Form with `zodResolver(RegisterFormSchema)`.
- Preserve the four-step native visual composition and replace only preview state/mutations.
- Validate phone, profile, optional email, password, and confirmation through the shared schema.
- Submit `requestType: "user-info"` through `register` after the password step.
- Keep OTP request/verification, Organization behavior, and dashboard behavior in later subphases.

### Acceptance criteria

- Phone and profile steps cannot advance with invalid shared-schema values.
- Password and confirmation errors are shown without submitting incomplete data.
- Duplicate registration submission is prevented while the service call is pending.
- Service errors remain visible and retryable on the current step.
- A successful response requesting OTP enters step four without authenticating early.

### Dependencies and public seams

- Phase 2 native auth shell, fields, button, feedback, and OTP control.
- Phase 3 Admin auth store and secure storage seam for the later session handoff.
- Phase 4 OTP timing and login response patterns.
- Shared `RegisterFormSchema` and `register` service.

### Verification

- Admin mobile typecheck.
- Focused pure registration response/step tests where behavior can be isolated.
- `git diff --check` and Admin boundary scan.
- No Android build, emulator, device, or runtime-start commands under repository `AGENTS.md`.

### Risks and rollback

- Never persist a password or incomplete session response.
- Do not claim registration completed until the OTP/session response is valid.
- Do not create or infer an Organization from registration.

### 5.1 implementation record

Status: completed with follow-up

- Replaced the registration preview host with a native React Hook Form flow for phone, profile, and password steps.
- Reused `RegisterFormSchema`, `RegisterFormJSON`, and the shared `register` service with pending and recoverable error handling.
- Entered the fourth step only after the backend returned `nextRequestType: "otp-verification"`; no User session is persisted before OTP verification.
- Kept the four-step progress shell and registration-to-login navigation in the Admin mobile boundary.

Verification:

- `bun run --cwd apps/admin-mobile check-types` — passed.
- Focused Admin auth suite — 12 passed.
- `git diff --check` — passed.
- Registration source boundary scan found no POS, Device Login, Owner User, browser, or ordinary-storage dependencies.
- Native build, emulator, device, and runtime validation remain pending under repository `AGENTS.md`.

Subphase review:

- Standards: form state and validation use the existing native/shared seams; no duplicate registration client or secret persistence was introduced.
- Spec: the first three approved registration steps are real, while OTP verification and session handoff remain isolated for 5.2.

Next subphase: 5.2 Registration OTP/session.

## Phase-level non-goals

- Organization setup, selection, or dashboard behavior.
- POS Device Login, Owner User authentication, or POS storage.
- SMS/email OTP fallback.
- Backend/shared contract changes unless a separately approved incompatibility is found.
- Native build, emulator, physical-device, or release validation.

## Phase completion gate

Phase 5 completes when all four registration steps use the shared contract, WhatsApp OTP expiry/resend/session behavior is covered, incomplete registration cannot authenticate, and the committed flow is ready to route into Phase 6 Organization landing.
