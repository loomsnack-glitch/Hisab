# 02 — Balance Adjustment reconciliation

**What to build:** An Organization administrator can use **Adjust balance** on a Money Account detail page after counting cash or verifying the provider balance. They enter the actual current balance and a required reason; Hisab calculates and records the difference as an immutable, current-time Balance Adjustment. The adjustment changes the account balance but is visually neutral gray and remains separate from real money-in, money-out, and net totals.

**Blocked by:** 01 — Manual deposits and withdrawals

**Status:** ready-for-agent

- [ ] The adjustment flow displays the tracked balance, validates a non-negative actual balance and required reason, derives the difference server-side, and creates no row when the difference is zero.
- [ ] Each Balance Adjustment is appended at reconciliation time, cannot be backdated, and is rendered with a neutral gray label that includes its reason and derived effect.
- [ ] In, Out, and Net continue to represent real money flow; adjustments have a separate neutral total while the count reflects all movements.
- [ ] Authorization, tenant isolation, stale/concurrent balance handling, historical compatibility, and UI error/loading states are covered by focused tests.
