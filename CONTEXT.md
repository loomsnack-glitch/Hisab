# Hisab

Hisab is a multi-tenant retail/POS system for managing stores, products, sales, and money movement at the store level.

## Language

**Billing**:
The part of the system that records a sale, its line items, and the payments collected against it. In this project, Billing is modeled through Sales and Payments rather than a separate invoice domain.
_Avoid_: Invoicing, bill book

**Payment Status**:
The settlement state of a Sale based on how much money has been collected against its grand total. A Sale may be pending, partial, or paid.
_Avoid_: Transaction status, order status

**Receivable Sale**:
A Sale whose payment status is pending or partial, and therefore still has money owed by a Customer. A Receivable Sale must belong to a specific Customer.
_Avoid_: Open bill, unpaid order

**Customer Ledger**:
The append-only history of balance-changing entries for a Customer, including sales, payments, void reversals, and manual adjustments. It exists to explain why the Customer's running balance is what it is.
_Avoid_: Balance cache, statement total

**Draft Sale**:
A Sale that is being assembled but has not yet been committed as a receivable or completed sale. Draft Sales may change freely without affecting customer balances.
_Avoid_: Temporary invoice, cart

**Payment**:
A record of money collected against a Sale. A Sale may have many Payments across different methods or points in time.
_Avoid_: Settlement row, transaction row

**Sale Number**:
A human-friendly bill identifier assigned when a Sale is committed. It is unique within a Store.
_Avoid_: UUID, internal id

**Sale Status**:
The lifecycle state of a Sale. In billing v1, a Sale may be draft, completed, or voided.
_Avoid_: Payment status, order state

**Walk-in Sale**:
A completed and fully paid Sale that does not belong to a specific Customer. Walk-in Sales are allowed in billing v1.
_Avoid_: Anonymous receivable, guest credit sale

**Sale Item Snapshot**:
The copy of a product's billing details stored on a Sale Item at billing time, such as product name and price. It preserves the historical bill even if the catalog changes later.
_Avoid_: Live product lookup, dynamic line item

**Discount**:
A reduction applied to a Sale or Sale Item before the final amount is collected. Billing v1 supports simple discounts and does not model tax.
_Avoid_: Offer engine, tax rule

**Order-Level Discount**:
A Discount applied to the whole Sale after line-item pricing is computed. It reduces the Sale's grand total and is not itself a Payment.
_Avoid_: Advance payment, settlement adjustment

**Catalog-backed Sale Item**:
A Sale Item must reference a Product and also store billing snapshots such as product name and price. Billing v1 does not support manual line items without a Product.
_Avoid_: Ad hoc line item, free-text product row

**Committed Sale**:
A Sale that has left draft and can participate in payment collection and customer balance effects. Payments are not attached to Draft Sales in billing v1.
_Avoid_: Editable paid draft, provisional settlement

**Collected Payment**:
A Payment records money that was actually received against a committed Sale. Unpaid balance is represented by the remaining amount on the Sale, not by a synthetic credit Payment.
_Avoid_: Credit placeholder payment, due row

**Partial Payment**:
Money collected that is less than a committed Sale's grand total. A Partial Payment leaves a due balance on the Sale and makes it a Receivable Sale.
_Avoid_: Discounted bill, soft close

**Voidable Sale**:
A committed Sale may be voided only if no Payments have been collected against it. Billing v1 does not support voiding paid Sales because refunds are out of scope.
_Avoid_: Post-payment void, accounting erase

**Committed Sale Number**:
A Sale Number is assigned when a Sale is committed, not while it is still a Draft Sale.
_Avoid_: Draft bill number, pre-commit sequence

**Store Device**:
A registered terminal that belongs to exactly one Store within an Organization and acts as the audit identity for billing activity created from that terminal.
_Avoid_: Browser device id, anonymous client id, generic handset

**Store Device Secret**:
A credential known to a specific Store Device and the organization administrators that is used with the Store Device id to authenticate billing access for that terminal.
_Avoid_: Public device code, anonymous token, generic password

**Device-Authenticated Billing Session**:
A billing session opened by a Store Device and locked to that device's Store for its lifetime. In billing v1, a user account by itself does not unlock sale creation and the session cannot switch stores.
_Avoid_: User-only billing session, open POS login

**Billing Device Attribution**:
In billing v1, each bill stores the Store Device that created it and the Store Device that most recently updated it, including updates caused by payment collection. Detailed per-action device history is deferred to a future activity log, and payments do not carry their own device id yet.
_Avoid_: Commit-only device audit, full v1 activity log

**Active Store Device**:
A Store Device whose status is `active` and is therefore allowed to open a Device-Authenticated Billing Session in billing v1.
_Avoid_: Store-enabled billing, user-enabled terminal

**Device-Scoped Billing Route**:
A billing API route whose organization and store scope are derived from the authenticated Store Device rather than taken from URL parameters.
_Avoid_: Tenant-param billing route, client-chosen store scope

**Store-Scoped POS Workflow**:
The complete billing workflow available to a Device-Authenticated Billing Session for its own Store, including draft sales, committing bills, collecting payments, voiding unpaid bills, customer lookup, and customer quick-create.
_Avoid_: Partial device checkout, mixed-auth billing flow

**Isolated Billing Session**:
A Device-Authenticated Billing Session that uses a separate auth channel from admin user auth so billing access cannot be unlocked by an admin session alone.
_Avoid_: Shared admin/POS session, fallback user-auth billing

**POS Route Tree**:
A dedicated frontend route tree and layout for device-authenticated billing, separate from the admin dashboard routes and user-authenticated management workspace.
_Avoid_: Embedded admin billing page, shared dashboard POS shell

**POS Device Login**:
The billing login flow where a Store Device opens the POS route tree and authenticates by entering its device id and device secret directly.
_Avoid_: Pre-provisioned silent login, admin-mediated billing unlock

**Store Billing History**:
The set of bills visible to a Device-Authenticated Billing Session for its Store, regardless of which Store Device originally created them.
_Avoid_: Device-private bill list, terminal-only history

**Cross-Device Bill Continuation**:
The rule that any Active Store Device in the same Store may continue work on that Store's bills, including draft edits, payment collection, and allowed void actions.
_Avoid_: Creator-device lock, single-terminal bill ownership

**Read-Only Admin Billing View**:
A user-authenticated management view that may inspect a Store's bills but cannot create or mutate billing data. Writing billing data requires a Device-Authenticated Billing Session.
_Avoid_: Admin-created bill, fallback user-auth POS action

**Dual-Mode Billing Workspace**:
A single billing workspace that renders in admin read-only mode for user sessions and in full POS mode for device sessions. In admin mode, billing creation controls are hidden; in device mode, the full Store-Scoped POS Workflow is available.
_Avoid_: Separate duplicated billing UIs, shared full-access admin POS

**Read-Only Draft Inspection**:
The rule that admin mode may view draft bills alongside committed and voided bills, but cannot create, edit, commit, collect payment for, or void any of them.
_Avoid_: Draft mutation from admin mode, committed-only admin history

**Mode-Scoped Store Selection**:
In the Dual-Mode Billing Workspace, admin mode may switch between stores for inspection, while device mode is locked to the authenticated Store Device's single Store.
_Avoid_: Admin-locked inspection store, switchable device POS store

**Persistent POS Session**:
A Device-Authenticated Billing Session stays active across reopen and refresh until the operator logs out or the Store Device is revoked or no longer active.
_Avoid_: Per-open device re-login, one-page POS session

**Organization-Scoped Billing Reference Data**:
In billing v1, a Device-Authenticated Billing Session uses the Organization's shared product catalog, categories, and customers while creating bills only within its own Store.
_Avoid_: Store-private v1 catalog, device-private customer list

**Add-On**:
An organization-scoped catalog item that may be attached to specific Products and selected under a parent Sale Item during billing. An Add-On is not sold by itself in the POS flow; it uses catalog-defined pricing that is snapshotted onto the bill when selected.
_Avoid_: Suggested product, independent sale item, upsell hint

**Concurrent Admin and POS Sessions**:
The same browser may hold an admin user session and an isolated device POS session at the same time, provided each continues to use its own auth channel and permissions.
_Avoid_: Forced shared logout, single-session admin/POS browser

**Revocation-Enforced POS Logout**:
If a Store Device becomes inactive or revoked, its open POS session is rejected on the next request and must return to the POS login screen.
_Avoid_: Revocation after token expiry only, stale active POS session

**POS Last Seen Tracking**:
The Store Device's `last_seen_at` timestamp is refreshed on successful authenticated POS requests so device presence reflects actual billing activity, not just login time.
_Avoid_: Login-only presence timestamp, stale active-device timestamp

**Split Billing Route Trust Model**:
Admin billing inspection uses tenant-scoped user-authorized read routes, while POS billing uses device-scoped routes whose store and organization scope come from the authenticated Store Device.
_Avoid_: Shared route trust model, device writes through tenant-selected scope

**Visible Device Audit**:
The bill's creating Store Device and last-updating Store Device are shown in both admin mode and device mode of the billing workspace.
_Avoid_: Hidden device attribution, admin-only audit label
