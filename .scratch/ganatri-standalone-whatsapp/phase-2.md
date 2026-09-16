# Standalone Ganatri WhatsApp — Phase 2

Status: Not started
Phase: 2 — Policy and authorization foundation

## Outcome

Persist the Store WhatsApp mode and assignment history, enforce the creator/
administrator boundary, and make entitlement/policy resolution authoritative
for every later sender operation.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 2.1 | Creator/administrator authorization seam | Phase 1 | Unauthorized management actions are denied server-side |
| 2.2 | Store configuration/history schema | 2.1 | One current configuration and mode/sender constraints |
| 2.3 | Policy transitions and entitlement | 2.2 | Atomic enable/disable/switch operations and denial reasons |
| 2.4 | Audit and policy contract review | 2.1–2.3 | Race tests, API tests, status update, focused commit |

## Approved behavior

- `disabled` has no sender and rejects new work.
- `ganatri_utility` references only the Ganatri platform sender.
- `organization_cloud` references a same-Organization Cloud account.
- Both modes require WhatsApp Store Entitlement.
- Only the Organization creator/administrator manages WhatsApp.
- One Organization-owned physical phone can be assigned to one Store.
- Ganatri's platform phone is a platform-level outbound utility exception.

## Acceptance criteria

- A policy read returns mode, sender, entitlement, allowed kinds, and version.
- Policy transitions are atomic, auditable, and concurrency-safe.
- Cross-Organization account/Store references are rejected.
- Historical configurations remain readable.
- Switching never rewrites or reroutes queued messages.

## Verification

- Authorization matrix and cross-tenant tests.
- Database constraint and concurrent transition tests.
- Entitlement allowed/denied tests for both modes.
- Queued sender snapshot invariance test.
- Typecheck, focused backend tests, migration audit, and diff review.
