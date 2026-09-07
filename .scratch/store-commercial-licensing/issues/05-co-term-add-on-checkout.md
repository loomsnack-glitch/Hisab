# 05 — Co-Term Add-On checkout

**What to build:** An Organization administrator can buy an eligible separately purchasable Module for an active paid Store License. The Module activates after verified payment, uses exact proration, and ends with the base Plan.

**Blocked by:** 03 — Paid Plan checkout and verified fulfilment.

**Status:** ready-for-agent

- [ ] Ganatri Admin offers only active separately purchasable Modules whose term matches the active base Plan and that do not duplicate current Store access.
- [ ] The Quote, Razorpay Order, and verified webhook activate one paid Co-Term Add-On with a final paise-rounded charge based on the exact remaining term fraction.
- [ ] The add-on's expiry exactly matches its base Plan and its revision snapshot continues to determine access after later catalog changes.
- [ ] Tests cover eligibility, duplicate prevention, price/rounding, expiry, webhook idempotency, and Admin history/status behavior.
