# Standalone Ganatri WhatsApp — Phase Loop Status

Status: Paused at Phase 1.1; multi-number/Customer-association plan update active
Last updated: 2026-09-17

This is the single execution status tracker for the approved Standalone
Ganatri WhatsApp effort. The product specification and decision register are
in [spec.md](./spec.md). Each phase has its own execution record and must use
the lifecycle defined in [phase-loop skill](../../.agents/skills/phase-loop/SKILL.md).

## Scope

- Standalone, user-authenticated Ganatri WhatsApp application.
- Store modes: `disabled`, `ganatri_utility`, and `organization_cloud`.
- Organizations may connect multiple numbers; a number may serve multiple
  Stores; each Store has one linked Organization number.
- Customer Store relationships are persisted with migration origin, creation
  origin, activity source, first-seen time, and last-activity time.
- Ganatri Utility sends only environment-selected bill and due templates.
- Organization Cloud uses Meta Embedded Signup and approved Store bindings.
- Both modes use the same durable outbox and require WhatsApp Store
  Entitlement.
- Initial release ends after bill/due delivery and operational status.
- Inbox, free-form replies, promotions, and campaigns are later phases.

## Execution rules

- Work one phase at a time and one subphase at a time.
- Do not start a subphase until its plan is reviewed and recorded.
- Do not start the next subphase until the current subphase is verified,
  reviewed, documented, and committed.
- Stage only files belonging to the current subphase.
- Preserve the staged Admin mobile status note and unrelated worktree files.
- Never expose secrets, OTPs, tokens, full customer phones, message bodies, or
  private provider payloads in logs or documentation.
- Do not push commits unless explicitly requested.

## Current baseline

- Branch: `feat/ganatri-standalone-whatsapp`.
- Fixed point: `e7901ff` (last committed planning checkpoint).
- Phase 0 source/database baseline completed on 2026-09-17.
- Development database: 148 migrations applied, 0 pending.
- The WhatsApp phone-status migration is applied.
- Historical Baileys rows remain readable; new Baileys work is out of scope.
- Existing POS `/whatsapp` inbox and Admin WhatsApp routes remain until the
  Phase 7 cutover.
- Existing OTP/invitation logging still requires redaction before Phase 3
  platform tenant delivery.
- Phase 1.1 created an uncommitted app shell; verification and commit are
  paused while the multi-number/Customer-association plan is updated.

## Phase roadmap

| Phase | Goal | Subphases | Status | Exit condition |
| --- | --- | --- | --- | --- |
| 0 | Baseline and contract lock | 0.1–0.4 | Complete | Sender/policy boundaries and development migration state recorded. |
| 1 | Standalone application foundation | 1.1–1.4 | Paused (1.1) | Authenticated app shell reaches scoped Store workspace. |
| 2 | Policy, authorization, and Customer association foundation | 2.1–2.5 | Not started | Every policy mutation, Customer association, and send path is backend-authorized. |
| 3 | Ganatri Utility sender | 3.1–3.4 | Not started | Fixed bill/due messages use the common outbox safely. |
| 4 | Organization Cloud connection | 4.1–4.4 | Not started | Embedded Signup produces a validated, encrypted Cloud account. |
| 5 | Organization template lifecycle | 5.1–5.4 | Not started | Approved templates can be explicitly published per Store. |
| 6 | Bill/due delivery | 6.1–6.4 | Not started | Both sender modes deliver idempotent, consent-safe messages. |
| 7 | Migration and cutover | 7.1–7.4 | Not started | Existing Admin/POS boundaries cut over without data loss. |
| 8 | Later inbox and replies | 8.1–8.3 | Deferred | Organization Cloud conversations are Store-scoped and safe. |
| 9 | Later promotions and operations | 9.1–9.3 | Deferred | Marketing and operational controls are Cloud-only and audited. |

## Phase approval state

Phase 0 is complete as a planning/baseline checkpoint. Phase 1 is approved by
the product decision record but implementation must still follow the
subphase plan/review/commit gates. Phases 8 and 9 are intentionally deferred
from the initial release. Phase 1.1 implementation is paused before
verification/commit while the multi-number and Customer-association plan is
updated.

## Recovery checkpoint

Phase 1.1 implementation was interrupted before verification or commit when
the product direction changed to support multiple Organization WhatsApp
numbers and shared account-to-Store assignments. The uncommitted
`apps/whatsapp` shell and `bun.lock` change are preserved for later review;
they must not be discarded or mixed into the multi-number design work. The
unrelated `.scratch/admin-mobile/` files remain preserved as well.
