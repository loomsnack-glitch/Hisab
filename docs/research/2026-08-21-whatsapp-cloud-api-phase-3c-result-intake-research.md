# WhatsApp Cloud API Phase 3C: Embedded Signup result intake

Date: 2026-08-21

## Question

What is the smallest production-safe backend boundary for accepting the
result returned by Meta Embedded Signup before server-side token exchange and
Cloud account provisioning are implemented?

## Primary source

- [Meta WhatsApp Business Platform Embedded Signup collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)

The official collection describes Embedded Signup as a browser flow backed by
the Facebook JavaScript SDK and Facebook Login. It then documents follow-up
server operations for the shared WABA, system-user access, phone registration,
and WABA webhook subscription. It also states that the integration endpoint
must be served over HTTPS.

The important boundary is therefore that a browser callback is input to
server-side provisioning, not proof that a WhatsApp number is connected.

## Current repository constraints

- Phase 3A already provides a signed, short-lived state bound to the
  Organization and initiating administrator.
- Phase 3B persists only a hash of that state and provides the authenticated
  start boundary. It intentionally does not consume the state at launch.
- The Cloud foundation migration requires a real sender account for a
  provisioning attempt. The existing sender account also requires a Store,
  phone number, and normalized phone number. Creating a placeholder account
  from an unverified browser result would weaken those invariants.
- The existing Graph client has read/provisioning primitives, but this phase
  does not yet have a verified server-side authorization-code exchange and must
  not invent one or persist credentials prematurely.

## Decision

Add a strict, typed result-intake boundary with four bounded fields:

- the previously issued `state`;
- the authorization `code` returned to the callback;
- the WABA identifier needed by the documented WABA operations;
- the phone-number identifier needed by the documented phone operations.

The boundary will trim and size-limit values, require numeric Meta identifiers,
reject unknown fields, and verify the state against the authenticated
Organization and user. It will not consume replay state yet: consumption must
happen only after the next phase successfully performs the server-side
exchange, otherwise a transient exchange failure would strand the user.

No access token, authorization code, or raw callback payload will be stored or
logged by this phase. No Graph request, credential persistence, sender-account
creation, Store assignment, or Baileys change belongs here.

## Follow-up phase

The next phase should add the server-side exchange using the approved Meta
configuration, validate the returned WABA/phone ownership, then consume the
state and start the idempotent provisioning attempt only after a real Cloud
sender account can be created. The exchange and provisioning steps should be
covered with provider fixtures and safe error mapping before any live account
is connected.
