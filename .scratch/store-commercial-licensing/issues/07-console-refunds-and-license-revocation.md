# 07 — Console refunds and License Revocation

**What to build:** A Platform Administrator can reconcile an operator-managed Razorpay refund with a recorded License Revocation, ending a future term before it begins or selecting the end timestamp for active access. Organization users cannot self-cancel or receive automatic prorated refunds.

**Blocked by:** 03 — Paid Plan checkout and verified fulfilment.

**Status:** ready-for-agent

- [ ] Ganatri Console exposes the paid commercial history needed to select a refund and records the corresponding Razorpay result and License Revocation audit trail.
- [ ] Revoking a Scheduled Store License prevents it from ever activating; revoking active access ends it only at the Platform Administrator's explicit timestamp.
- [ ] Refunds never silently delete payments, mutate catalog revisions, or calculate an automatic pro-rata amount.
- [ ] Tests cover refund adapter boundaries, failure/retry behavior, Console authorization, scheduled versus active revocation, entitlement effects, and immutable history.
