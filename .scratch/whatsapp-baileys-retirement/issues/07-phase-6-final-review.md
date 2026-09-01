# Phase 6 — Final review, verification, and commit

Status: complete after verification

Type: task

## Objective

Review the complete scoped removal, verify Cloud API regressions, and prepare a narrow commit only after user approval.

## Acceptance criteria

- Scoped diff contains no unrelated worktree changes, including `apps/web/`.
- Standards and scope review pass.
- `git diff --check`, focused tests, type checks, and builds pass or known baseline failures are listed separately.
- Database migration and deployment gates are explicitly reported.
- User authorized the implementation and commit; no push is performed.
