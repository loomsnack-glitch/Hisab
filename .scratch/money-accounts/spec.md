# Money Account Management

Status: ready-for-agent

## Problem Statement

Organization administrators need one clear place in Ganatri Admin to register and maintain the real places where their business money is held or received. Today, Hisab can record POS Payments by a payment method such as cash or UPI, but it has no configurable Money Account such as a Store Cash Account, Bank Account, UPI QR account, Card Settlement account, or Petty Cash box. As a result, an administrator cannot establish the account configuration needed for later Purchases, POS account mapping, balances, and daily cash reconciliation.

The first release must stay deliberately small: it establishes trusted, Organization-owned Money Account configuration only. It does not yet claim to reconcile money or alter existing billing behaviour.

## Solution

Add an Organization-scoped Money Accounts destination in Ganatri Admin. An Organization administrator can list, create, view, edit, activate, and deactivate Money Accounts through the same Organization Admin configuration seam used for Vendors and Units.

A Money Account has a name, Money Account Type, availability scope, optional Store when Store-scoped, optional notes, and active/inactive status. It holds no sensitive banking or payment credentials. A Money Account is retained by status rather than permanently deleted.

The supported Money Account Types are Cash, Bank, UPI, Card Settlement, Petty Cash, and Other. A Store can have at most one active Store Cash Account; it represents all physical cash at that Store in this release. Organization-Wide Money Accounts are available across the Organization, while Store-Scoped Money Accounts are available only to their selected Store.

## User Stories

1. As an Organization administrator, I want to open Money Accounts from the Ganatri Admin sidebar, so that I can maintain the places where my business money is held or received.
2. As an Organization administrator, I want to see every Money Account belonging to my Organization, so that I can understand the available financial destinations without seeing another Organization's configuration.
3. As an Organization administrator, I want to create a Cash Money Account for one Store, so that the Store has one clear representation of its physical cash.
4. As an Organization administrator, I want to create a Bank Money Account, so that a business bank account can be configured for future money flows.
5. As an Organization administrator, I want to create a UPI Money Account, so that a Store-specific or Organization-Wide QR/UPI destination can later be selected correctly.
6. As an Organization administrator, I want to create a Card Settlement Money Account, so that card-machine collections can later be distinguished from money already in the bank.
7. As an Organization administrator, I want to create a Petty Cash Money Account, so that a separate operational cash holding can be configured when my business uses one.
8. As an Organization administrator, I want to create an Other Money Account, so that a valid business case is not forced into the wrong account type.
9. As an Organization administrator, I want to name each Money Account clearly, so that future selectors and reports are understandable to staff and owners.
10. As an Organization administrator, I want to choose whether a Money Account is available to one Store or all Stores, so that Store-specific cash and shared bank accounts are represented without duplicate records.
11. As an Organization administrator, I want a Store-Scoped Money Account to identify its Store, so that staff cannot mistake it for an Organization-Wide account.
12. As an Organization administrator, I want Cash Money Accounts to be Store-scoped, so that every Store's physical cash remains separate.
13. As an Organization administrator, I want the system to permit only one active Cash Money Account per Store, so that future POS cash collections and daily closings have one unambiguous destination.
14. As an Organization administrator, I want to edit an account's descriptive configuration, so that account names, notes, availability scope, Store assignment, and status can remain current before account movements are introduced.
15. As an Organization administrator, I want to add optional notes to a Money Account, so that I can record a useful non-sensitive description such as the branch or purpose.
16. As an Organization administrator, I want to search and filter Money Accounts by name, type, scope, Store, and active status, so that I can find an account as the list grows.
17. As an Organization administrator, I want to deactivate an unused Money Account, so that it is no longer available for future use while remaining intelligible when future history exists.
18. As an Organization administrator, I want to reactivate a Money Account, so that a temporarily unused account can be made available again.
19. As an Organization administrator, I want no permanent delete action for Money Accounts, so that configuration is ready to preserve future financial history rather than erase it.
20. As an Organization administrator, I want account configuration to exclude bank-account numbers, UPI IDs, card-terminal IDs, QR images, and credentials, so that this first release does not create unnecessary financial-data exposure.
21. As an Organization administrator, I want an empty state that explains how to create the first Money Account, so that a new Organization can start configuration without guessing.
22. As an Organization administrator, I want clear loading, validation, and error states, so that account setup is dependable on desktop and mobile Admin use.
23. As an unauthorized visitor or non-member, I must not be able to read or change an Organization's Money Accounts, so that financial configuration remains tenant-isolated.
24. As a POS user, I must not receive Money Account configuration access in this release, so that configuration remains an Organization Admin responsibility until POS account mapping is separately designed.
25. As a future Purchase or POS feature, I need stable Money Account records to select from, so that later money movements can be implemented without inventing a second account model.

## Implementation Decisions

- Implement one Organization-scoped Money Account configuration capability at the existing Ganatri Admin configuration seam: shared typed contracts, authenticated Organization-admin routes, backend service operations, persistence adapter, client service/query keys, and one Admin page consume the same contracts. Do not add a POS configuration seam or a Purchase seam in this feature.
- Introduce the canonical domain term **Money Account**. It is a real place where business money is held or received, not a full accounting chart-of-accounts entry, income category, expense category, or POS Payment Method.
- Every Money Account belongs to exactly one Organization and carries audit metadata compatible with existing Organization-owned configuration records.
- A Money Account stores only: name, Money Account Type, availability scope, optional Store relationship when Store-scoped, optional notes, active/inactive status, and audit metadata. Do not persist bank-account numbers, UPI IDs, card-terminal IDs, QR images, credentials, balances, opening balances, or payment-routing settings.
- The fixed Money Account Type set is `cash`, `bank`, `upi`, `card_settlement`, `petty_cash`, and `other`. These are classifications of where money resides, not replacements for Billing's existing Payment Method values.
- A Money Account availability scope is either Store-scoped or Organization-wide. A Store-scoped Money Account must reference exactly one Store in the same Organization; an Organization-wide Money Account has no Store reference and is available to every Store in that Organization.
- A Cash Money Account must be Store-scoped. Each Store may have at most one active Cash Money Account. Multiple Bank, UPI, Card Settlement, Petty Cash, and Other Money Accounts are allowed when their configuration is meaningful to the Organization.
- Creating Money Accounts is deliberate: no Cash, Bank, or other Money Accounts are automatically seeded for existing or new Organizations. The first Cash Money Account created for a Store becomes that Store's active Store Cash Account.
- Money Accounts are retained through active/inactive status. There is no permanent deletion command or route. An inactive account remains listed when the administrator requests inactive or all records and is reserved for future historical readability.
- In this configuration-only release, an administrator may edit the account's descriptive configuration. When account movements are introduced in a future feature, the movement rules will decide which fields become immutable; that future policy is intentionally not pre-committed here.
- The Admin page presents a concise account table and create/edit dialog following the established Vendors and Units patterns. It exposes type, scope, Store when applicable, status, notes, search, and filters with clear empty, loading, validation, and error states.
- The form must reject an invalid type, blank or overlong name, overlong notes, missing Store for Store scope, a Store outside the Organization, a Store attached to Organization-wide scope, Cash with Organization-wide scope, and creation or activation of a second active Cash Money Account for the same Store.
- The account list and detail responses show no sensitive financial identifiers because the feature does not collect them.
- Existing POS Payment records remain unchanged. No existing `cash`, `upi`, `card`, `bank_transfer`, or `other` Billing Payment Method is backfilled or mapped to a Money Account in this feature.
- Existing Vendor, Vendor Item, Unit, Product, Sale, Payment, Customer Ledger, and Store Device capabilities remain unchanged. The new capability is preparation for later work, not a partial Purchase, ledger, or reconciliation implementation.

## Testing Decisions

- Test externally observable behavior at the highest existing seam: shared type-schema validation, authenticated Organization-admin routes and services, and the Admin page's visible account-management behavior. Do not test implementation internals.
- Add schema tests for valid Money Account creation and edits; every fixed type; Store-scoped and Organization-wide shape rules; required name; notes limits; status validation; invalid UUIDs; forbidden fields; and rejection of sensitive financial-identifier fields.
- Add service and route tests following the existing Organization Vendor and Unit configuration prior art. Cover authenticated member access, unauthenticated denial, non-member denial, cross-Organization isolation, creation, listing, retrieval, updates, deactivation, and reactivation.
- Test Cash constraints explicitly: Cash requires a Store; an Organization-wide Cash account is rejected; the selected Store must be in the Organization; a second active Cash account for one Store is rejected; and a replacement Cash account can be activated after the previous one is inactive.
- Test scope transitions and updates externally, including removal of the Store relationship when becoming Organization-wide and the required Store relationship when becoming Store-scoped, while preserving Organization isolation.
- Add Admin behavioral tests following the existing Vendors and Units page patterns. Verify sidebar navigation, account table data, create/edit dialog validation, scope-dependent Store selection, status display and filters, type filters, search, empty state, loading state, error state, and absence of a delete action.
- Verify that Billing and POS contracts remain unchanged and that no Money Account configuration route becomes accessible through device-authenticated POS access.

## Out of Scope

- Purchases, Purchase Items, Vendor payments, vendor balances, or payable tracking.
- POS selection or mapping of Payment Methods to Money Accounts.
- Creating Money Account movements, account balances, opening balances, transfers, expenses, adjustments, or an append-only financial ledger.
- Daily cash opening, cash closing, shift handling, cash counting, expected-versus-actual variances, bank-statement reconciliation, or owner reconciliation reporting.
- Full accounting, debit/credit journals, a chart of accounts, profit-and-loss reporting, balance sheets, tax accounting, or GST accounting.
- Individual cash counters, cash drawers, cashier wallets, or per-shift cash tracking. One active Store Cash Account represents all physical cash at a Store in this release.
- Storing full bank-account numbers, IFSC details, UPI IDs, QR images, card-terminal identifiers, payment credentials, or banking integration tokens.
- Automatically creating or guessing Money Accounts from existing Stores or historical Payments.
- Permanently deleting Money Accounts.
- Changing existing Vendor, Vendor Item, Unit, Product, Sale, Payment, Customer Ledger, or Store Device behavior.

## Further Notes

- This release creates the configuration foundation only. A later Money Account Movement module should become the single deep module through which POS collections, Purchase payments, transfers, and adjustments change account balances.
- Later POS work should map a payment method to an eligible Money Account rather than treating a method such as `cash` or `upi` as the money location itself.
- Later Purchase work should select an eligible Money Account only when money is actually paid; an unpaid Purchase must not create an account outflow.
- Historical POS Payments must not be guessed into new Money Accounts. A future reconciliation release should define its own controlled cutover and opening-balance policy.
- Terminology follows the shared domain glossary: Ganatri Admin owns Organization-administrator configuration, while Ganatri POS remains a device-authenticated operational application.
