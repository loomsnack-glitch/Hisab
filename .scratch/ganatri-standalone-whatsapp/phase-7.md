# Standalone Ganatri WhatsApp — Phase 7

Status: Not started
Phase: 7 — Migration and standalone cutover

## Outcome

Move existing assignments and links to the standalone application without
activating Stores unexpectedly or crossing Admin/POS authentication boundaries.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 7.1 | Existing data dry run | Phase 6 | Counts and conflicts recorded before writes |
| 7.2 | Policy record migration | 7.1 | Existing Cloud links preserved; others disabled |
| 7.3 | Admin link cutover | 7.2 | Admin WhatsApp links redirect with safe context |
| 7.4 | POS route retirement and rollback review | 7.2, 7.3 | POS auth remains isolated; cutover reversible |

## Migration rules

- Existing Organization Cloud assignments become `organization_cloud`.
- Stores without an assignment become `disabled`.
- Ganatri Utility is never enabled implicitly.
- Conflicting Organization-owned phone assignments must be reported and
  quarantined or abort the migration; never choose silently.
- Historical accounts, submissions, bindings, messages, provider events, and
  outbox records are retained.

## Route rules

- Admin legacy WhatsApp URLs redirect to the standalone origin with only safe
  Organization, Store, and tab context.
- POS `/whatsapp` must not redirect to the user-authenticated standalone app.
- POS keeps bill/due action/status behavior while the conversation route is
  retired according to the final cutover implementation.

## Verification

- Read-only dry-run counts before migration.
- Before/after assignment and outbox-reference checks.
- Rollback and repeated-migration idempotency.
- Browser checks with Admin and POS sessions open concurrently.
- No device secret, user token, or WhatsApp credential in redirect URLs.
