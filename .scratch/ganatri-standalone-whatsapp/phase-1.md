# Ganatri WhatsApp — Phase 1

Status: Phase 1.1 phase review complete — commit gate pending
Phase: 1 — Integrated Admin and Store Console foundation

## Outcome

Add the WhatsApp feature to the existing user-authenticated Admin application.
Admin owns Organization-wide management; its Store Workspace provides the
Store Console surface and operates only within the selected Store. No new
WhatsApp frontend, deployment, port, manifest, or authentication boundary is
created.

## Scope guardrails

Included: existing Admin WhatsApp workspace and the Store Console surface
implemented by Admin's Store Workspace WhatsApp panel,
shared UI primitives, existing user authentication/API clients, Organization
and Store context, scoped navigation, loading/empty/error/unauthorized states,
and safe route boundaries.

Excluded: new app package, new frontend origin, new authentication system,
sender configuration, Meta onboarding, template mutation, sending, inbox,
promotions, database policy changes, and POS authentication changes.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 1.1 | Integrated feature boundary and navigation | Phase 0 | Admin workspace and Store Workspace WhatsApp entry are identified and scoped |
| 1.2 | Existing auth and API boundary | 1.1 | Existing user session/API clients are reused without POS auth |
| 1.3 | Organization/Store scoped UI shell | 1.2 | Admin and Store Workspace context survives refresh and scope is enforced |
| 1.4 | Foundation verification and review | 1.1–1.3 | Focused tests, typecheck, build, diff review, status update, commit |

## 1.1 Subphase plan — integrated feature boundary and navigation

Status: Plan reviewed; existing boundary validated; commit intentionally pending

### User-facing outcome

Users find WhatsApp in the existing Admin application. Admin opens the
Organization-wide WhatsApp workspace, and its Store Workspace opens a
Store-scoped WhatsApp panel. Both use the existing shell and session. This
boundary already exists in the current codebase and is validated in this
subphase; no duplicate surface is added.

### Scope

- Verify the current Admin WhatsApp route/page boundary.
- Verify the Store Console surface implemented by Admin's Store Workspace
  WhatsApp entry and panel at the existing Store-scoped route boundary.
- Reuse existing Admin and Store Workspace navigation, layout, theme, and UI
  primitives.
- Keep Organization and Store context visible in every WhatsApp surface.
- Preserve existing non-mutating and already-supported states; later policy,
  template, and delivery changes remain outside this subphase.

### Non-goals

- No `apps/whatsapp` package or standalone app shell.
- No separate Vite port, manifest, deployment origin, or API client.
- No login/logout implementation; existing application sessions are reused in
  subphase 1.2.
- No backend, database, migration, provider, sender, template, or outbox code.
- No POS route or device-authentication changes.

### Dependencies and seams

- Existing `apps/admin` WhatsApp workspace and Admin shell.
- Admin's existing Store Workspace shell and Store-scoped routing (the current
  Store Console surface).
- `apps/console` remains the Platform Administrator inspection console and is
  not a tenant WhatsApp management surface.
- Shared `@repo/ui` styles, components, semantic tokens, and theme provider.
- Existing user-authenticated API client and backend tenant routes.
- Store context from the existing Admin Store Workspace session/route.

### Internal review

- Admin is the only Organization-wide management surface.
- The Store Workspace is a projection of the selected Store and never becomes
  a cross-Store management surface.
- Both surfaces reuse existing authentication and API boundaries.
- POS remains device-authenticated and is not used as a user-authenticated
  WhatsApp management surface.
- No new product, public API, database, or deployment decision is introduced.

### Verification plan

- Inspect Admin route ownership and confirm that the Store Console surface is
  Admin's Store Workspace, not Platform Administrator `apps/console`.
- Run focused Admin checks covering Organization WhatsApp and Store Workspace
  WhatsApp behavior.
- Verify the existing WhatsApp entries render in their existing shells.
- Check Organization/Store context, light/dark theme, responsive layout, and
  loading/empty/error/permission states.
- Run `git diff --check` and inspect staged scope before commit.

### Rollback

Revert only the current Admin/Store Workspace WhatsApp changes. Do not touch
backend, POS, database, migrations, or unrelated Admin-mobile work.

## Public seams

- Admin accepts the existing user-authenticated Organization session.
- The Store Workspace accepts its existing user-authenticated Store scope.
- POS accepts only Device Authentication.
- Shared backend/API contracts are reused before adding focused WhatsApp
  extensions in later phases.
- Shared UI primitives and semantic tokens are preferred over new components.

## Acceptance criteria

- No new `apps/whatsapp` package exists after this reset.
- Admin has the Organization-wide WhatsApp entry and its Store Workspace has a
  Store-scoped WhatsApp entry.
- Admin can represent Organization/Store context without leaking credentials.
- The Store Workspace cannot display or mutate another Store's WhatsApp data.
- Existing user authentication is reused; POS device authentication is not
  accepted by Admin or its Store Workspace.
- Phase 1 introduces no WhatsApp provider call or data mutation.

## Phase 1.1 review result

- Standards review: passed for the Phase 1.1 boundary. The existing Admin
  route, Store Workspace route, navigation, shared UI, and session boundaries
  are reused without creating a parallel app or touching Platform Console.
- Specification review: passed. Admin owns Organization-wide WhatsApp and the
  Store Workspace exposes only the selected Store's WhatsApp state; POS and
  backend/provider behavior remain outside this slice.
- Existing focused coverage passed: 38 tests across Admin navigation,
  Organization WhatsApp, and Store Workspace WhatsApp route/panel behavior.
- Admin build passed. Full Admin typecheck and lint remain blocked by existing
  unrelated baseline errors, including known errors in broader catalog,
  customer, invoice, report, vendor, and WhatsApp component typing/lint paths;
  no source file was changed in this subphase to mask those failures.
- Browser visual verification was not available in this session; it remains a
  release follow-up rather than a reason to add a new app.
- Commit is intentionally pending at the requested phase-review gate. Phase
  1.2 must not start until the commit gate is resumed.

## Phase 1 review boundary

This phase creates the integrated application boundary only. Sender policy,
Customer associations, platform utility delivery, Cloud onboarding, template
lifecycle, and bill/due delivery remain in later phases.

The former uncommitted standalone app shell was removed when the product
direction changed. Phase 1 must restart at subphase 1.1 using the existing
Admin application and its Store Workspace.

## Verification

- Focused Admin typecheck, tests, lint, and build covering both workspaces.
- Route and scope boundary tests.
- Existing user session/API boundary checks.
- Light/dark, responsive, accessibility, loading, empty, and error checks.
- `git diff --check` and staged-scope review.
