# Ganatri WhatsApp — Phase 1

Status: Reset to integrated Admin/Store Console plan; implementation not started
Phase: 1 — Integrated Admin and Store Console foundation

## Outcome

Add the WhatsApp feature to the existing user-authenticated Admin and Store
Console applications. Admin owns Organization-wide management; Store Console
shows and operates only within the selected Store. No new WhatsApp frontend,
deployment, port, manifest, or authentication boundary is created.

## Scope guardrails

Included: existing Admin WhatsApp workspace, Store Console WhatsApp panel,
shared UI primitives, existing user authentication/API clients, Organization
and Store context, scoped navigation, loading/empty/error/unauthorized states,
and safe route boundaries.

Excluded: new app package, new frontend origin, new authentication system,
sender configuration, Meta onboarding, template mutation, sending, inbox,
promotions, database policy changes, and POS authentication changes.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 1.1 | Integrated feature boundary and navigation | Phase 0 | Admin workspace and Store Console entry are identified and scoped |
| 1.2 | Existing auth and API boundary | 1.1 | Existing user session/API clients are reused without POS auth |
| 1.3 | Organization/Store scoped UI shell | 1.2 | Admin and Store Console context survives refresh and scope is enforced |
| 1.4 | Foundation verification and review | 1.1–1.3 | Focused tests, typecheck, build, diff review, status update, commit |

## 1.1 Subphase plan — integrated feature boundary and navigation

Status: Plan reviewed; implementation not started

### User-facing outcome

Users find WhatsApp in the existing Admin and Store Console applications. Admin
opens the Organization-wide WhatsApp workspace. Store Console opens a
Store-scoped WhatsApp panel. Both use their existing shells and sessions.

### Scope

- Identify and extend the current Admin WhatsApp route/page boundary.
- Add the Store Console WhatsApp entry and placeholder panel at the existing
  Store-scoped route boundary.
- Reuse existing Admin and Store Console navigation, layout, theme, and UI
  primitives.
- Keep Organization and Store context visible in every WhatsApp surface.
- Add only non-mutating placeholders for later connection, template, policy,
  and delivery states.

### Non-goals

- No `apps/whatsapp` package or standalone app shell.
- No separate Vite port, manifest, deployment origin, or API client.
- No login/logout implementation; existing application sessions are reused in
  subphase 1.2.
- No backend, database, migration, provider, sender, template, or outbox code.
- No POS route or device-authentication changes.

### Dependencies and seams

- Existing `apps/admin` WhatsApp workspace and Admin shell.
- Existing Store Console application shell and Store-scoped routing.
- Shared `@repo/ui` styles, components, semantic tokens, and theme provider.
- Existing user-authenticated API client and backend tenant routes.
- Store context from the existing Store Console session/route.

### Internal review

- Admin is the only Organization-wide management surface.
- Store Console is a projection of the selected Store and never becomes a
  cross-Store management surface.
- Both surfaces reuse existing authentication and API boundaries.
- POS remains device-authenticated and is not used as a user-authenticated
  WhatsApp management surface.
- No new product, public API, database, or deployment decision is introduced.

### Verification plan

- Inspect Admin and Store Console route ownership and navigation scope.
- Run focused Admin and Store Console typechecks, tests, lint, and builds.
- Verify the WhatsApp entries render in their existing shells.
- Check Organization/Store context, light/dark theme, responsive layout, and
  loading/empty/error/permission states.
- Run `git diff --check` and inspect staged scope before commit.

### Rollback

Revert only the current Admin/Store Console WhatsApp changes. Do not touch
backend, POS, database, migrations, or unrelated Admin-mobile work.

## Public seams

- Admin accepts the existing user-authenticated Organization session.
- Store Console accepts its existing user-authenticated Store scope.
- POS accepts only Device Authentication.
- Shared backend/API contracts are reused before adding focused WhatsApp
  extensions in later phases.
- Shared UI primitives and semantic tokens are preferred over new components.

## Acceptance criteria

- No new `apps/whatsapp` package exists after this reset.
- Admin has the Organization-wide WhatsApp entry and Store Console has a
  Store-scoped WhatsApp entry.
- Admin can represent Organization/Store context without leaking credentials.
- Store Console cannot display or mutate another Store's WhatsApp data.
- Existing user authentication is reused; POS device authentication is not
  accepted by Admin or Store Console.
- Phase 1 introduces no WhatsApp provider call or data mutation.

## Phase 1 review boundary

This phase creates the integrated application boundary only. Sender policy,
Customer associations, platform utility delivery, Cloud onboarding, template
lifecycle, and bill/due delivery remain in later phases.

The former uncommitted standalone app shell was removed when the product
direction changed. Phase 1 must restart at subphase 1.1 using the existing
Admin and Store Console applications.

## Verification

- Focused Admin and Store Console typecheck, tests, lint, and build.
- Route and scope boundary tests.
- Existing user session/API boundary checks.
- Light/dark, responsive, accessibility, loading, empty, and error checks.
- `git diff --check` and staged-scope review.
