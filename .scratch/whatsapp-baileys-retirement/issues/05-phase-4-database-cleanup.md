# Phase 4 — Database cleanup only when safe

Status: skipped by safety gate

Type: migration

## Objective

Remove obsolete database defaults, enum values, or columns only when historical data and foreign-key dependencies are proven safe.

## Acceptance criteria

- A backup/export and exact target database are recorded.
- No historical WhatsApp record is deleted.
- Provider enum/default cleanup is migration-safe and reversible where practical.
- Existing Cloud API rows and foreign keys remain valid.
- Migration is applied and verified against the intended database; pending status is recorded.

## Gate

This phase is skipped if the safest choice is to retain a legacy enum value for historical rows.

## Decision

No migration is added or applied. The configured database connection closed
before the read-only inventory returned rows, so the historical `baileys`
provider enum value and related status vocabulary are retained for compatibility.
No historical records are deleted.
