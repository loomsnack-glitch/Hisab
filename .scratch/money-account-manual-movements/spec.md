# Manual Money Movements and Reconciliation

Status: ready-for-agent

## Problem Statement

Money Account Tracking currently explains balances only through opening balances, POS collections, Purchase payments, Expense payments, and their reversals. An Organization administrator cannot record real money added to or withdrawn from an account, move money from one Money Account to another, or safely bring a tracked balance back into agreement with the cash or provider balance after earlier bills or purchases were missed.

Editing the current balance would make the history untrustworthy. Treating a reconciliation difference as ordinary money in or out would also give misleading daily movement totals.

## Solution

Extend the Money Account detail page with four deliberate actions: **Add money**, **Withdraw money**, **Adjust balance**, and **Transfer money**. Each action appends immutable Money Account Movement history through the existing Money Account boundary.

Add money and Withdraw money record real external money flow and appear in the account history and movement summary as green money in or red money out. Adjust balance asks for the actual balance counted now and a required reason; Hisab derives and records the difference as a neutral gray Balance Adjustment, without classifying it as money in or money out. Transfer money atomically records a linked withdrawal and deposit of the same amount between two active Money Accounts in the same Organization, including accounts belonging to different Stores.

## User Stories

1. As an Organization administrator, I want to add money to a Money Account, so that a real deposit not caused by a sale is recorded in its balance and history.
2. As an Organization administrator, I want to withdraw money from a Money Account, so that cash or funds removed for a real-world reason are reflected in its balance and history.
3. As an Organization administrator, I want deposits to appear as green money in, so that genuine additions are easy to scan.
4. As an Organization administrator, I want withdrawals to appear as red money out, so that genuine removals are easy to scan.
5. As an Organization administrator, I want to enter the actual balance I have just counted or verified, so that Hisab calculates any reconciliation difference without requiring me to calculate a signed amount.
6. As an Organization administrator, I want every Balance Adjustment to require a reason, so that a later reader can understand why the tracked amount changed.
7. As an Organization administrator, I want a Balance Adjustment to appear in neutral gray, so that it is visibly distinct from a deposit or withdrawal.
8. As an Organization administrator, I want reconciliation to change the current Money Account Balance, so that I can resume disciplined tracking from the verified amount.
9. As an Organization administrator, I want reconciliation not to inflate money-in, money-out, or net cash-flow figures, so that operational totals continue to describe actual flow rather than corrections.
10. As an Organization administrator, I want a zero-difference reconciliation to explain that no adjustment is needed, so that no meaningless history entry is created.
11. As an Organization administrator, I want a Balance Adjustment recorded when I count the money, so that history says when the discrepancy was discovered.
12. As an Organization administrator, I want to transfer money from one Money Account to another, so that I can model cash deposited into a bank, funds moved between accounts, or cash moved between Stores.
13. As an Organization administrator, I want a transfer to show the counterpart account and Store where applicable, so that each side of the movement is understandable from either account history.
14. As an Organization administrator, I want a transfer source to show a red outflow and its destination to show a green inflow, so that each account's balance movement is clear.
15. As an Organization administrator, I want transfers between Store-Scoped and Organization-Wide Money Accounts, so that a Store can move money to or from a shared bank account.
16. As an Organization administrator, I want transfers between accounts assigned to different Stores, so that inter-branch movement is represented without creating artificial deposits and withdrawals.
17. As an Organization administrator, I want a transfer never to change the Organization's total tracked money, so that it is not mistaken for an external deposit or withdrawal.
18. As an Organization administrator, I want a withdrawal or transfer blocked before it would make its source balance negative, so that the recorded balance remains usable.
19. As an Organization administrator, I want a clear prompt to reconcile first when the recorded balance is too low because prior activity was missed, so that a shortage is corrected explicitly rather than hidden by an overdraft.
20. As an Organization administrator, I want all action dialogs to validate positive two-decimal money values before recording, so that accidental zero, negative, or imprecise entries do not reach history.
21. As an Organization administrator, I want optional notes on real deposits, withdrawals, and transfers, so that I can preserve helpful context without requiring unnecessary accounting categories.
22. As an Organization administrator, I want an Organization-Wide account's manual entry to be shown without inventing a Store attribution, so that the history does not falsely claim a branch owns the movement.
23. As an Organization administrator, I want an account's history to remain append-only after I record a manual action, so that balances can always be explained from the visible history.
24. As an Organization administrator, I want unavailable or inactive accounts excluded from new transfers, so that historical accounts cannot be used for new money movement.
25. As an Organization administrator, I want a failed action to leave every affected account unchanged, so that a partial transfer or stale balance cannot corrupt my records.
26. As an Organization administrator, I want existing POS, Purchase, Expense, reversal, Opening Balance, and date/store-filter history to continue working, so that this capability does not disrupt established financial records.

## Implementation Decisions

- Extend the existing Organization-scoped Money Account capability rather than introducing a general-ledger module. Its shared contracts, authenticated server operations, persistence adapter, history response, client service/query layer, and account-detail page remain the single vertical seam for all new actions.
- Add source kinds and history-entry variants for manual deposit, manual withdrawal, Balance Adjustment, and the two sides of a Money Account Transfer. Each variant supplies only the metadata needed by the history UI, including optional note/reason and transfer counterpart details.
- Persist manual-movement metadata and an optional transfer correlation identifier alongside the existing immutable movement fields. Do not mutate or repurpose linked POS Payment, Outgoing Payment, or reversal fields.
- A manual deposit is a positive, current-time Money Account Movement. A manual withdrawal is a negative, current-time Money Account Movement. Both represent real money flow external to the tracked Money Accounts.
- A Balance Adjustment accepts a non-negative actual current balance and a nonblank reason. The server locks the account, calculates `actual balance − current tracked balance`, and appends one signed adjustment only when that difference is non-zero. The adjustment is timestamped at reconciliation time and cannot be backdated.
- A Balance Adjustment must never be presented or aggregated as a deposit or withdrawal. History uses neutral gray styling and an explicit adjustment label that shows the actual balance and derived difference. The history summary retains its existing actual-flow In, Out, and Net values and adds a separate neutral adjustment total; its count includes all recorded movements.
- Manual deposits, withdrawals, Balance Adjustments, and transfers are immutable after posting. This feature provides no edit or delete operation; a later correction is a new, explainable movement or Balance Adjustment.
- A transfer accepts a distinct source and destination active Money Account in the same Organization plus one positive two-decimal amount and optional note. In one database transaction, it locks both accounts in stable order, verifies the current source balance is sufficient, and appends the linked negative source entry and positive destination entry. Failure to validate or persist either entry rolls back the whole transfer.
- Transfers may cross Store boundaries and may involve Organization-Wide accounts. A Store-Scoped account's manual movement inherits that account's Store for history display and filtering. A movement on an Organization-Wide account has no fabricated Store attribution.
- New manual withdrawals and transfers must not make a source balance negative. Balance Adjustment may set a balance to zero or a higher amount but cannot accept a negative actual balance.
- The detail-page header exposes compact, clearly named actions without obscuring the current balance or date/store controls. Add money and Withdraw money can share one amount-and-note dialog shape; Adjust balance shows the current tracked amount, actual-balance input, calculated gray difference, and required reason; Transfer money presents source, destination, amount, note, and a review of both effects.
- History rows identify manual deposits, manual withdrawals, adjustments, transfer in, and transfer out with consistent icons, colors, counterpart account names, Store labels when present, timestamp, and explanatory note/reason. Existing automatic movement labels and links remain unchanged.
- All new actions use the existing Organization-admin authorization and tenant-isolation rules. The server—not the UI—enforces account ownership, active status, account distinction, valid money precision, sufficient balance, current balance calculation, and transaction atomicity.
- Add a database migration that evolves the movement model without changing or reclassifying historical POS, Purchase, Expense, Opening Balance, or reversal rows. Existing required Store attribution remains intact for existing generated movements while manual Organization-Wide movements are represented accurately.

## Testing Decisions

- Test observable behavior at the highest existing seam: shared Money Account schemas/contracts, authenticated Money Account server operations and history response, and the visible Admin account-detail workflow. Do not assert private helper structure.
- Build on the existing money-account schema, backend service/route/repository, and Admin detail-page test suites for prior art.
- Contract tests cover all new source kinds and history variants; positive two-decimal amount validation; optional notes; required adjustment reason; distinct valid account identities; actual-balance validation; nullable manual Store attribution for Organization-Wide accounts; and compatibility with existing movement DTOs.
- Server tests cover tenant isolation, unauthorized access, inactive/missing account rejection, insufficient balance rejection, zero-difference adjustment behavior, server-calculated positive and negative adjustment differences, current-time adjustment timestamps, and preservation of existing history records.
- Transfer tests prove that source and destination entries use the same correlation identifier and amount with opposite signs; same-account, cross-Organization, inactive, and insufficient-source requests fail; cross-Store and Organization-Wide transfers succeed; and any validation or persistence failure leaves both balances unchanged.
- Concurrency tests exercise two competing withdrawals/transfers and a reconciliation against the same account, proving locks and transactions prevent a negative balance, lost update, or one-sided transfer.
- History tests verify manual deposits and transfer-in are green; manual withdrawals and transfer-out are red; Balance Adjustments are neutral gray; adjustment totals remain separate from In, Out, and Net; counterpart names, notes/reasons, and Store labels render correctly; and existing automatic rows retain their current labels, amounts, and links.
- UI tests cover all four actions, disabled/invalid submit states, validation messages, successful refresh of balance and history, zero-difference reconciliation state, source-balance failure state, inactive-account exclusion, empty/error/loading behavior, date filtering, and mobile-safe action layout.
- Run focused backend, type-contract, and Admin tests; relevant Admin type checking; migration/schema validation in a disposable database; and `git diff --check`. Report pre-existing failures separately.

## Out of Scope

- Editing, deleting, or reversing posted manual movements or transfers through a dedicated workflow.
- Backdating manual movements, transfers, or Balance Adjustments.
- Accounting journals, double-entry accounting beyond a paired transfer, chart-of-accounts, tax treatment, profit-and-loss reporting, or balance sheets.
- Categorizing a manual deposit or withdrawal as revenue, expense, owner contribution, loan, or any other accounting classification.
- Bank feeds, bank-statement import, automatic reconciliation, card-acquirer settlement timing, fees, or payment-provider integration.
- Cash-register shifts, drawer-level tracking, cashier assignment, daily closing workflows, or stock/bill/purchase data repair.
- Changing, backfilling, or reclassifying historical POS Payments, Purchases, Expenses, Outgoing Payments, Opening Balances, or their reversals.
- POS-side manual money actions.

## Further Notes

- **Manual Money Movement**, **Balance Adjustment**, and **Money Account Transfer** are now canonical terms in `CONTEXT.md`; they must be used consistently in code, UI copy, tests, and follow-up work.
- A Balance Adjustment corrects the tracked balance after earlier missed activity. It does not repair or recreate the missing Purchase, Expense, or Sale itself; those business records remain a separate concern.
- The current money-account detail page deliberately has no manual controls. This feature adds them at that page rather than the account list so the user acts with the current balance and relevant history visible.
- The durable decision to preserve append-only reconciliation history is recorded in ADR 0017.
