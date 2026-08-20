# WhatsApp Cloud API Phase 3D: exchange and replay orchestration

Date: 2026-08-21

## Question

What should the backend guarantee between receiving the Embedded Signup result
and beginning provider discovery, without consuming a valid onboarding state
when the provider handoff fails?

## Primary source

- [Meta WhatsApp Business Platform Embedded Signup collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)

Meta's official collection says the browser flow is followed by server-side
operations. It documents using the returned OAuth access token with the
`debug_token` endpoint, then retrieving the shared WABA and its phone numbers;
it also documents WABA webhook subscription and phone registration as later
operations. The collection does not provide a repository-ready, fixed
authorization-code exchange contract for this application configuration.

## Current repository constraints

- Phase 3C validates the callback result and binds its signed state to the
  authenticated Organization and administrator.
- Phase 3B stores a hash of the state nonce and exposes an atomic consume
  adapter. The state must remain unconsumed until the provider handoff has
  succeeded.
- The Cloud foundation migration requires a real sender account before a
  provisioning attempt can be persisted. The credential reference is also
  deliberately separate from the raw provider token.
- The existing Graph client can make authenticated Graph requests, but adding
  a token endpoint without the approved Meta App configuration would hard-code
  an unverified provider contract.

## Decision

Add a backend-only exchange port and orchestration function:

1. Verify and normalize the Phase 3C result.
2. Pass the authorization value to an injected provider exchange adapter.
3. Validate that the adapter returned a bounded, non-empty access token.
4. Atomically consume the onboarding state only after the exchange succeeds.
5. Return the verified identifiers and short-lived in-memory handoff to the
   next provisioning layer.

The exchange port owns the provider-specific HTTP details. The orchestration
layer must never log or persist the authorization value or returned token, and
must not mark an account connected. If exchange fails, the replay state stays
available for a controlled retry; if consumption loses a race, the caller gets
a replay-safe failure rather than creating duplicate provisioning work.

## Non-goals and follow-up

This phase does not call Meta, discover WABAs, validate phone ownership,
persist credentials, create WABA/sender/provisioning rows, or assign Stores.
The next phase should implement the approved provider adapter and discovery
fixtures, then create or resume the idempotent provisioning attempt only after
the returned WABA and phone data are verified.
