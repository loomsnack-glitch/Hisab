# Ganatri WhatsApp — Phase 7

Status: Not started
Phase: 7 — Migration and integrated cutover

## Outcome

Move existing assignments and links into the integrated Admin and Store
Console feature without activating Stores unexpectedly or crossing
Admin/Store Console/POS authentication boundaries.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 7.1 | Existing data dry run | Phase 6 | Counts and conflicts recorded before writes |
| 7.2 | Policy record migration | 7.1 | Existing Cloud links preserved; others disabled |
| 7.3 | Admin/Store Console feature cutover | 7.2 | Integrated WhatsApp routes and Store scope are enabled safely |
| 7.4 | POS route retirement and rollback review | 7.2, 7.3 | POS auth remains isolated; cutover reversible |

## Migration rules

- Existing Organization Cloud assignments become `organization_cloud`.
- Stores without an assignment become `disabled`.
- Ganatri Utility is never enabled implicitly.
- Stores with multiple existing Organization-owned phone assignments must be
  reported and quarantined or abort the migration; never choose silently.
- Existing shared number assignments are preserved and receive a deterministic
  default inbound Store.
- Historical accounts, submissions, bindings, messages, provider events, and
  outbox records are retained.

## Route rules

- Admin WhatsApp routes remain in Admin with safe Organization, Store, and tab
  context.
- Store Console receives only the selected Store's WhatsApp feature.
- POS `/whatsapp` redirects to POS home and must not cross into Admin or Store
  Console user-authenticated routes.
- POS keeps bill/due action/status behavior; only the conversation route is
  removed from the POS navigation.

## Verification

- Read-only dry-run counts before migration.
- Before/after assignment and outbox-reference checks.
- No Store has more than one linked Organization-owned phone.
- Existing shared Organization-owned number assignments are preserved.
- Every shared number has one valid default inbound Store.
- Rollback and repeated-migration idempotency.
- Browser checks with Admin, Store Console, and POS sessions open concurrently.
- No device secret, user token, or WhatsApp credential appears in route state,
  links, or client-visible configuration.
