# 03 — Atomic POS Payment Tracking

**What to build:** Make tracking-enabled Stores create exactly one Money Account Movement atomically with every Cash, UPI, or Card Payment at all existing POS payment entry points. Cash routes automatically to the active Store Cash Account; UPI/Card use their configured Rule.

**Blocked by:** 01 — Store Activation and Opening Balances; 02 — Payment Routing and Account History

**Status:** ready-for-agent

- [ ] Checkout, partial checkout, and later payment collection each create a unique linked Movement in the same transaction as the Payment when the Store's tracking is active.
- [ ] Cash requires an active Store Cash Account; UPI and Card require a valid active route. A missing destination rejects only the selected method with a clear setup message.
- [ ] UPI and Card immediately increase the configured account, including when both point to the same account; no settlement, fee, or transfer behavior is added.
- [ ] Bank Transfer and Other Payments remain accepted exactly as today and do not create Movements.
- [ ] Disabled or unavailable tracking creates no Movement and does not impose routing requirements.
- [ ] Replayed/retried payment requests never create duplicate Payments or Movements, and a route replacement cannot race into an invalid destination.
- [ ] Billing/POS service tests cover successful and rejected paths, atomic rollback, method scope, partial/later collections, and idempotency at the existing public seams.

