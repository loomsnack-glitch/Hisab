# 01 — Manual deposits and withdrawals

**What to build:** An Organization administrator can use **Add money** and **Withdraw money** from an active Money Account's detail page to record real external money flow. Each completed action immediately updates the account balance and creates an immutable history row: deposits are green money in and withdrawals are red money out. The flow accepts an optional note, accurately represents Store-Scoped and Organization-Wide account attribution, and prevents a withdrawal from reducing the source balance below zero.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Add money and Withdraw money work end-to-end for an authorized Organization administrator, with positive two-decimal amounts, optional notes, validation feedback, and refreshed balance/history.
- [ ] Deposits and withdrawals are durable immutable Money Account Movements with accurate current-time history presentation; existing automatic movement history remains compatible.
- [ ] The server enforces tenant ownership, active-account eligibility, valid amount precision, and sufficient source balance, including concurrent withdrawals.
- [ ] Store-Scoped manual movements show their account's Store, while Organization-Wide manual movements do not invent a Store attribution.
- [ ] Shared-contract, authenticated server, migration/database, and Admin behavior tests cover the delivered flow and `git diff --check` passes.
