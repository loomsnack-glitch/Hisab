# WhatsApp Cloud API Phase 3A: Embedded Signup onboarding research

Date: 2026-08-21

Status: implemented security/provisioning contract; live onboarding gate open.

Canonical status: [Cloud API migration plan](../development/2026-08-20-whatsapp-cloud-api-only-migration-plan.md)

## Decision

Build the onboarding security and provisioning contract before connecting the
frontend to Meta's JavaScript SDK or making live Graph calls. The contract
must bind a short-lived authorization state to one authenticated Organization
administrator, prevent replay or tampering, and make each external provisioning
step resumable and idempotent.

The implemented contract does not store a Meta access token, call Meta,
or mark an account connected. Those actions require the credential-management
seam and configured Meta App from the readiness gates. A successful embedded
flow is only considered connected after all required external identifiers and
subscriptions have been persisted.

## Provider contract

Meta's Embedded Signup guidance starts the flow with the Facebook JavaScript
SDK and Facebook Login, then requires secured HTTPS endpoints to finish the
integration. The documented follow-up operations include fetching the shared
WABA, adding the provider's system user, registering the phone number, and
subscribing the App to the WABA. Template discovery happens after onboarding.

Sources:

- [Meta Embedded Signup collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)
- [Meta Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)

The Embedded Signup collection also documents credit-line sharing as a separate
partner-billing flow. Hisab's current decision is customer-owned Meta billing,
so credit-line attachment is explicitly outside this slice.

## Security rules

1. Generate an opaque, signed state containing only the Organization, initiating
   user, issued-at, expiry, and one-time nonce. Never put an access token or
   provider payload in the state.
2. Verify signature, audience, expiry, and expected Organization/user before
   accepting the frontend result. Use constant-time signature comparison.
3. Treat state as one-time at the persistence boundary. A valid signature alone
   does not authorize a second completion attempt.
4. Keep provider error details bounded and safe. Do not log authorization codes,
   access tokens, phone numbers, message bodies, or Graph responses.
5. Keep the provisioning step order explicit. A retry may repeat the current
   step or resume after completed steps, but it cannot skip a step or move a
   completed attempt backwards.

## Phase 3A boundary

This slice implements:

- signed onboarding-state creation and verification;
- deterministic provisioning-step ordering;
- idempotent step completion, resumable failure, cancellation, and safe error
  transitions;
- fixture tests for tampering, expiry, audience binding, replay boundary, and
  invalid step transitions.

It does not implement:

- Facebook SDK/UI configuration or live Embedded Signup callbacks;
- code/token exchange, credential encryption, or secret-manager integration;
- WABA/system-user/phone registration Graph calls;
- database repositories, migrations, Store assignment, or connected-account
  UI.

## Verification

The state and transition modules are pure and deterministic when their
clock/random/signing dependencies are injected. Focused tests cover the
security and transition branches. The repository-wide test gate is not green
after the main merge. No local test can prove real Embedded Signup, Meta permission,
phone eligibility, webhook subscription, or billing behavior without a
controlled Meta test App/WABA.
