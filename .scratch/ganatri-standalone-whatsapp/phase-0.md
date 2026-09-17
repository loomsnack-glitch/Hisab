# Standalone Ganatri WhatsApp — Phase 0

Status: Completed
Phase: 0 — Baseline and contract lock
Completed: 2026-09-17

## Outcome

The approved sender, Store policy, entitlement, template, route, migration,
and security boundaries are recorded before implementation begins.

## Subphase map

| Subphase | Outcome | Depends on | Evidence | Commit |
| --- | --- | --- | --- | --- |
| 0.1 | Source and route inventory | Approved spec | Admin/POS/backend route inventory recorded | Docs-only; no commit yet |
| 0.2 | Database and migration baseline | 0.1 | 148 applied, 0 pending; aggregate WhatsApp inventory recorded | Docs-only; no commit yet |
| 0.3 | Product contract lock | 0.1, 0.2 | Approved decision register D01–D32 | Docs-only; no commit yet |
| 0.4 | Phase-loop execution setup | 0.3 | Status tracker and phase records created | Docs-only; no commit yet |

## Findings

- The detailed baseline evidence is recorded in `spec.md` under Phase 0.
- The development database was migrated with the user's explicit approval.
- The Ganatri platform sender is allowed as a platform-level outbound utility
  exception and is not an Organization-owned Store assignment.
- Existing Baileys data remains historical and is not part of new work.
- The current implementation still needs a platform sender representation in
  the outbox schema and safe hidden-reply storage semantics before Phase 3.

## Verification

- Source inventory completed against the current branch and fixed point.
- Aggregate development database inventory completed without exposing secrets.
- `dbmate status` verified 148 applied migrations and 0 pending migrations.
- The pending WhatsApp phone-status migration was applied successfully.
- `git diff --check` passed for the planning worktree.

## Exit gate

Complete for planning. No application code was changed. The implementation
loop starts with Phase 1 after the phase plan is reviewed.
