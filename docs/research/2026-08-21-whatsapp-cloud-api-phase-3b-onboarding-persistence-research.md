# WhatsApp Cloud API Phase 3B: Onboarding Persistence Research

Date: 2026-08-21

Status: implemented onboarding-state persistence boundary; provisioning gate
open.

Canonical status: [Cloud API migration plan](../development/2026-08-20-whatsapp-cloud-api-only-migration-plan.md)

## Question

How should the backend persist the short-lived Embedded Signup state and expose
the first authenticated onboarding boundary without claiming that a WhatsApp
Cloud account is connected?

## Findings

1. Meta's official Embedded Signup material describes a browser-led flow that
   starts with Facebook Login/Embedded Signup and then requires server-side
   follow-up operations such as discovering the shared WABA, assigning the
   system user, registering the phone number, and subscribing the app to the
   WABA webhook. The flow therefore needs a backend boundary between browser
   authorization and provider provisioning.
2. OAuth 2.0 requires the client to use a state value bound to the user-agent
   session and callback, and recommends that the value be non-guessable and
   protected against request forgery. The state must not be treated as proof
   that provider authorization or provisioning completed.
3. Replay prevention is an application concern. A signed token alone is not
   one-time: the backend must make the consume decision atomically against
   durable storage.
4. The current foundation migration creates a provisioning-attempt table whose
   `whatsapp_account_id` is mandatory. At onboarding start there is no Cloud
   sender/account row yet, so creating a provisioning attempt at this point
   would either require an invalid placeholder or incorrectly claim progress.

## Decision

Phase 3B adds a dedicated onboarding-state table and an authenticated start
boundary:

- issue a signed, short-lived state bound to the Organization and initiating
  user;
- store only a SHA-256 hash of the embedded nonce, never the raw signed token;
- consume the nonce through an atomic conditional update that checks expiry and
  unused state;
- keep the state unconsumed until the backend accepts the Embedded Signup result
  in the later exchange/provisioning phase, so a provider callback retry does
  not lose the only usable state before the backend can process it;
- return only the state and expiry from the start endpoint; no provider token,
  WABA ID, phone ID, or credential is accepted or persisted in this phase.

The database record is deliberately separate from `whatsapp_cloud_provisioning_attempts`.
A later exchange/provisioning phase must create a provisioning attempt only
after validated provider data has identified the Cloud account/sender row. The
current code intentionally stops before that operation.

## Security and reliability requirements

- state TTL remains bounded by the Phase 3A pure contract (10 minutes by
  default, 15 minutes maximum);
- nonce hashes are unique and indexed for active-state lookup;
- consumption is an atomic `UPDATE ... WHERE consumed_at IS NULL ... RETURNING`
  operation, so concurrent callbacks cannot both win;
- expired rows are harmless and may be cleaned up by a later bounded job;
- error responses expose safe configuration/authorization messages and never
  include secrets, raw tokens, provider access tokens, or SQL details;
- the phase has no live Meta dependency and does not change the existing
  Baileys worker or account routes.

## Sources

- [Meta WhatsApp Business Platform: Embedded Signup](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)
- [RFC 6749, section 4.1.1 (authorization request)](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1)
- [RFC 6749, section 10.12 (cross-site request forgery)](https://www.rfc-editor.org/rfc/rfc6749#section-10.12)
