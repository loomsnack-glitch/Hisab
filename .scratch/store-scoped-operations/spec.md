# Store-scoped operations

Status: ready-for-agent

## Problem Statement

An Organization with more than one Store, such as Panini Hose with Surat and Ahmedabad branches, currently shares one effective product menu and vendor catalogue across every Store. The owner cannot give a Store its own active product menu, selling price, discount, vendor list, or default vendor-item purchase price without duplicating Organization data. Customer credit is also currently Organization-wide, which allows one Store to settle another Store's receivable even when the business wants branch-level accountability.

The application needs Store-specific operational configuration without making every module independently configurable as either "Organization-based" or "Store-based." That generic choice would create incompatible combinations, unsafe migrations, and unclear reporting.

## Solution

Keep the natural ownership of each domain concept fixed, and introduce Store-specific configurations only where the business needs them.

Catalog Products, Categories, Units, Vendors, Vendor Items, and Customers remain Organization-owned shared definitions. The Organization creates Catalog Products and Vendors, selects their target Stores, and owns all shared descriptive data. Stores cannot create private product, vendor, or vendor-item definitions.

A Store Product Offering controls whether an existing Catalog Product appears in one Store's menu and owns that Store's selling price, discount, and active/inactive status. A Store Vendor Availability controls whether an existing Vendor can be selected for a Store Purchase. A Store Vendor Item Offering owns the default purchase price of an existing Vendor Item at one Store.

Customers are shared identities, but each Store has an independent Store Customer Account and Customer Ledger. One Store may find and use an existing Customer created by another Store, but it starts or uses only its own balance. A Store cannot collect or settle another Store's receivable.

Sales, Tables, Purchases, Expenses, and their related financial history remain Store-attributed. Money Accounts continue to support both Store-Scoped and Organization-wide accounts. Organization Reports aggregate Store-attributed data and may be filtered to one Store; the Store workspace shows only the selected Store's data.

Ganatri Admin presents two explicit contexts instead of dynamically redefining sidebar modules: an Organization workspace for shared setup and all-Store reporting, and a selected Store workspace for Store menu, local vendor usage, tables, billing, purchases, expenses, money, and Store reports. UI visibility is convenience only; backend validation remains authoritative.

## User Stories

1. As an Organization administrator, I want to create an Organization and its Stores, so that all Store operations remain within one business.
2. As an Organization administrator, I want to create a Catalog Product once with shared name, image, category, unit, default selling quantity, and other catalog details, so that the same item does not have duplicate definitions.
3. As an Organization administrator, I want to select one or more target Stores while creating a Catalog Product, so that I decide exactly where it first appears.
4. As an Organization administrator, I want a new Catalog Product creation form to select all existing Stores by default, so that a normally shared menu remains quick to create while allowing exceptions.
5. As an Organization administrator, I want to add an existing Catalog Product to another Store later, so that a previously local menu item can become shared without recreation.
6. As an Organization administrator, I want to remove or deactivate a Store Product Offering, so that the product no longer appears for new sales at that Store without damaging another Store's menu or sale history.
7. As an Organization administrator, I want Surat and Ahmedabad to set different selling prices for the same Catalog Product, so that each branch can follow its local commercial needs.
8. As an Organization administrator, I want Surat and Ahmedabad to set different discounts and active statuses for the same Catalog Product, so that each branch controls its own live menu.
9. As a Store operator, I want POS to show only active Store Product Offerings for my authenticated Store, so that I cannot accidentally sell an item unavailable at my branch.
10. As an Organization administrator, I want shared Catalog Product details to update consistently across its target Stores, so that the same product remains the same product everywhere.
11. As an Organization administrator, I want to create a Vendor once and choose its target Stores, so that local vendor lists are separate without duplicate vendor records.
12. As an Organization administrator, I want a Vendor assigned only to Ahmedabad to be unavailable in Surat's Purchase workflow, so that each branch sees only usable suppliers.
13. As an Organization administrator, I want to assign an existing Vendor to another Store later, so that a local vendor can become available elsewhere without re-entry.
14. As an Organization administrator, I want to set a different default purchase price for the same Vendor Item at Surat and Ahmedabad, so that new Purchases begin with the relevant local quote.
15. As a purchaser, I want to override the suggested purchase price on an individual Purchase when the agreed price differs, so that the Purchase Line records the real transaction.
16. As an Organization administrator, I want all Vendor and Vendor Item identities to remain Organization-managed, so that Stores cannot create private or duplicate vendor catalogues.
17. As a Store cashier, I want to find an existing Organization Customer by identity or phone number, so that customers are not duplicated between branches.
18. As a Store cashier, I want a Customer first used at my Store to have a zero balance at my Store, so that their balance at another Store does not appear as a local due amount.
19. As a Store cashier, I want a Customer's credit sale and later collection to affect only my Store's Customer Account, so that branch receivables remain accountable to the Store that created them.
20. As an Organization owner, I want to see each Customer's Store balances separately and an explicitly labelled aggregate for visibility, so that I can understand total exposure without treating it as one cross-Store collectible amount.
21. As a Store operator, I want each Table, open Table Order, Sale, Purchase, Expense, and payment history to remain attributed to my Store, so that branch operations cannot be mixed.
22. As an Organization owner, I want Store Cash Accounts and Store UPI accounts to stay separate, so that each Store's money balance is accurate.
23. As an Organization owner, I want an Organization-wide bank account to be usable where applicable from multiple Stores, so that shared banking remains possible.
24. As an Organization owner, I want Organization Reports to show totals across all Stores and a Store-by-Store breakdown, so that I can manage the business as a whole.
25. As an Organization owner, I want to filter an Organization Report to a single Store, so that I can investigate one branch without losing the all-Store view.
26. As an administrator, I want the Organization workspace and the selected Store workspace to be visibly distinct, so that I understand whether I am editing shared setup or one Store's operational configuration.
27. As an existing Organization administrator, I want the rollout to preserve existing product menus, vendor usage, historical sales, purchases, expenses, and money records, so that enabling multi-Store configuration does not silently change current operations.

## Implementation Decisions

- Do not implement generic per-module Organization/Store ownership toggles. Ownership is fixed by the domain model and Store-specific behavior is expressed through explicit configuration records.
- Extend the existing Catalog module with Store Product Offerings. The module owns creation, listing, updating, activation, deactivation, assignment, and validation of product availability for a Store.
- A Store Product Offering references one Organization-owned Catalog Product and one Store in the same Organization. It owns selling price, discount, active/inactive status, audit data, and the Store-specific relationship. A Catalog Product can have at most one Offering per Store.
- Catalog Product identity and descriptive configuration remain shared: name, image, category, unit, default selling quantity, product type, composition, add-on attachments, and other non-commercial presentation or definition fields. Store workspaces cannot create a Catalog Product or override those fields.
- Creating a Catalog Product requires target Store identifiers. The Organization catalog UI preselects all current Stores; the backend validates that every target Store belongs to the Organization and creates the Product plus its Offerings atomically.
- The Store workspace may manage only existing Store Product Offerings: add an existing Organization Catalog Product, edit price/discount/status, or remove/deactivate the Offering. It must not expose Catalog Product creation or shared-detail editing.
- Adapt POS product discovery, cart pricing, and bill creation to resolve the active Store Product Offering for the device's authenticated Store. The backend, rather than the client, loads the Store offering's price and discount and writes snapshots. A missing or inactive Offering is rejected even if the caller knows the Catalog Product identifier.
- Preserve historical Sale Item snapshots and Catalog Product references. A later Store Product Offering change must not modify an existing Sale, Sale Item, KOT, or receipt.
- Extend the existing Vendors module with Store Vendor Availability and Store Vendor Item Offerings. The module owns Vendor assignment to Stores, Store Vendor Item default-price maintenance, Store-filtered listings, and Purchase eligibility validation.
- A Store Vendor Availability references one Organization Vendor and one Store in the same Organization. A Vendor may be assigned to selected Stores only; Stores never create private Vendors or vendor approval requests.
- A Store Vendor Item Offering references an existing Vendor Item and an eligible Store Vendor Availability. It owns that Store's default purchase price. The agreed unit price on a Purchase Line remains authoritative historical data and may differ from the default.
- Creating a Vendor requires target Store identifiers, using the same central assignment flow as Catalog Product creation. Vendor Item creation/configuration remains Organization-owned; its Store price offerings are maintained for the Stores where its Vendor is available.
- Adapt Purchase creation and editing to list and accept only the Store's assigned Vendors and Vendor Items. The backend rejects a Vendor or Vendor Item that is unassigned, inactive, from another Organization, or used with the wrong Store.
- Extend the existing Billing module with Store Customer Accounts. Customers remain Organization identities and are searchable from every Store, but a Customer's balance and Customer Ledger are Store-specific.
- A Store Customer Account references one Customer and one Store in the same Organization and has at most one current account per pair. Selecting an existing Customer in a new Store creates or resolves that Store's account at zero.
- Attribute every Customer Ledger entry to its Store Customer Account. A Receivable Sale, its payment, void reversal, and manual adjustment affect only the account for the Sale's Store. Cross-Store collection and settlement are rejected by the backend.
- Organization customer views and Organization Reports may display an aggregate of Store Customer Accounts only as a labelled visibility total. It is not a settlement target and does not reintroduce a global collectible balance.
- Keep Tables, Sales, Purchases, Expenses, and their dependent records Store-attributed. Keep Units and Expense Categories Organization-owned. Retain the existing mixed Money Account model: Store-Scoped accounts are usable at one Store, Organization-wide accounts may be available across Stores.
- Treat Reports as read-only scope-aware queries. Organization Reports aggregate Store-attributed data and permit a Store filter; selected Store reports are automatically limited to that Store. Report scope never changes data ownership or authorizes a cross-Store operation.
- Add an explicit Organization workspace and selected Store workspace to Ganatri Admin navigation. The Organization workspace owns Stores, shared Catalog Product creation and details, shared Vendor creation and details, Units, Customers, and all-Store reports. The selected Store workspace owns Store Product Offerings, Store Vendor configuration, Tables, Billing views, Purchases, Expenses, Money, and Store reports.
- Backend authorization and Store/Organization foreign-key validation are mandatory on every Store-specific operation. Hiding a navigation item or filtering a client list is not authorization.
- Add migrations for Store Product Offerings, Store Vendor Availability, Store Vendor Item Offerings, and Store Customer Accounts. Use composite Organization/Store foreign keys and uniqueness constraints to prevent cross-Organization associations and duplicate configurations.
- Migrate current Catalog Product price, discount, and active/inactive status into an Offering for every existing Store in the same Organization, preserving the current shared-menu behavior on rollout.
- Migrate current Vendors and Vendor Items into availability and price offerings for every existing Store in the same Organization, preserving current purchasing behavior on rollout.
- Migrate historical customer entries only with proven Store attribution from their related Sale or Payment. Do not silently split a legacy Organization-wide outstanding balance. Provide an Organization-admin allocation workflow that assigns each unresolved legacy balance to one or more Store Customer Accounts before Store-segregated credit becomes active for that Customer.

## Testing Decisions

- Test external behavior through the existing Catalog, Vendors, Billing, Purchases, Money Accounts, and route seams. Do not test private implementation structure or UI component internals.
- Add migration tests that prove existing Organization-wide product/menu and vendor behavior backfills to all existing Stores without dropping history or changing effective price/status/defaults.
- Add Catalog service and route tests for target-Store validation, atomic Product-and-Offering creation, duplicate-offering prevention, Store-specific price/discount/status changes, and rejection of a Store-private Product creation path.
- Add POS/Billing integration tests showing that an active Offering is sellable at its Store with trusted Store price/discount snapshots, while an inactive or absent Offering is unavailable and server-rejected. Verify past Sale Items remain unchanged after later offering edits.
- Add Vendors service, route, and Purchase integration tests for Store-specific Vendor visibility, Store Vendor Item default price selection, differing Store defaults for the same Vendor Item, actual Purchase Line override and snapshot behavior, and rejection of unassigned vendor/item use.
- Add Billing service and route tests for Organization-wide Customer lookup, first use at a new Store creating a zero Store Customer Account, Store-local receivable/payment/void/adjustment effects, and rejection of a cross-Store collection attempt.
- Add report-query tests for all-Store aggregate totals, per-Store breakdowns, selected-Store filters, and correctly labelled non-collectible aggregate Customer balance visibility.
- Add Admin route/page behavior tests for context switching, Organization versus Store navigation, target-Store selection on central Product/Vendor creation, Store Offering editing, and no Catalog Product/Vendor creation control in the Store workspace.
- Reuse the repository's existing service test harnesses, route tests, database migration conventions, POS behavior tests, and Admin page tests as prior art.

## Out of Scope

- A user-configurable per-module Organization/Store ownership switch.
- Store-private Catalog Products, Vendors, Vendor Items, Categories, Units, or Customers.
- Store-specific overrides for Catalog Product name, image, category, unit, default selling quantity, product composition, or add-on attachments.
- Store-specific Add-On price rules, inventory, stock transfers, vendor approval workflows, supplier contracts, procurement orders, or advanced purchasing permissions.
- A cross-Store customer payment, automatic receivable transfer, or an Organization-wide collectible customer balance.
- Changing the ownership of Tables, Sales, Purchases, Expenses, Units, Expense Categories, or existing Money Account scope rules.
- New staff-role or approval workflow design beyond current authorization.
- Changes to commercial licensing or feature-entitlement semantics.

## Further Notes

- The domain terms and decisions for this work are recorded in the root context glossary and ADRs 0041 through 0044.
- Existing commercial licensing remains Store-scoped even where a Store uses shared Organization setup; Store configuration must continue to respect the applicable Feature Entitlement.
- The Store Customer Account migration requires special care because prior data models Customer balance at the Organization level. Historical entries with a known Sale/Payment Store can be attributed automatically; otherwise, an explicit owner allocation is necessary to avoid inventing financial history.
