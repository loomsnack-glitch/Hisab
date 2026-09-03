# Commercial Catalog Management in Ganatri Console

Status: ready-for-agent

## Problem Statement

Ganatri needs to configure its commercial offerings from Ganatri Console instead of hard-coding plans and feature groupings. Platform Administrators need a safe, flexible way to define reusable Features, bundle them into Modules, and bundle Modules into Plans, with clear pricing and terms per Store. The initial offerings are a seven-day free Trial, ₹2,999/year Core, and ₹4,999/year Pro, but the catalog must remain easy to evolve as Ganatri changes its packaging.

Today Ganatri Console is an internal read-only inspection application. The Commercial Catalog is a deliberately narrow management area in Console: it changes only platform-owned commercial configuration and never Organization business data.

## Solution

Add an Owner User-authenticated Commercial Catalog area to Ganatri Console, backed by the Platform module. Platform Administrators can create, revise, publish, retire, and inspect Plans, Modules, and Features.

The catalog has a strict reusable hierarchy:

```text
Plan revision → Module revisions → Feature revisions
```

- A Plan contains Modules only; it never contains Features directly.
- A Module contains one or more Features and can appear in multiple Plans.
- A Feature can appear in multiple Modules and is never sold directly.
- Plans and Modules carry their commercial prices and terms. Prices are per Store.
- Active definitions are immutable. A change is made by creating and publishing a successor revision; historical Active and Retired revisions remain visible.
- The catalog is configuration only. It does not sell, collect payment for, grant, revoke, or enforce access.

The Console seeds and displays the agreed initial catalog, while leaving subsequent catalog composition fully Console-driven.

## User Stories

1. As a Platform Administrator, I want a Commercial Catalog area in Ganatri Console, so that I can manage platform-owned offerings without editing Organization data.
2. As a Platform Administrator, I want to list Features with their display name, immutable key, status, and revision, so that I can understand the available capabilities.
3. As a Platform Administrator, I want to create a Draft Feature with a unique immutable lowercase key, display name, and description, so that a capability can be packaged commercially.
4. As a Platform Administrator, I want to revise a published Feature instead of editing it in place, so that historical commercial definitions remain meaningful.
5. As a Platform Administrator, I want to discard an unused Draft Feature revision, so that accidental unfinished work does not clutter the catalog.
6. As a Platform Administrator, I want to retire a Feature revision, so that it is unavailable for future catalog composition while its history remains retained.
7. As a Platform Administrator, I want to create a Draft Module by selecting one or more Feature revisions, so that I can form reusable workflow bundles.
8. As a Platform Administrator, I want the same Feature to appear in multiple Modules, so that Ganatri can offer different packages without duplicating a Feature.
9. As a Platform Administrator, I want to mark a Module as separately purchasable and define its commercial price and term, so that it can later be offered as a Store add-on.
10. As a Platform Administrator, I want to publish a Module only as a fixed revision with its selected Features, price, and term, so that a later purchase record can reference the exact offering.
11. As a Platform Administrator, I want to create a Draft Plan with a type, price, term, and selected Module revisions, so that I can create reusable Store offerings.
12. As a Platform Administrator, I want Plans to select Modules but never Features directly, so that all Feature packaging stays understandable and reusable.
13. As a Platform Administrator, I want to publish a Plan revision and retire its predecessor when a material commercial change is ready, so that new Store Licenses can use the new offering without rewriting past configuration.
14. As a Platform Administrator, I want to see a Plan's included Modules and the Features reached through those Modules, so that I can review what a customer would receive.
15. As a Platform Administrator, I want to see a Module's included Features and every Plan that currently includes that Module, so that I can assess the impact of changing its successor revision.
16. As a Platform Administrator, I want revision history and who created, published, retired, or discarded a revision, so that commercial changes are auditable.
17. As a Platform Administrator, I want the Trial Plan to be an ordinary zero-price Plan type with a seven-day term, so that it uses the same catalog model as paid plans.
18. As a Platform Administrator, I want the initial Trial Plan to include every initial Module, so that a trial Store can explore the full starting product range.
19. As a Platform Administrator, I want Core to include only the agreed fundamental operations and catalog setup, so that it remains the normal billing-focused Store offering.
20. As a Platform Administrator, I want Pro to include Core plus Finance and Restaurant Operations, while keeping Integrations separately purchasable, so that Ganatri can package advanced workflows independently.
21. As a Platform Administrator, I want to use stable keys even when a plan or module's marketing name changes, so that later access checks and history are not coupled to promotional wording.
22. As a Platform Administrator, I want the Console to permit my deliberate module composition without an automated workflow-dependency engine, so that commercial packaging remains flexible and I retain responsibility for valid bundles.
23. As an Active Owner User, I want the Commercial Catalog API to reject unauthenticated and inactive owners, so that only authorized internal operators can change commercial configuration.
24. As a future product developer, I want a Feature's immutable key available to product access checks, so that implementing a later capability can connect it to the catalog without relying on a mutable display name.
25. As a future commercial workflow, I want each plan and add-on definition to retain its price and term, so that a future Store License can calculate co-term add-on pricing without altering the catalog's historical revisions.

## Implementation Decisions

- Extend Ganatri Console and the existing owner-authenticated Platform module; do not create a separate platform application or tenant-management route family.
- The Commercial Catalog is the platform-owned configuration of Plans, Modules, and Features. It is writable only by Active Owner Users. Organization Inspection Workspaces remain read-only.
- Use three stable commercial identities—Feature, Module, and Plan—each with a unique immutable lowercase Commercial Catalog Key and a separately editable display name. A retired or discarded key is never reused for a different concept.
- Store mutable work in Draft revisions. A Feature, Module, or Plan revision has one of Draft, Active, Retired, or Discarded states. Only Draft revisions are editable or discardable. Once Active, a revision is immutable and is retained indefinitely; replacing it creates a successor Draft revision which is later published. Publishing a successor retires the prior active revision for that key.
- Record creation, publication, retirement, and discard metadata with the responsible Owner User and timestamp. Catalog list and detail views expose revision number, status, and audit metadata.
- Model Feature-to-Module and Module-to-Plan membership as many-to-many relationships, pinned to exact revisions. A Plan revision cannot have a direct Feature membership. A Module revision must have at least one Feature membership. A Plan revision must have at least one Module membership.
- A Feature is a commercial description of a product capability, not the implementation of that capability. Console may create Feature records, but a new Feature becomes operational only when Ganatri Admin, Ganatri POS, and/or the backend later implement an access check for its key.
- Do not model Feature dependency graphs or prevent Platform Administrators from publishing an incomplete workflow Module. The Platform Administrator is responsible for module composition. Structural catalog integrity is still enforced: unique keys, valid revision references, required memberships, valid price values, and valid lifecycle transitions.
- Plans define a Plan type, price in INR, and a calendar term. The initial supported types are Trial and paid. Trial is configured as ₹0 for seven days; paid plans support the initial one-year term. The catalog data model should allow additional reusable types and terms later without a schema redesign.
- Modules define whether they are separately purchasable and, when they are, their own INR price and calendar term. These prices are catalog configuration only; no payment or proration is executed in this slice.
- The future commercial model is Store-scoped: a Store License will later choose a Plan and optionally separately purchased Modules for one Store. Stores of the same Organization may differ. This slice stores no Store Licenses and changes no current Store feature flags.
- A future separately purchased Module is a Co-Term Add-On: it ends with the Store's active Plan and its first charge is prorated by exact remaining calendar days, rounded to the nearest paise. The spec stores the price and term required for that later calculation but does not implement it.
- Organization-owned data such as Catalog Products, Units, and Vendors remains shared across Stores. A future Store License will gate a Store's use of paid workflows with that data; this slice does not add those runtime gates.
- Console navigation provides a Commercial Catalog entry with separate Features, Modules, and Plans views. Each view supports search/listing by name/key and status, creation of a Draft, detail/revision history, creating a successor revision, publishing, retiring, and discarding Drafts.
- Feature forms collect key, display name, and description. Module forms collect key, display name, description, selected Feature revisions, separately-purchasable status, and its catalog price/term when separately purchasable. Plan forms collect key, display name, description, Plan type, price, term, and selected Module revisions.
- Detail views make the hierarchy reviewable: Plans show selected Modules and their resolved Features; Modules show Features and referencing Plans; Features show referencing Modules and indirectly affected Plans. This is presentation only and does not add direct Plan-to-Feature configuration.
- Seed these initial Feature definitions: Billing; Catalog Products; Units; Reports; Vendors; Purchases; Expenses; Money Account Tracking; KOT System; Table Management; WhatsApp; Google Contacts Synchronization.
- Seed these initial Module definitions:
  - Core Operations: Billing and Reports.
  - Basic Catalog: Catalog Products and Units.
  - Finance: Vendors, Purchases, Expenses, and Money Account Tracking.
  - KOT System: KOT System.
  - Restaurant Operations: KOT System and Table Management.
  - Integrations: WhatsApp and Google Contacts Synchronization.
- The initial catalog treats Table Management as operationally dependent on KOT System. KOT System may be offered alone, but the initial catalog must not offer Table Management alone. This reflects existing behavior and does not change it.
- Seed these initial Plan definitions, priced per Store:
  - Trial: zero price, seven days, all six initial Modules.
  - Core: ₹2,999, one year, Core Operations and Basic Catalog.
  - Pro: ₹4,999, one year, Core Operations, Basic Catalog, Finance, and Restaurant Operations.
  - Integrations is initially separately purchasable and is not included in Pro.
- Do not expose customer purchasing, plan assignment, Store License issuance, access enforcement, or any payment action in Ganatri Console in this feature.

## Testing Decisions

- Test externally observable behavior at the owner-authenticated Platform API seam and the Console interaction seam. Avoid tests coupled to private persistence helpers, component state, or internal revision implementation.
- Add Platform route/service tests using the existing owner-authenticated platform route harness. Cover authentication and inactive-owner rejection; lifecycle transitions; immutable active revisions; discarded Draft behavior; key uniqueness and non-reuse; structural membership rules; revision-pinned memberships; audit metadata; and the exact initial catalog composition.
- Add repository-level tests only where they establish durable persistence behavior that cannot be expressed cleanly at the API seam, especially transactional publication of a successor revision and integrity of many-to-many revision memberships.
- Add Console behavior tests following the existing Console component-test style. Cover navigation to the Commercial Catalog; list/filter/search states; Draft creation; selection and review of Module/Plan memberships; publish/retire/discard actions; and presentation of revision history and resolved hierarchy.
- Test that Plan forms cannot configure direct Features and that Module/Plan forms require at least one member. Test that the UI communicates the Table Management/KOT initial-catalog relationship without changing the underlying restaurant workflow.
- Test that price and term fields accept valid zero-price Trial data and valid positive paid offering data, reject invalid monetary or term data, and render INR values accurately.
- Test that API and Console behavior never mutate Organization business data, existing Store flags, or Organization Inspection Workspace behavior.

## Out of Scope

- Razorpay, checkout, invoices, payment collection, refunds, or payment webhooks.
- Customer-facing plan pages, quotations, purchase flows, renewals, upgrades, downgrades, cancellations, or payment status.
- Creating Store Licenses, Store Access Grants, trial eligibility enforcement, trial extensions, custom date ranges, complimentary access, or special customer pricing.
- Applying, revoking, or enforcing Feature access in Ganatri Admin, Ganatri POS, backend services, or Store Devices.
- Migrating or replacing existing per-Store KOT System, Table Management, or Money Account Tracking flags.
- Changing KOT/Table behavior or making Table Management work without KOT System.
- A Feature-dependency engine, automatic dependency resolution, or blocking publication of a commercially incomplete Module.
- Per-Store copies of Organization-owned Products, Units, Vendors, Customers, or other shared business data.
- Product development for newly created Feature keys, including Payroll or any other capability not already implemented by Ganatri.

## Further Notes

- This spec deliberately establishes the commercial catalog before the access and purchase system. It makes later Store Licenses possible but does not create them.
- A custom, Organization-specific commercial exception must later be represented as a Store-specific access grant rather than a new reusable global Plan. Examples include extending a Trial, complimentary time, a custom range, or a special price.
- Existing architectural decisions are recorded in ADRs 0018 through 0026. In particular, the catalog is versioned, uses immutable keys, has reusable many-to-many memberships, is licensed per Store in the future, and leaves module dependency completeness to Platform Administrators.
