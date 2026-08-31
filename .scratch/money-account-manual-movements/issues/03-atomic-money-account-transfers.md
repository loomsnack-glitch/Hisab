# 03 — Atomic Money Account transfers

**What to build:** An Organization administrator can use **Transfer money** to move a positive amount from one active Money Account to another active Money Account in the same Organization. A completed transfer creates a linked red outflow in the source account and green inflow in the destination account, clearly naming the counterpart account and Store where applicable. It works across Stores and with Organization-Wide accounts while leaving the Organization's total tracked money unchanged.

**Blocked by:** 01 — Manual deposits and withdrawals

**Status:** ready-for-agent

- [ ] The transfer flow requires distinct source and destination accounts, a positive two-decimal amount, and optional note; inactive, foreign, or same-account selections are rejected.
- [ ] The server atomically persists paired opposite-signed movements with a shared transfer correlation and rolls back both effects when either validation or persistence step fails.
- [ ] Transfers are allowed across Store-Scoped and Organization-Wide accounts, including different Stores, only when the source has sufficient current balance.
- [ ] Each account history clearly shows its transfer direction, counterpart account, Store when present, note, and updated balance without affecting existing movement behavior.
- [ ] Focused contract, server, concurrency, database/migration, and Admin behavior tests prove no one-sided or overdrawing transfer can occur.
