# Research: human-readable organization and device login identifiers

**Date:** 2026-07-27
**Status:** Research only; no implementation included
**Question:** Replace POS login by UUID device ID with a human-readable identifier such as `orgusername_something`, while adding an organization username and a device username when devices are created.

## Executive recommendation

Add human-readable login aliases as a new identity layer, but keep the existing UUIDs as internal identities:

```text
organization.username       = acme-retail
store device.username       = counter-1
device.login_identifier     = acme-retail_counter-1
device.id                   = existing UUID, unchanged
```

Recommended rules:

1. Give each organization a canonical, normalized `username`/slug that is globally unique because it appears in the login string.
2. Give each device a separate canonical `username` that is unique within its organization, not merely unique within its store. The current device `name` is a display label and is currently only unique per store, so it should not be reused as the login username.
3. Persist the complete `login_identifier` on `store_devices` (or expose it as a generated value only if the product explicitly wants it to change whenever either component changes). Enforce uniqueness in PostgreSQL, rather than relying only on pre-insert application checks.
4. Authenticate by `login_identifier + device_secret`, then issue a token that continues to identify the device by its stable UUID. Do not put the human-readable identifier in place of the UUID in billing foreign keys or audit columns.
5. Roll out dual login first: accept the new identifier and the old UUID for a bounded migration period. Make the new identifier the only value shown to operators, preserve old UUID links/credentials for existing clients, then remove UUID login only after client and operational evidence supports removal.

The delimiter form requested by the product is viable, but the two component usernames should not contain `_`. A conservative first policy is lowercase ASCII slugs such as `[a-z0-9]+(?:-[a-z0-9]+)*`, with length limits and reserved-word checks. This avoids ambiguity in parsing, case-folding surprises, and visually confusable characters. Display names remain free-form separately.

## What the repository does today

### Two independent authentication channels

Hisab has admin-user auth and POS device auth. The existing architecture intentionally keeps them separate:

- `docs/adr/0002-device-authenticated-billing.md:1` says device ID plus device secret opens an isolated POS session, the JWT identifies the Store Device, and live middleware data supplies organization/store scope.
- `CONTEXT.md:99-105` defines `Store Device` and `Store Device Secret`; `CONTEXT.md:107-109` says a user account alone does not unlock billing.
- `CONTEXT.md:135-137` currently defines POS Device Login as entering a device ID and device secret.
- `CONTEXT.md:243-249` requires admin/POS session isolation and revocation-enforced POS logout.

This request concerns the device/POS login channel. It does not require replacing the admin user's phone login in `apps/backend/src/modules/access-control/auth/auth.service.ts:133-217`.

### Current device login request and token flow

The current path is:

1. `packages/types/src/modules/device-auth/device-auth.schema.ts:10-13` requires `deviceId` to be a UUID and requires `deviceSecret` to be 8–128 characters.
2. `apps/backend/src/modules/access-control/device-auth/device-auth.routes.ts:38-51` validates and sends that payload to the device-auth service.
3. `apps/backend/src/modules/access-control/device-auth/device-auth.service.ts:20-23` signs a 30-day JWT containing `{ deviceId, exp }`.
4. `apps/backend/src/modules/access-control/device-auth/device-auth.service.ts:25-75` looks up the device and encrypted secret by UUID, checks active status, compares the supplied secret with a timing-safe comparison, and returns the session/token.
5. `apps/backend/src/modules/access-control/device-auth/device-auth.service.ts:78-107` verifies the token, reads `decoded.deviceId`, and re-loads the live device session. This is important: revocation/status is not trusted solely from the original login response.
6. `apps/backend/src/middlewares/device-auth.middleware.ts:8-43` loads the authenticated session and calls `touchLastSeen` using `session.device.id`.

The identifier lookup can therefore change at step 4 without changing the downstream session, billing, or revocation model.

### Current database identity and constraints

- PostgreSQL is the database: `apps/backend/src/config/db.ts:4-20` creates a Bun SQL client from `DATABASE_URL`, and `apps/backend/db/schema.sql:1-4` identifies a PostgreSQL dump.
- `organizations` currently contains only UUID `id`, display `name`, creator/update metadata, and timestamps: `apps/backend/db/schema.sql:307-317`.
- `store_devices` currently contains UUID `id`, `store_id`, `organization_id`, display `name`, encrypted/retrievable secret, status, presence, and audit metadata: `apps/backend/db/schema.sql:537-552`.
- UUID `id` is the primary key and the existing device display name is unique only per store: `apps/backend/db/schema.sql:882-903`.
- Billing audit references use device UUIDs through composite foreign keys: `apps/backend/db/schema.sql:1745-1777` and `apps/backend/db/schema.sql:1797-1801`. This is evidence that the UUID must remain the internal/audit identity.
- The original migration calls `device_secret_hash` a hashed credential and gives devices `UNIQUE (store_id, name)`: `apps/backend/db/migrations/20260301111014_create_baseline_tables.sql:45-63`. A later migration renames that column to `device_secret_encrypted` so it can be retrieved: `apps/backend/db/migrations/20260625143000_enable_retrievable_store_device_secrets.sql:1-10`. The checked-in schema reflects the later encrypted form.

### Current organization/device management flow

- The organization API currently accepts only a display name: `packages/types/src/modules/organization/organization.schema.ts:58-64`.
- Device creation currently accepts only display `name` and `deviceSecret`: `packages/types/src/modules/organization/organization.schema.ts:76-85`.
- The web create-device dialog uses those same two fields: `apps/web/src/components/organizations/create-device-dialog.tsx:30-44` and `apps/web/src/components/organizations/create-device-dialog.tsx:122-174`.
- The backend creates a UUID and persists the display name and encrypted secret: `apps/backend/src/modules/tenant/organization/organization.service.ts:358-421`.
- The application checks case-insensitive device-name uniqueness only within a store: `apps/backend/src/modules/tenant/organization/organization.repository.ts:217-235`. Organization names are checked only among organizations created by the same user: `apps/backend/src/modules/tenant/organization/organization.repository.ts:67-89`; the database has no organization-name uniqueness constraint.
- The current admin UI displays/copies the UUID and links POS login with `?deviceId=<uuid>`: `apps/web/src/components/organizations/stores-section.tsx:200-244`.
- The POS login page pre-fills/copies the UUID and validates a UUID input: `apps/web/src/pages/pos-login-page.tsx:23-52`, `apps/web/src/pages/pos-login-page.tsx:128-150`.

## Identifier design options

### Option A — derive the login value from display names

Example: `Acme Retail` + `Counter 1` becomes `acme-retail_counter-1`.

Advantages: minimal data model and easy onboarding. Disadvantages: display-name edits change credentials, two stores in one organization can collide because current device names are only store-scoped, transliteration/case/Unicode rules become authentication behavior, and existing names may need collision suffixes. This is not recommended.

### Option B — separate organization/device usernames and compose a login identifier

Example: organization username `acme-retail`, device username `counter-1`, login identifier `acme-retail_counter-1`.

Advantages: the product can display friendly names while keeping login aliases stable; each component has a clear owner and validation rule; device usernames can be organization-scoped; the complete value is easy for operators to copy. Disadvantages: adds fields, uniqueness rules, rename policy, and migration work. This is recommended.

### Option C — use only one globally unique device login username

Example: `acme-retail_counter-1` is stored as one opaque username; organization username is only a naming convention.

Advantages: the login query is simple and globally unique. Disadvantages: the organization component is not independently managed, and changing an organization username requires a bulk rewrite or leaves a misleading value. This can be an implementation detail of Option B, but it should not be the domain model by itself.

### Option D — organization username plus a generated random device code

Example: `acme-retail_7k4m2p`.

Advantages: avoids collisions and avoids exposing store/device naming. Disadvantages: less human-readable and still needs a copyable code. This is useful if operators do not need to type the device portion, or as a fallback when a requested slug collides.

## Recommended domain model

Keep these concepts separate:

| Concept | Suggested storage | Scope | Mutable? | Purpose |
| --- | --- | --- | --- | --- |
| Organization display name | `organizations.name` | Product-defined | Yes | Human-facing label |
| Organization username | `organizations.username` | Global | Prefer stable; explicit rename flow if allowed | Login namespace component |
| Device display name | `store_devices.name` | Existing store scope | Yes | Human-facing label |
| Device username | `store_devices.username` | Organization | Prefer stable; explicit rename flow if allowed | Login namespace component |
| Device login identifier | `store_devices.login_identifier` | Global | Changes only under explicit credential-rename policy | Exact POS login identifier |
| Device internal ID | `store_devices.id` UUID | Global | No | PK, JWT subject, audit/FK, revocation lookup |

Two policy choices should be decided before implementation:

1. **Rename policy.** The safest first release makes organization/device usernames immutable after creation, with an administrator-driven “regenerate/rename login” operation later. If usernames are editable, the old value should either be permanently reserved or retained as an alias so a renamed terminal does not unexpectedly break an already-configured POS client.
2. **Organization scope.** Because the proposed login is entered without a separate organization selector, organization usernames should be globally unique. Device usernames should be unique within the organization, even though the current display name is only unique within a store.

### Canonicalization

At the API boundary, trim and normalize once, then store the canonical value. Recommended initial policy:

- lowercase ASCII only;
- 3–48 characters for each username, subject to the product’s actual length needs;
- letters and digits, with internal hyphens allowed;
- no leading/trailing hyphen;
- no `_` in either component because `_` is the composition delimiter;
- reject reserved words such as `admin`, `login`, `pos`, `api`, and values that could be confused with support/system identifiers;
- keep display names unchanged and never use a display-name edit as an implicit credential edit.

If product requirements later require Unicode usernames, define normalization and confusable-character handling as a separate decision. It should not be introduced accidentally by a generic “slugify” helper.

### Database enforcement

Use non-null columns once backfill is complete and enforce uniqueness in PostgreSQL. PostgreSQL documents that unique constraints enforce uniqueness for a column or column group and automatically create a unique B-tree index; see [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS). Application pre-checks are still useful for friendly messages, but the database constraint is the race-safe authority.

For case-insensitive identifiers, either store only the canonical lowercase form and use a normal unique constraint, or deliberately use a case-insensitive strategy. PostgreSQL’s [citext documentation](https://www.postgresql.org/docs/current/citext.html) notes that ordinary `UNIQUE` on text is case-sensitive and that `lower()` comparisons need an expression index; canonical lowercase storage is the smaller change for this repository.

A likely final constraint shape is:

```sql
UNIQUE (organizations.username)
UNIQUE (store_devices.organization_id, store_devices.username)
UNIQUE (store_devices.login_identifier)
```

The exact migration should choose names explicitly and should first detect/backfill collisions before adding `NOT NULL`/unique constraints.

## Authentication and token design

The new login request should be conceptually:

```json
{
  "loginIdentifier": "acme-retail_counter-1",
  "deviceSecret": "..."
}
```

The server should canonicalize the identifier, perform one exact lookup, verify status and secret, and then continue to load the live session by UUID. The client should show/copy the login identifier, not the UUID. The organization/store should come from the matched device row, not from client-supplied organization or store IDs.

The UUID should remain the token subject. [RFC 7519 §4.1.2](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.2) defines `sub` as the principal identified by a JWT and requires it to be locally or globally unique in the issuer context; §4.1.4 defines `exp` as the time after which the token must not be accepted. A future token shape could be:

```json
{
  "sub": "<device UUID>",
  "typ": "device",
  "aud": "hisab-pos",
  "exp":  ...
}
```

The current `{ deviceId, exp }` token can remain compatible during the first rollout. Moving from `deviceId` to `sub` is a separate token-contract change and should not be coupled to the username rollout unless there is a concrete reason to do both.

## Migration and backward compatibility

### Existing records

Existing organizations and devices have no username fields. A safe migration sequence is:

1. Add nullable organization/device username and login-identifier columns.
2. Inventory existing organization names and device names, canonicalize candidates, and report collisions before changing login behavior.
3. Backfill organization usernames with deterministic collision handling or an admin-resolution queue. Do not silently choose a different organization for an ambiguous name.
4. Backfill device usernames at organization scope. Existing same-named devices in different stores must receive distinct login usernames or require an explicit resolution.
5. Backfill/persist `login_identifier` and create indexes/constraints after duplicates are resolved.
6. Make the new fields required for new records; make them non-null after all existing rows are resolved.

Do not change existing UUID primary keys, composite foreign keys, sale attribution columns, or device audit history. `apps/backend/db/schema.sql:1745-1777` shows that billing rows depend on the UUID identity.

### Client and API rollout

The repository has multiple UUID surfaces that must be considered together: the login schema (`packages/types/src/modules/device-auth/device-auth.schema.ts:10-13`), the POS page (`apps/web/src/pages/pos-login-page.tsx:23-52`), the admin POS link (`apps/web/src/components/organizations/stores-section.tsx:227-235`), device secret display (`apps/web/src/components/organizations/device-secret-dialog.tsx:84-97`), and service/repository UUID lookups (`apps/backend/src/modules/access-control/device-auth/device-auth.repository.ts:32-69`).

Recommended compatibility phases:

1. **Prepare:** add columns, constraints, canonicalization, lookup tests, collision tooling, and response fields. Keep UUID login working.
2. **Dual login:** accept `loginIdentifier` and legacy `deviceId` in the device-auth endpoint. Normalize both to the same internal device UUID before secret verification. Return the new identifier in the session/onboarding response.
3. **New UI:** replace displayed/copyable UUID login instructions with the new identifier. Keep legacy query links and old stored client credentials working.
4. **Observe and communicate:** measure successful new-vs-legacy logins, failed attempts, unresolved devices, and support incidents. Provide an explicit migration message to old clients rather than treating every UUID as an invalid username.
5. **Retire:** after the supported-client window, remove legacy UUID login only in a separately approved breaking change. Keep UUIDs in admin URLs/internal APIs as appropriate; “replace device-ID login” does not mean “remove device IDs from the system.”

## Security considerations

### A username is an identifier, not a secret

Making the username human-readable improves usability but makes guessing and enumeration easier. [OWASP Authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#user-ids) recommends randomly generated internal user IDs to avoid predictable exposed identifiers, while describing usernames as memorable login identifiers. This supports keeping the UUID internal and treating the new identifier as public/non-secret.

The current service already returns the same `Invalid device credentials` response for a missing device, missing secret, and wrong secret at `apps/backend/src/modules/access-control/device-auth/device-auth.service.ts:28-64`. Preserve that generic behavior for unknown identifier, inactive/revoked device, and wrong secret where practical. OWASP’s [authentication error-message guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-responses) warns that distinct failures can enable account/identifier enumeration.

### Rate limiting is required for the new public identifier

The repository search found no device-login throttling in the device-auth path. Add a design requirement for independent limits by identifier/device and by source IP or equivalent edge identity. OWASP’s [anti-automation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html#rate-limiting-and-quotas) specifically warns that a single bucket keyed only by IP+username allows distributed or multi-username attacks. The newer [NIST SP 800-63B-4](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63b-4.pdf) also requires effective rate limiting for failed authentication attempts in its password-verifier guidance (§3.1.1.2 and §3.2.2; PDF pp. 24–25 and 30–31).

At minimum, the rollout design should include:

- generic failure response and consistent-enough timing;
- per-identifier/device and per-IP throttling;
- audit events for failed and successful device login without logging the secret;
- lockout/recovery behavior that does not let an attacker permanently deny a terminal;
- TLS in deployment and the existing HttpOnly cookie/session protections;
- explicit revocation/status checks on every authenticated request, retaining `apps/backend/src/middlewares/device-auth.middleware.ts:22-33` behavior.

### Secret storage is an existing separate concern

The username change does not fix the current secret-storage tradeoff. The repository intentionally stores an encrypted device secret so an authenticated administrator can reveal it later (`apps/backend/src/modules/tenant/organization/organization.service.ts:505-568` and `apps/web/src/components/organizations/device-secret-dialog.tsx:74-135`). The baseline migration originally described a hash (`apps/backend/db/migrations/20260301111014_create_baseline_tables.sql:45-52`) but the later migration changed the column to encrypted/retrievable form.

If the product requires reveal-after-creation, encryption requires protected key management and careful access auditing. If reveal is not required, the stronger future direction is one-time secret issuance plus salted password-style hashing; NIST SP 800-63B-4 states that password verifiers must store passwords salted and hashed in a form resistant to offline attacks (§3.1.1.2, PDF p. 26). This should be a separate approved security change because it affects onboarding, the reveal endpoint, rotation, and existing devices.

## Testing and acceptance criteria for a future implementation

The implementation should not begin until these behaviors are agreed:

- organization username is required for new organizations and is canonicalized consistently;
- organization username is globally unique, including case variants;
- device username is unique within an organization, including devices in different stores;
- composed login identifier is unique and cannot be ambiguous because of delimiter characters;
- display-name edits do not silently change login credentials;
- new login resolves to the same UUID-backed session and store scope as legacy login;
- inactive/revoked devices cannot log in or continue using an existing session;
- wrong identifier, wrong secret, and unavailable/inactive device do not reveal which part failed;
- existing UUID login remains valid during the compatibility window and can be explicitly disabled later;
- billing audit and foreign-key rows still contain the unchanged device UUID;
- concurrent creation cannot create duplicate identifiers despite application pre-check races;
- tests cover collision backfill, rename policy, case normalization, legacy login, new login, token refresh/authentication, and rate-limit behavior.

## Sources consulted

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) — user IDs/usernames and generic authentication errors.
- [OWASP Bot Management and Anti-Automation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html) — independent login rate-limit buckets.
- [PostgreSQL 18 documentation: constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) — unique constraints, composite uniqueness, and unique indexes.
- [PostgreSQL 17 documentation: `citext`](https://www.postgresql.org/docs/17/citext.html) — case-insensitive comparison and uniqueness tradeoffs.
- [RFC 7519: JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519) — JWT `sub` and `exp` claims.
- [NIST SP 800-63B-4](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63b-4.pdf) — password/secret verification, hashing, and throttling guidance. This July 2025 edition supersedes the older SP 800-63B.
