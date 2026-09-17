# Ganatri WhatsApp — Phase 2

Status: Not started
Phase: 2 — Policy, authorization, and Customer association foundation

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
| 2.4 | Store-Customer association schema and event seams | 2.1, 2.2 | Migration origin, creation origin, activity source, and timestamps are durable |
| 2.5 | Audit and policy contract review | 2.1–2.4 | Race tests, association tests, API tests, status update, focused commit |

## Approved behavior

- `disabled` has no sender and rejects new work.
- `ganatri_utility` references only the Ganatri platform sender.
- `organization_cloud` references a same-Organization Cloud account.
- Both modes require WhatsApp Store Entitlement.
- Only the Organization creator/administrator manages WhatsApp.
- Each Store has one linked Organization-owned number.
- One Organization-owned number may be linked to multiple Stores.
- Each shared number has one default inbound Store.
- Ganatri's platform phone is a platform-level outbound utility exception.

## Acceptance criteria

- A policy read returns mode, sender, entitlement, allowed kinds, and version.
- Policy transitions are atomic, auditable, and concurrency-safe.
- Cross-Organization account/Store references are rejected.
- Historical configurations remain readable.
- Switching never rewrites or reroutes queued messages.
- Store-Customer associations are unique per Organization, Customer, and Store.
- Association updates retain first-seen, last-activity, and provenance data;
  each qualifying event is also recorded in append-only, idempotently deduped
  activity history.

## Verification

- Authorization matrix and cross-tenant tests.
- Database constraint and concurrent transition tests.
- Entitlement allowed/denied tests for both modes.
- Queued sender snapshot invariance test.
- Customer association creation, migration, repeated-event, source-history, and
  last-activity tests.
- Typecheck, focused backend tests, migration audit, and diff review.
