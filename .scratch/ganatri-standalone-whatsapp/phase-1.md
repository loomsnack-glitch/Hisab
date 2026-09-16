# Standalone Ganatri WhatsApp — Phase 1

Status: Not started
Phase: 1 — Standalone application foundation

## Outcome

Create an independently deployable, user-authenticated WhatsApp application
that can select an Organization and Store but cannot mutate WhatsApp data until
later phases authorize those actions.

## Scope guardrails

Included: app package, identity, API base, login, logout, session bootstrap,
Organization/Store routing, shell, loading, empty, error, and unauthorized
states.

Excluded: sender configuration, Meta onboarding, template mutation, sending,
inbox, promotions, database policy changes, and POS authentication.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 1.1 | App/package boundary and identity | Phase 0 | Independent dev/build entry, title, manifest, and workspace marker |
| 1.2 | User auth and API boundary | 1.1 | Login/logout/bootstrap and same-origin API checks |
| 1.3 | Organization/Store navigation shell | 1.2 | Scoped routes survive refresh and reject unknown scope |
| 1.4 | Foundation verification and review | 1.1–1.3 | Focused tests, typecheck, build, diff review, status update, commit |

## Public seams

- User-authenticated session only; never accept POS Device Authentication.
- Shared `@repo/services` and `@repo/types` before new API contracts.
- App-owned routing and identity; shared UI primitives only where appropriate.
- Same-origin `/api` in production and explicit development proxy configuration.

## Acceptance criteria

- Unauthenticated users reach only login and public error states.
- Valid users can select only Organizations returned for their session.
- Store routes reject an unknown or cross-Organization Store.
- Refresh preserves safe Organization/Store context without credentials in URLs.
- Login, logout, expired session, network failure, and retry states are usable.
- No WhatsApp mutation or provider call occurs in Phase 1.

## Verification

- Standalone app typecheck, focused tests, lint, and build.
- Route/auth boundary tests.
- API base URL and app identity tests.
- `git diff --check` and staged-scope review.

## Risks and rollback

- Do not copy the POS Device session boundary into this app.
- Keep the phase reversible as app-only files and package wiring.
- Stop if an API change is required; record a new contract decision.
