# 11 — Commercial rollout verification

**What to build:** The complete commercial workflow is verified for release readiness: Razorpay Test Mode payment and webhook delivery, lifecycle recovery paths, Feature Entitlement denial, and operator recovery guidance are demonstrably correct.

**Blocked by:** 04 — Paid Plan renewal and upgrade lifecycle; 05 — Co-Term Add-On checkout; 07 — Console refunds and License Revocation; 08 — Enforce Admin operational Features; 09 — Enforce POS and restaurant Features; 10 — Enforce reporting and integration Features.

**Status:** ready-for-agent

- [ ] A staging verification run proves a Test Mode Razorpay Order creates exactly one Store License after `order.paid`, and replaying the event changes nothing.
- [ ] The run covers expired Quote, failed payment, trial-to-paid successor, renewal, upgrade, add-on, refund/revocation, migration expiry, and at least one denial for each enforcement family.
- [ ] Production webhook configuration, secret handling, alert/retry expectations, and operator recovery steps are captured in release-ready documentation without exposing secrets.
- [ ] Automated regression coverage and the staging checklist have passing evidence suitable for release approval.
