# Ganatri WhatsApp — Phase Loop Status

Status: Phase 5 complete with documented follow-ups
Last updated: 2026-09-18

This is the single execution status tracker for the approved Ganatri WhatsApp
effort. The product specification and decision register are
in [spec.md](./spec.md). Each phase has its own execution record and must use
the lifecycle defined in [phase-loop skill](../../.agents/skills/phase-loop/SKILL.md).

## Scope

- Ganatri WhatsApp feature integrated into the existing Admin and Store Console
  applications.
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
- Fixed point: `9e465f8` (integrated-plan checkpoint before Phase 1 execution).
- Phase 0 source/database baseline completed on 2026-09-17.
- Development database: 155 migrations applied, 0 pending.
- The WhatsApp phone-status migration is applied.
- Historical Baileys rows remain readable; new Baileys work is out of scope.
- Existing Admin WhatsApp routes remain the Organization management workspace.
- The Store Console surface is Admin's selected-Store Workspace WhatsApp panel;
  `apps/console` remains Platform Administrator inspection only.
- POS `/whatsapp` remains device-scoped and will redirect to POS home at
  cutover.
- Existing OTP/invitation logging still requires redaction before Phase 3
  platform tenant delivery; Phase 3.1 is isolating platform configuration
  before changing those callers.
- Phase 1.1, 1.2, 1.3, and 1.4 are committed. Phase 1 final verification and
  standards/spec review are complete, with documented follow-ups.
- Phase 2.1 through 2.5 are verified and committed. Phase 2 final verification
  and standards/spec review are complete with documented follow-ups.
- Phase 3.1 through 3.4 plans, implementation, focused verification, and
  standards/spec review are complete and committed. Phase 3 added the
  validated platform configuration, common-outbox representation, fixed
  bill/due admission, sensitive-log redaction, and hidden platform inbound
  retention. The whole-phase review fixes are complete and committed;
  DB-test runtime limitations are documented in the Phase 3 record.

## Phase roadmap

| Phase | Goal | Subphases | Status | Exit condition |
| --- | --- | --- | --- | --- |
| 0 | Baseline and contract lock | 0.1–0.4 | Complete | Sender/policy boundaries and development migration state recorded. |
| 1 | Integrated Admin and Store Console foundation | 1.1–1.4 | Complete with follow-ups | Admin and Store Console expose correctly scoped WhatsApp surfaces. |
| 2 | Policy, authorization, and Customer association foundation | 2.1–2.5 | Complete with follow-ups | Every policy mutation, Customer association, and send path is backend-authorized. |
| 3 | Ganatri Utility sender | 3.1–3.4 | Complete with follow-ups | Fixed bill/due messages use the common outbox safely. |
| 4 | Organization Cloud connection | 4.1–4.4 | Complete with follow-ups | Embedded Signup produces a validated, encrypted Cloud account. |
| 5 | Organization template lifecycle | 5.1–5.4 | Complete with follow-ups | Approved templates can be explicitly published per Store. |
| 6 | Bill/due delivery | 6.1–6.4 | In progress — 6.2 complete; 6.3 next | Both sender modes deliver idempotent, consent-safe messages. |
| 7 | Migration and cutover | 7.1–7.4 | Not started | Existing Admin/POS boundaries cut over without data loss. |
| 8 | Later inbox and replies | 8.1–8.3 | Deferred | Organization Cloud conversations are Store-scoped and safe. |
| 9 | Later promotions and operations | 9.1–9.3 | Deferred | Marketing and operational controls are Cloud-only and audited. |

## Phase approval state

Phase 0 is complete as a planning/baseline checkpoint. The product direction
is integrated into Admin and Store Console; Phase 1.1, 1.2, 1.3, and 1.4 have
passed their focused verification, standards/spec review, and commit gates.
Phase 1 is complete with documented baseline and browser follow-ups. Phase 2.1,
2.2, 2.3, and 2.4 implementation, verification, standards/spec review, and
commit gates are complete. Phase 2.5 final verification and review are complete.
Phase 2 is complete with documented backend typecheck and Phase 1 browser
follow-ups. Phase 3 implementation and review fixes are complete with
documented follow-ups. Phase 4.1 plan, edge-case coverage, verification, and
review are complete and committed. Phase 4.2 server exchange/provisioning
cleanup, verification, and review are complete and committed. Phase 4.3
account lifecycle/health, rotation, verification, and review are complete and
committed. Phase 4.4 assignment compatibility, race fix, verification, and
review are complete and committed. The whole-phase review fixes are also
complete and committed. Phase 4 is complete with documented follow-ups;
Phase 5.1 draft persistence, review correction, verification, and review are
complete and committed. Phase 5.2 submission/status synchronization,
idempotency hardening, verification, and review are complete and committed.
Phase 5.3 binding/publish scope hardening, verification, and review are
complete and committed. Phase 5.4 archive/rollback/audit review is complete
with documented follow-ups; Phase 5 is complete and Phase 6 is next. Phases 8
and 9 are intentionally deferred from the initial release.

The Phase 5 final review loop then corrected Store/sender/kind/language default
replacement scope, rejected submission/provider language drift, removed
template-content debug logging, and re-ran the 63-test focused suite plus both
production builds. The correction commit is the final Phase 5 checkpoint.

Phase 6.1 bill-delivery implementation, review, and verification are complete;
Phase 6.2 due-delivery implementation, review, and verification are complete;
the next boundary is the 6.3 status/retry/resend plan. The Phase 5 checkpoint
remains the rollback boundary for the completed 6.1 slice.

## Recovery checkpoint

The previous Phase 1.1 standalone shell was never committed and has been
removed. Its workspace-lock entries were also removed. The integrated Phase 1
boundary is already present in Admin's Organization and Store Workspace routes,
so no duplicate app or source change was introduced. Phase 1 closeout commits
are documented in the phase record. The unrelated `.scratch/admin-mobile/`
files remain preserved.
