# Standalone Ganatri WhatsApp — Phase 5

Status: Not started
Phase: 5 — Organization template lifecycle

## Outcome

Provide creator-only WABA template drafts, Meta submission, approval tracking,
and explicit Store binding/default publishing.

## Subphase map

| Subphase | Outcome | Depends on | Exit evidence |
| --- | --- | --- | --- |
| 5.1 | Draft persistence | Phase 4 | Saving a draft does not call Meta |
| 5.2 | Meta submission and status sync | 5.1 | Idempotent provider submission and safe statuses |
| 5.3 | Store binding and explicit publish | 5.2, Phase 2 | Approved revision becomes selected Store default only by action |
| 5.4 | Archive/rollback/audit review | 5.3 | Historical revisions preserved; focused commit |

## Rules

- Templates belong to Organization + WABA.
- Bindings/defaults belong to Store + sender/WABA + kind + language.
- Bill/due force `UTILITY`; promotion forces `MARKETING`.
- Authentication templates remain platform-owned.
- Pending/rejected/paused/disabled templates cannot send.
- Approval never replaces a live default automatically.
- Historical revisions are archived or rolled back, never hard-deleted.

## Verification

- Draft, submission, webhook, approval, rejection, and retry tests.
- Category, variable, sample, language, media, and naming validation tests.
- Concurrent default publish uniqueness tests.
- Cross-Organization/WABA/Store binding tests.
- Archive/rollback and audit-event tests.
