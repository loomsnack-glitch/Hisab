# 01 — Platform Owner authentication and console entry

**What to build:** Give Ganatri owners a separate, secure path into Ganatri Console at `console.ganatri.in`. An operator can seed the first active Owner User with the password-safe `console:create-owner` CLI command; Owner Users can then sign in with password or WhatsApp OTP to the new console application. The resulting owner session is isolated from customer User and Store Device sessions, and an inactive Owner User loses access on their next request.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A dedicated Owner User identity is persisted separately from customer Users, with unique normalized phone identity, hashed password, active status, and audit timestamps.
- [ ] A secure operator-run seed command creates the first active Seed Owner User without public owner registration or password command-line exposure.
- [ ] Password and WhatsApp OTP owner login establish only an owner-authenticated session; customer and Store Device sessions cannot enter Platform Operations APIs.
- [ ] Every authenticated platform request checks the live Owner User status, and an inactive Owner User is denied on the next request.
- [ ] The new console application presents owner login and an authenticated console entry state with appropriate loading, invalid-credential, and expired-session handling.
- [ ] Tests cover seed safety, credential flows, token isolation, inactive-session revocation, and the user-visible login outcomes.
