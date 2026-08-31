# 04 — Money Account Tracking Experience and Regression Coverage

**What to build:** Finish the administrator experience and prove the full feature preserves financial history without changing non-tracked POS behavior. This ticket makes the release supportable after the core persistence and POS integration exist.

**Blocked by:** 03 — Atomic POS Payment Tracking

**Status:** ready-for-agent

- [x] Money Account list and detail views clearly distinguish Opening Balance, calculated current Balance, and immutable payment-linked history on desktop and mobile, including automatic bill-edit reversals shown as negative dedicated entries.
- [x] Store Settings explains the effect of enabling/disabling tracking, shows configuration readiness, and keeps retained history readable when the Store is disabled or later unavailable.
- [x] Deactivating a route destination explains that future use of the affected Cash/UPI/Card method is blocked until the administrator repairs the configuration; historic Movements remain visible.
- [x] All user-facing validation and POS errors explain the missing Store Cash Account or UPI/Card route without exposing account configuration controls to a device user.
- [x] End-to-end regression tests demonstrate no backfill, no direct balance mutation, no manual Movement endpoint, correct locked account identity after movement, and unchanged Bank Transfer/Other behavior.
- [x] Focused test suites and type checks for `@repo/types`, services, backend, Admin, and POS pass.
