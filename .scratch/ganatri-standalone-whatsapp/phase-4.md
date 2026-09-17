# Ganatri WhatsApp — Phase 4

Status: Not started
Phase: 4 — Organization Cloud connection

## Outcome

Allow the Organization creator to connect its own Meta Cloud WABA/phone using
Embedded Signup, with encrypted credentials and resumable provisioning.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 4.1 | Embedded Signup client flow | Phase 2, Phase 1 | Signed state and safe completion result |
| 4.2 | Server exchange and provisioning | 4.1 | Validated WABA/phone and encrypted credential binding |
| 4.3 | Account health and lifecycle | 4.2 | Refresh, revoke, registration, rotation, and failure states |
| 4.4 | Assignment compatibility review | 4.2–4.3 | Phone uniqueness and race tests; focused commit |

## Acceptance criteria

- Cancelled, incomplete, expired, replayed, and duplicate results are safe.
- WABA/phone identity must belong to the authenticated Organization.
- Temporary and permanent credentials never enter client storage or logs.
- Vault failure does not persist plaintext credentials.
- Old credentials remain active until replacement validation succeeds.
- Unregistered, suspended, revoked, and unhealthy phones cannot send.
- Each Store has only one linked Organization-owned phone.
- One Organization-owned phone may be linked to multiple Stores.
- The shared phone's default inbound Store is deterministic and auditable.

## Verification

- Provisioning service tests and route tests.
- Credential-vault failure and rotation rollback tests.
- Provider status refresh and webhook state tests.
- Concurrent phone assignment tests.
- Multiple-Store assignment and one-linked-number-per-Store tests.
- Admin/Store Console browser flow with no token exposure.
