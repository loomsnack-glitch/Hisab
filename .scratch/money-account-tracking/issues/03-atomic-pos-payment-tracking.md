# 03 — Atomic POS Payment Tracking

**What to build:** Make tracking-enabled Stores create exactly one Money Account Movement atomically with every Cash, UPI, or Card Payment at all existing POS payment entry points. Cash routes automatically to the active Store Cash Account; UPI/Card use their configured Rule.

**Blocked by:** 01 — Store Activation and Opening Balances; 02 — Payment Routing and Account History

**Status:** ready-for-agent

- [x] Checkout, partial checkout, and later payment collection each create a unique linked Movement in the same transaction as the Payment when the Store's tracking is active.
- [x] Cash requires an active Store Cash Account; UPI and Card require a valid active route. A missing destination rejects only the selected method with a clear setup message.
- [x] UPI and Card immediately increase the configured account, including when both point to the same account; no settlement, fee, or transfer behavior is added.
- [x] Bank Transfer and Other Payments remain accepted exactly as today and do not create Movements.
- [x] Disabled or unavailable tracking creates no Movement and does not impose routing requirements.
- [x] Replayed/retried payment requests never create duplicate Payments or Movements, and a route replacement cannot race into an invalid destination.
- [x] Replacing a tracked paid Sale appends one negative `sale_replacement_reversal` per original Movement in the same transaction as the replacement Payments and original void, without deleting or mutating the original Movement; retries do not duplicate reversals, and a reversal write failure rolls back the replacement.
- [x] Billing/POS service tests cover successful and rejected paths, atomic rollback, method scope, partial/later collections, sale-replacement reversals, and idempotency at the existing public seams.

