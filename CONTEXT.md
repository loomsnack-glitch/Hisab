# Hisab

Hisab is a multi-tenant retail/POS system for managing stores, products, sales, and money movement at the store level.

## Language

**Platform Administrator**:
A Ganatri owner or internal operator authorized to inspect cross-organization platform data. A Platform Administrator is represented by a separate Owner User, is distinct from an Organization's administrators, and has read-only access in Ganatri Console.
_Avoid_: Organization admin, tenant admin, superuser

**Owner User**:
An internal Ganatri identity stored separately from customer Users and used to sign in to Ganatri Console with a WhatsApp-enabled phone number and password. An active Owner User may create additional Owner Users and activate or deactivate them.
_Avoid_: Organization user, tenant user, customer administrator

**Active Owner User**:
An Owner User permitted to authenticate to Ganatri Console and use its read-only capabilities. An inactive Owner User is denied console access, including from an already-open session on its next authenticated request. Owner Users cannot deactivate themselves, and the final active Owner User cannot be deactivated.
_Avoid_: Enabled Organization User, active store device

**Seed Owner User**:
The first Owner User, created through a secure operator-run CLI command rather than a public registration route. Seed Owner Users and later Owner Users are managed only by active Owner Users through Ganatri Console.
_Avoid_: Public owner signup, organization registration

**Ganatri Console**:
The read-only internal Ganatri application at `console.ganatri.in` used by Platform Administrators to analyze Organization adoption and operational activity across the platform.
_Avoid_: Organization admin, customer dashboard, POS back office

**Ganatri Admin**:
The user-authenticated Ganatri application used by an Organization's administrators to manage that Organization's settings and business data. It is separate from Ganatri Console and Ganatri POS.
_Avoid_: Ganatri Console, POS, platform administration

**Ganatri POS**:
The device-authenticated Ganatri application used by a Store Device to perform its Store-Scoped POS Workflow. It is separate from Ganatri Admin and does not live under an Admin URL path.
_Avoid_: Admin POS route, embedded admin billing page, Ganatri Console
**Organization Inspection Workspace**:
The read-only Ganatri Console workspace selected from the Organization list, providing Platform Administrators a consistent, Admin-like way to inspect that Organization's Stores, Catalog, Billing, Customers, Reports, Tables, Purchases, and WhatsApp information without allowing mutations.
_Avoid_: Console edit mode, tenant administration workspace, organization impersonation

**Inspection URL**:
An authorization-protected Ganatri Console route that identifies an Organization Inspection Workspace state, including its selected Organization, section, resource detail, and supported filters. It survives refresh and participates in ordinary browser navigation.
_Avoid_: in-memory-only drill-down, unauthenticated shared link, modal-only inspection state

**Store-Filtered Billing Inspection**:
The Billing view in an Organization Inspection Workspace. It shows that Organization's bills across all Stores by default and can be limited to one Store; every bill retains its Store attribution.
_Avoid_: Organization-wide billing ownership, storeless bill list, tenant billing mutation

**Read-Only Sale Inspection**:
The Console presentation of a Sale's full lifecycle and historical record, including draft, completed, and voided Sales; line items; discounts; payments; Customer; Store; Store Device attribution; and receipt data. It never offers commands that create, change, settle, void, print, or message a Sale.
_Avoid_: Console checkout, payment collection, billing administration

**Console-Safe Operational Metadata**:
Non-secret configuration and operational state that a Platform Administrator may inspect in Ganatri Console, such as Store Device name, status, and last seen time or WhatsApp connection status. Reusable credentials—including Store Device Secrets, WhatsApp/API credentials, passwords, and authentication tokens—are never Console data.
_Avoid_: Console-visible secret, credential inspection, token export

**Active Store**:
A Store with at least one completed Sale in the preceding seven calendar days. This metric measures actual POS usage for Ganatri Console adoption analysis.
_Avoid_: Logged-in store, registered store, enabled store

**Active Organization**:
An Organization with at least one Active Store. An Organization with no Stores or no completed Sale from any Store in the preceding seven calendar days is inactive for Ganatri Console outreach analysis.
_Avoid_: Registered organization, enabled organization, active user account

**Platform Reporting Period**:
The bounded time interval used to calculate Ganatri Console activity and completed-Sale metrics. The console supports both all-time totals and operator-selected reporting periods, and its calendar-day boundaries use Asia/Kolkata time.
_Avoid_: Dashboard refresh time, organization lifetime

**Inspection Page Filter**:
A filter owned by one Organization Inspection Workspace page, such as Billing's Store, Sale status, payment, and date filters or a Report's date range. It defaults to that page's available Organization data and is independent of the Platform Reporting Period, which affects only Console adoption metrics.
_Avoid_: Dashboard-period detail filter, hidden drill-down restriction

**Organization Adoption Health**:
The set of platform-level usage signals used to prioritize outreach to an Organization, including its Store count, Active Store count, completed-Sale activity, customer count, and most recent completed Sale. It is visible in Ganatri Console's Organization list and detail view.
_Avoid_: Subscription status, account enabled state, customer health score

**Organization Directory**:
The responsive Ganatri Console list used to find and open an Organization Inspection Workspace. It presents each Organization's identity, creator, adoption health, and selected-period completed-sales value; supports organization-or-creator search, active/inactive filtering, and sorting; and defaults to most recently active Organizations.
_Avoid_: static tenant table, organization editor, unsorted account registry

**Completed Sales Value**:
The sum of `grand_total` across completed Sales in a Platform Reporting Period. It measures the value of bills generated through Hisab and is distinct from money collected through Payments.
_Avoid_: Revenue, collected payment total, cash received

**Customer Count**:
The number of Customer records an Organization has created, regardless of each Customer's current active status. In Ganatri Console it measures customer-data adoption, not the number of currently trading customers.
_Avoid_: Active customer count, customer engagement rate, registered user count

**Google Contacts Synchronization**:
The optional Organization feature that exports an eligible Customer's name and phone number into one connected Google account's personal Contacts. Each Organization has at most one connection. The exported Google Contact name may include a Google Contact Name Affix; the Customer name in Ganatri is unchanged. New or changed Customers with a phone number synchronize automatically after an administrator runs the initial catch-up sync; customers without one are skipped and their existing Google Contacts are left unchanged. A linked Google Contact follows later Customer name and phone changes unless the new phone number collides with another Google Contact; only the matching phone entry changes and any additional Google phone numbers are preserved. Synchronization never deletes a Google Contact and never blocks Customer or billing work: failed writes retry in the background.
_Avoid_: Contact import, two-way contact sync, Gmail sync

**Google Contacts Connection**:
An Organization's single authorized Google account and its protected authorization needed for Google Contacts Synchronization. The connection belongs to the Organization rather than to a Store or individual staff member; any authenticated Ganatri Admin user of that Organization may manage it, but Ganatri POS cannot. Disconnecting immediately stops synchronization and removes Ganatri's authorization without deleting existing Google Contacts; replacing it leaves the old account unchanged and makes the replacement a fresh sync destination.
_Avoid_: Store Gmail account, cashier connection, multiple account sync

**Google Contacts Sync Status**:
The Organization-visible state of Google Contacts Synchronization in Ganatri Admin, including the connected account, initial catch-up action, last successful sync, Google Contact Name Affix, and any conflicts or errors. It deliberately exposes no per-Customer sync rules or queue management in v1.
_Avoid_: Per-customer sync settings, contact job console, POS sync controls

**Google Contact Name Affix**:
An Organization-owned optional prefix and/or postfix applied only to the Google Contact display name during Google Contacts Synchronization so staff can recognize Contacts that came from Ganatri. It does not rename the Customer in Ganatri.
_Avoid_: Contact nickname, Google label, contact group, customer rename

**Google Contacts Sync Outbox**:
The dedicated persistent queue and worker that runs Google Contacts Synchronization independently of Customer and billing writes. It owns retryable delivery state, conflict/error reporting, and recovery; it is separate from the WhatsApp outbox.
_Avoid_: Synchronous Google write, WhatsApp outbox job, browser-side sync

**Google Contact Match**:
The one Google Contact with exactly the same normalized phone number as an eligible Customer. Hisab is authoritative for the matched Contact's name and matching phone entry, so synchronization updates those fields while preserving all other Google Contact data, including additional phone numbers; multiple exact matches are a conflict and none is changed automatically.
_Avoid_: Name match, fuzzy person match, Google-authoritative contact

**Billing**:
The part of the system that records a sale, its line items, and the payments collected against it. In this project, Billing is modeled through Sales and Payments rather than a separate invoice domain.
_Avoid_: Invoicing, bill book

**Payment Status**:
The settlement state of a Sale based on how much money has been collected against its grand total. A Sale may be pending, partial, or paid.
_Avoid_: Transaction status, order status

**Receivable Sale**:
A committed Sale whose payment status is pending or partial and therefore still has money owed. A Receivable Sale may be linked to a Customer, a Service Table, both, or neither.
_Avoid_: Customer-only due bill, synthetic unpaid payment

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
A human-friendly bill identifier assigned when a Sale is committed. It is unique within a Store for the current financial year, prints as a plain sequence (1, 2, 3…), and resets each financial year with no Store customization.
_Avoid_: UUID, internal id, FY-prefixed bill number, configurable reset period

**Token Number**:
A human-friendly queue token assigned when a Sale is committed. It is always enabled, resets daily in the Store timezone, and prints separately from KOT Numbers.
_Avoid_: Optional token toggle, configurable token reset period, KOT Number

**KOT Number**:
A human-friendly identifier assigned when a KOT is generated. Table and Parcel KOTs share one Store-local sequence that is separate from Sale Numbers and Token Numbers; it always resets daily with no Store customization. On the final bill, linked KOT Numbers print as KOT token numbers.
_Avoid_: Sale Number, Token Number, UUID, separate table and parcel sequences, configurable KOT reset period

**Sale Status**:
The lifecycle state of a Sale. In billing v1, a Sale may be draft, completed, or voided.
_Avoid_: Payment status, order state

**Sale Service Mode**:
The Dine-In or Pick-Up fulfillment mode stored on a Draft Sale or completed Sale and shown in bill details. A Table-Linked Sale always remains Dine-In, even when its Table Order contains Pick-Up KOTs. When KOT generation is selected, the dialog's fulfillment selection is copied to the generated KOT; for a table KOT, it does not change the Table-Linked Sale.
_Avoid_: Display-only order type, KOT-only fulfillment mode

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

**Service Table**:
A physical customer table configured for one Store, identified by a short Store-unique table label (shown as “Table no” in the UI). It may carry a positive whole-number seating capacity and a position in that Store's floor layout; a blank capacity means it is unknown.
_Avoid_: Organization table, shared table, seating chart item

**Service Area**:
A named grouping of a Store's floor, identified by a Store-unique title and an optional description. A Service Table may belong to at most one Service Area, or to none.
_Avoid_: Floor section, zone, room, named layout region

**Unassigned Service Table**:
A Service Table that does not belong to any Service Area. It can be assigned to a Service Area only while unassigned; moving it to another area requires unassigning it first.
_Avoid_: Unallocated table when referring to area membership, free-floating table

**Active Table Order**:
The single open Table Order currently linked to a Service Table. It groups that table's KOTs and becomes one Sale only at checkout.
_Avoid_: Active Table Sale, parallel table drafts, duplicate current bill, table cart

**Allocated Service Table**:
A Service Table that has been occupied by guests but has no Active Table Order yet. Allocation reserves the physical table without creating a Sale.
_Avoid_: Empty draft, free seated table, unstarted order

**Discarded Table Order**:
An Active Table Order intentionally abandoned before checkout because the guests left or the order is no longer wanted. Discarding it removes its uncommitted KOTs and frees its Service Table without creating a financial bill.
_Avoid_: Discarded Table Draft, void completed sale, unpaid cancellation, retained abandoned cart

**KOT System**:
An optional Store feature that enables KOT generation. KOTs may be used for table service only when the Store also enables Table Management.
_Avoid_: Table Management, required restaurant workflow, table-only KOT feature

**Table Order**:
The non-financial parent record for a seated party's service, which collects one or more KOTs before checkout. A Table Order belongs to exactly one Service Table and produces at most one final Sale.
_Avoid_: Draft Sale, table cart, parallel table bill

**Kitchen Order Ticket (KOT)**:
An editable, non-financial kitchen work order for one batch of food or drink items. A KOT may belong to a Table Order or be standalone, and its fulfillment type is Dine-In or Pick-Up. A standalone KOT is created alongside the Sale that the cashier saves as a Draft Sale or places as a completed Sale; a later KOT for that Sale contains only newly added items. Each KOT item retains the trusted product configuration and price at KOT generation; editing a KOT does not require a change printout for the kitchen, and only its remaining items at checkout contribute to the final Sale.
_Avoid_: Final bill, completed sale, immutable kitchen ticket

**Parcel KOT**:
A KOT whose fulfillment type is Pick-Up. A standalone Parcel KOT may accompany either a Draft Sale or a completed Sale; a Parcel KOT in a Table Order remains part of that order and is paid at the table's final checkout.
_Avoid_: Tableless KOT, separate parcel sale for a table order, all standalone KOTs

**Table-Linked Sale**:
A Sale associated with a Service Table as the setting in which it was ordered. The association may remain as historical context after the table is released for another guest.
_Avoid_: Customer-required table bill, anonymous table history

**Released Table Due**:
A Receivable Sale whose Service Table has been released for reuse before its balance was collected. Releasing the table preserves the sale's original table association and does not write off or otherwise settle the balance.
_Avoid_: Deleted table bill, forgiven balance, lost table history

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

**POS Application Route Tree**:
The root route tree of Ganatri POS, dedicated to device-authenticated billing and separate from Ganatri Admin's user-authenticated management routes.
_Avoid_: Embedded admin billing page, Admin `/pos` route, shared dashboard POS shell

**POS Device Login**:
The billing login flow where a Store Device opens the POS route tree and authenticates by entering its device id and device secret directly.
_Avoid_: Pre-provisioned silent login, admin-mediated billing unlock

**Store Billing History**:
The set of bills visible to a Device-Authenticated Billing Session for its Store, regardless of which Store Device originally created them.
_Avoid_: Device-private bill list, terminal-only history

**Cross-Device Bill Continuation**:
The rule that any Active Store Device in the same Store may continue work on that Store's bills, including draft edits, payment collection, and allowed void actions.
_Avoid_: Creator-device lock, single-terminal bill ownership

**Role-Neutral Table Access**:
The rule that any Active Store Device for a Store may perform all table-service actions. In the initial table-service release, labels such as waiter and cashier describe operating roles rather than system-enforced permissions.
_Avoid_: Waiter-only device, cashier-only device, table role authorization

**Read-Only Admin Billing View**:
A user-authenticated management view that may inspect a Store's bills but cannot create or mutate billing data. Writing billing data requires a Device-Authenticated Billing Session.
_Avoid_: Admin-created bill, fallback user-auth POS action

**Separated Billing Views**:
Ganatri Admin provides user-authenticated, read-only billing inspection, while Ganatri POS provides the full device-authenticated Store-Scoped POS Workflow. The two views are delivered by separate applications but retain their respective authorization boundaries.
_Avoid_: Shared dual-mode workspace, shared full-access admin POS, admin-created bill

**Read-Only Draft Inspection**:
The rule that admin mode may view draft bills alongside committed and voided bills, but cannot create, edit, commit, collect payment for, or void any of them.
_Avoid_: Draft mutation from admin mode, committed-only admin history

**Application-Scoped Store Selection**:
Ganatri Admin may switch between Stores for read-only inspection, while Ganatri POS is locked to the authenticated Store Device's single Store.
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

**Product Code**:
The single optional identifier used to find one Product during scanning within an Organization. Scanner transport terminators are removed, but the code itself is otherwise preserved as text; a Product has at most one active Product Code in V1, inactive Products retain their code reservation, and clearing, replacing, or permanently deleting a code-bearing Product immediately stops the old value from resolving and releases it for reassignment. Distinct sellable packaging variants are modeled as separate Products.
_Avoid_: Alias list, barcode collection, SKU when referring specifically to the scan identifier

**Manufacturer Product Code**:
A code already printed on a Product by its manufacturer or brand owner; Hisab stores the received value as opaque text and does not validate, generate, or claim ownership of it.
_Avoid_: Hisab barcode, internal label code

**Internal Product Code**:
A store-only 13-digit code generated by Hisab, beginning with `04` and including a calculated check digit, only through an explicit administrator action for a fixed-count Product that has no Manufacturer Product Code. It identifies the Product inside the Organization but is not a globally registered identifier; after release, reuse requires another explicit administrator action rather than automatic sequence recycling.
_Avoid_: Fake GS1 identifier, globally registered GTIN

**Label Stock**:
The physical sticker media an Organization prints onto, defined in millimetres by width, height, labels per row, horizontal gap, and feed-direction gap, and whether the media is a sheet or a roll.
_Avoid_: Custom size, paper size when referring to the sticker, printer settings as a substitute for design

**Label Template**:
An Organization-owned printable design that combines Label Stock, Keep-Outs, and Label Elements. A layout is stored as data the Organization owns, not as a hardcoded software layout.
_Avoid_: Layout enum, preset sticker, custom size when referring to the design

**Keep-Out**:
A millimetre rectangle on Label Stock where the printer must not draw, covering pre-printed branding, holograms, or other stock that Hisab does not reprint.
_Avoid_: Margin, header percent, unprintable zone

**Label Element**:
A positioned drawable on a Label Template such as bound text, static text, a barcode, a table, a box, or an image, with millimetre geometry and optional rotation.
_Avoid_: Line 1, header slot, fixed field stack

**Label Job**:
One print run of a Label Template for a Product, including copy count and values that change per packing run such as packed date, expiry date, and batch number.
_Avoid_: Print layout, template settings, catalog identity

**Product Label Profile**:
Optional packaging facts stored on a Product for label binding, such as ingredients, nutrition rows, net weight, unit selling price text, shelf life in days, and On-pack MRP. These facts are not billing prices and are not written onto Sale Item snapshots.
_Avoid_: Inventory batch, FSSAI certificate, selling price when referring to on-pack MRP

**On-pack MRP**:
The maximum retail price printed on a label from the Product Label Profile. It is packaging text, distinct from the Product selling price used in Billing.
_Avoid_: Selling price, catalog price, bill MRP
