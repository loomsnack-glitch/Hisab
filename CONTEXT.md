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

**Trusted Catalog Snapshot Pricing**:
In POS billing, the frontend sends only the selected catalog identities and quantities for Products and Add-Ons. The backend loads the trusted catalog price and discount from the database and writes the billing snapshots itself rather than accepting cashier-supplied unit prices or discounts.
_Avoid_: Cashier-side price override, client-trusted pricing, raw billed amount input

**Selection-Only Billing Payload**:
For configured product billing, the frontend sends the parent Product id, the parent quantity, and only the selected Add-On ids plus quantities greater than zero. The backend is responsible for normalizing the Add-On set, deriving the Configured Sale Item Signature, applying merge rules, and writing all trusted pricing and snapshot fields.
_Avoid_: Client-built signature, frontend-computed totals, client-authored snapshot rows

**Atomic Configured Line Validation**:
When billing receives a configured Product selection, the whole line is accepted only if every selected Add-On is valid for that Product, active in the required places, non-duplicated, and within its `Add-On Selection Cap`. Billing does not silently drop or partially accept invalid Add-On selections.
_Avoid_: Best-effort add-on acceptance, silent invalid-option drop, partial configured line save

**Discount**:
A reduction applied to a Sale or Sale Item before the final amount is collected. Billing v1 supports simple discounts and does not model tax.
_Avoid_: Offer engine, tax rule

**Order-Level Discount**:
A Discount applied to the whole Sale after configured line pricing is computed. It reduces the Sale's grand total across parent Products and their selected Add-Ons and is not itself a Payment.
_Avoid_: Advance payment, settlement adjustment

**Sale-Level Order Discount Allocation**:
In billing v1, an Order-Level Discount stays represented at the overall Sale level instead of being proportionally pushed down into parent Product rows and Add-On child rows. Product and Add-On catalog discounts remain row-level pricing inputs, while sale-wide discount stays a separate sale-level reduction.
_Avoid_: Forced per-row allocation, hidden child discount apportionment, rounding-heavy discount spread

**Catalog-backed Sale Item**:
A Sale Item must reference a Product and also store billing snapshots such as product name and price. Billing v1 does not support manual line items without a Product.
_Avoid_: Ad hoc line item, free-text product row

**Whole-Count Sale Quantity**:
Sale quantity in Hisab is always a whole-item count for both Products and selected Add-Ons. Billing does not support fractional sale quantities such as `1.5`, so every layer must reject decimal quantities rather than silently rounding or storing them.
_Avoid_: Fractional item quantity, weight-style sale count, decimal cart quantity

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
An organization-scoped catalog item that may be attached to many different Products and selected under a parent Sale Item during billing. An Add-On is not sold by itself in the POS flow; it uses catalog-defined pricing and discount that are snapshotted onto the bill when selected, attached Add-Ons are optional unless the model later grows explicit requirement rules, and the Add-On itself has its own active/inactive lifecycle.
_Avoid_: Suggested product, independent sale item, upsell hint

**Add-On Discount**:
A Discount defined on the Add-On itself and applied to the Add-On portion of billing separately from any Discount on the parent Product. Parent Product pricing rules do not implicitly change Add-On pricing rules.
_Avoid_: Inherited product discount, bundled hidden markdown, parent-only discount logic

**Retired Add-On**:
An Add-On that is no longer offered for future billing but remains in the system for historical bill snapshots, product attachment integrity, and reporting. In the initial model, retiring an Add-On happens through its active/inactive status rather than destructive deletion once it has dependencies or billing history, and inactive Add-Ons stop appearing for new customize actions immediately while already-added Draft Sale lines keep their frozen snapshots until removed.
_Avoid_: Hard-deleted historical add-on, erased modifier, dangling attachment

**Organization Add-On Catalog**:
The flat organization-level list of Add-Ons available to be attached directly to Products. In v1, Add-Ons do not have their own category tree because Products already provide the main POS browse structure.
_Avoid_: Add-on category hierarchy, per-product private add-on list, nested modifier catalog

**Add-On Selection Cap**:
The maximum whole-number quantity of a specific Add-On that may be chosen for one eligible Product when that Add-On is attached to the Product. In the initial model, this per-product attachment rule defaults to `1` unless the organization configures a higher cap, and the cap may differ across Products for the same Add-On.
_Avoid_: Max cap, unlimited checkbox count, global add-on stock

**Product Add-On Attachment**:
The rule that links one Product to one Add-On and makes that Add-On selectable for that Product in the POS flow. In v1, the attachment owns eligibility plus the per-product Add-On Selection Cap, while Add-On price and discount stay owned by the Add-On itself, the attachment has its own active/inactive lifecycle independent of the global Add-On, and a given Product/Add-On pair appears at most once. Inactive attachments stop appearing for new customize actions immediately while already-added Draft Sale lines keep their frozen snapshots until removed.
_Avoid_: Per-product add-on price override, duplicated add-on catalog row, free-floating cap rule

**Configured Sale Item**:
A Sale Item is defined by its parent Product plus its selected Add-On quantities. Two selections of the same Product with different Add-On combinations are different Configured Sale Items and therefore appear as separate lines in a Draft Sale, the selected Add-On quantities are defined per one parent product unit, and one Configured Sale Item may include multiple different Add-Ons at the same time.
_Avoid_: Plain product row, merged product regardless of add-ons, mutable cart option set

**Sale Item Configuration Merge**:
When the same Product is added again with the exact same Add-On selection, Billing increases the existing Configured Sale Item quantity instead of creating a duplicate line. Different Add-On selections stay on separate lines even when the parent Product is the same, and a customize action with no selected Add-Ons merges into the plain Product line.
_Avoid_: Always duplicate line, merge by product only, ignore add-on signature

**Configured Sale Item Signature**:
The identity rule for a Configured Sale Item is the parent Product plus its selected Add-On quantities, not the parent Product id alone. This signature is based on the normalized Add-On set and quantities rather than the order the operator clicked them, and it replaces the simpler billing v1 assumption that a Draft Sale can contain only one line per Product.
_Avoid_: Product-only uniqueness, duplicate-product rejection, parent-only line identity

**Persisted Configuration Signature**:
The normalized `Configured Sale Item Signature` is stored on the parent `sale_item` itself so billing can merge matching configurations, keep different configurations separate, and query configured lines efficiently without rebuilding identity from child Add-On rows on every write.
_Avoid_: Recomputed-only line identity, child-row-only merge key, product-only draft merge

**Frozen Add-On Selection**:
Once a Configured Sale Item has been added to a Draft Sale, its Add-On selection does not change in place. The operator may increase or decrease the line quantity, or remove the line entirely and add a new configuration, but does not edit the selected Add-Ons on that existing line. Later catalog changes to Add-On price, discount, status, selection cap, attachment active state, or parent Product active state do not rewrite that already-added Draft Sale line or block committing that already-configured Draft Sale.
_Avoid_: In-cart add-on editing, mutable option set, live line reconfiguration

**Parent-Scoped Add-On Sale Record**:
Selected Add-Ons belong under the parent Product Sale Item they were chosen for so reporting can attribute add-on sales back to that parent Product. Add-On sales are analyzed in the context of the parent Product, also remain aggregatable by Add-On across all Products, and stay visible as nested child lines in bill details and receipt output.
_Avoid_: Standalone add-on sale, detached extra row, parentless modifier sale

**Sale Item Add-On Row**:
The child billing record stored under a parent `sale_item` for one selected Add-On in a configured product line. In v1, Hisab keeps `sale_items` as the parent product rows and models selected Add-Ons through child sale records rather than replacing the whole sale-item structure.
_Avoid_: Flattened parent-only snapshot, standalone add-on sale line, full sale-item replacement model

**Sale Item Add-On Snapshot**:
Each `Sale Item Add-On Row` stores its own historical billing snapshot, including Add-On name, trusted unit price, trusted unit discount, selected quantity per parent unit, computed total quantity for the parent line, and computed subtotal/discount/total amounts. This preserves receipt and reporting history even if the Add-On catalog changes later.
_Avoid_: Live add-on catalog lookup, parent-only hidden pricing, unsnapshotted modifier history

**Parent-Only Sale Item Money**:
When a configured product line has child Add-On rows, the parent `sale_item` money fields represent only the parent Product portion of pricing. Add-On pricing lives on the child rows, and sale-level totals are computed from the sum of parent product rows plus their child Add-On rows.
_Avoid_: Parent row includes child money, double-counted configured line total, mixed parent-child pricing meaning

**Two-Layer Sale Totals**:
Sale `subtotal`, `discount_total`, and `grand_total` are computed from both pricing layers of billing data: the parent `sale_items` and their child `sale_item_add_ons`. A configured product line is therefore priced by summing the parent Product row with its selected Add-On rows, not by treating the parent row alone as the whole billable amount.
_Avoid_: Parent-only sale total math, hidden child-price omission, undercounted configured sale

**Single-Level Add-On Tree**:
Add-Ons may be selected only under a parent Product Sale Item. In v1, an Add-On cannot itself have child Add-Ons, so billing configuration stops at one parent-product level plus one add-on level.
_Avoid_: Recursive modifiers, nested extras, add-ons on add-ons

**Customize-Only Add-On Selection**:
In the POS workflow, tapping a Product normally adds the plain base Configured Sale Item with no Add-Ons, even when that Product has attached Add-Ons available. Selecting Add-Ons happens only through an explicit customize action for that Product, and each available Add-On starts at selected quantity `0` unless the operator increases it.
_Avoid_: Forced customization on every tap, implicit add-on picker, normal-tap configured item

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
