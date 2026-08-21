# Ganatri Console organization inspection workspace

Status: ready-for-agent

## Problem Statement

Ganatri Console's Organizations experience is an unattractive, shallow outreach list. A Platform Administrator can see only summary adoption data and a basic store table, then must leave Console to understand an Organization's stores, catalog, customers, bills, reports, tables, purchases, or WhatsApp setup. This is much less usable than the familiar Ganatri Admin and POS experiences and does not provide the operational visibility needed to support Organizations across the platform.

## Solution

Retain Ganatri Console's existing platform sidebar and Organizations entry point, but rebuild Organizations as a responsive Organization Directory and make each selected Organization open a complete read-only Organization Inspection Workspace. The workspace will use Admin-like information architecture and visual patterns while remaining a Platform Administrator-only, cross-organization inspection surface.

The workspace will provide a linked overview and dedicated read-only sections for Stores, Catalog, Billing, Customers, Reports, Tables, Purchases, and WhatsApp. Organization-owned reference data is shown at the Organization scope. Billing is shown across all Stores by default and can be limited to one Store. No Console page will expose tenant credentials or offer a tenant mutation.

## User Stories

1. As a Platform Administrator, I want to find an Organization from a responsive directory, so that I can start investigating its activity quickly.
2. As a Platform Administrator, I want the directory to show an Organization's name, username, creator, adoption health, and sales value, so that I can prioritize follow-up without opening every Organization.
3. As a Platform Administrator, I want to search by Organization identity or creator, so that I can locate an account from the information available to me.
4. As a Platform Administrator, I want to filter Organizations by Active Organization status, so that I can focus on recently operating or inactive businesses.
5. As a Platform Administrator, I want the directory to default to Organizations with the most recent completed Sale, so that the most operationally relevant accounts appear first.
6. As a Platform Administrator on desktop, I want a compact sortable directory table, so that I can compare many Organizations efficiently.
7. As a Platform Administrator on mobile, I want the same directory information presented as readable cards, so that the page remains usable without a wide table.
8. As a Platform Administrator, I want selecting an Organization row or name to open that Organization's Inspection Workspace, so that list-to-detail navigation is obvious.
9. As a Platform Administrator, I want the Console sidebar to remain unchanged while inspecting an Organization, so that I retain a clear route back to platform-level Overview, Dashboard, Organizations, and Console Users.
10. As a Platform Administrator, I want an Inspection URL for each Organization section, resource detail, and supported filter state, so that refresh, browser history, and sharing with another authorized Platform Administrator work reliably.
11. As a Platform Administrator, I want an Organization overview that clearly identifies the Organization, creator, and activity state, so that I know whose operation I am inspecting.
12. As a Platform Administrator, I want overview KPIs for Stores, Active Stores, Customers, completed Sales, Completed Sales Value, and latest completed Sale, so that I can assess adoption at a glance.
13. As a Platform Administrator, I want an overview Store-performance list and recent-Sales list with links to their detailed views, so that I can move directly to the relevant operational record.
14. As a Platform Administrator, I want to inspect every Store and its safe operational metadata, activity, billing performance, and related information, so that I can understand an Organization's branch-level operation.
15. As a Platform Administrator, I want to inspect the Organization Catalog, including Products, Categories, Add-Ons, and Product Add-On Attachments, so that I can diagnose what is available to sell without changing it.
16. As a Platform Administrator, I want to inspect all Customers for an Organization and their relevant billing history and balances, so that I can support customer-data and receivables questions.
17. As a Platform Administrator, I want a Billing view that begins with all Stores and lets me select one Store, so that I can investigate both organization-wide and store-specific billing.
18. As a Platform Administrator, I want Billing filters for date, Sale lifecycle status, payment status, payment method, search, and Store, so that I can find a precise bill without dashboard filters hiding records.
19. As a Platform Administrator, I want to inspect draft, completed, and voided Sales with their line items, discounts, payments, Customer, Store, Store Device attribution, and receipt data, so that I can explain a billing record without modifying it.
20. As a Platform Administrator, I want reports to use their own explicit time-range controls, so that I can investigate organization data independently of the platform Dashboard's reporting period.
21. As a Platform Administrator, I want to inspect an Organization's Tables and Purchases, so that Console gives me the same operational coverage as Ganatri Admin.
22. As a Platform Administrator, I want to inspect WhatsApp connection state and safe configuration metadata, so that I can support integration issues without gaining access to credentials.
23. As a Platform Administrator, I want every Organization Inspection Workspace action to be visibly read-only, so that I cannot accidentally alter an Organization while examining it.
24. As an Organization administrator, I want Console never to reveal my Store Device Secrets, WhatsApp/API credentials, passwords, or authentication tokens, so that platform support access cannot become a credential-recovery path.
25. As a Platform Administrator, I want Console to reject access after my Owner User session becomes invalid, so that cross-organization data is not retained behind a stale session.
26. As a Platform Administrator, I want clear empty, loading, unavailable, and not-found states in each inspection section, so that I can distinguish lack of data from a system failure.
27. As a Platform Administrator, I want every data-heavy page to be paginated or incrementally loaded using familiar Admin/POS patterns, so that large Organizations remain performant and usable.

## Implementation Decisions

- Ganatri Console remains a read-only internal application for Platform Administrators. Ganatri Admin remains the only tenant administration surface, and POS remains the billing-operation surface.
- The existing Console sidebar and platform destinations remain unchanged. Organizations remains the entry destination; inspection is a content-level workspace reached from that directory rather than a replacement application shell.
- The Console client will move Organization selection, section selection, resource detail, and supported filter state from component-only state to first-class Inspection URLs. The route layer must restore state on direct load, refresh, and browser back/forward while preserving Owner User authorization.
- The Organization Directory will support Organization-or-creator search, Active Organization filtering, sorting, pagination, desktop table presentation, and mobile card presentation. Default sorting is most recently active, with a deterministic fallback for Organizations that have no completed Sale.
- The Organization Inspection Workspace will contain an overview plus read-only Stores, Catalog, Billing, Customers, Reports, Tables, Purchases, and WhatsApp sections. The organization header provides context, a return path to the directory, and section navigation without modifying the global Console sidebar.
- Catalog, Customers, Reports, Tables, Purchases, and WhatsApp are Organization-scoped. Catalog inspection includes Categories, Products, Add-Ons, and Product Add-On Attachments.
- Stores are listed at Organization scope and support store detail. Every Store-specific datum, including its bills and activity metrics, retains Store identity in Console.
- Billing implements Store-Filtered Billing Inspection: all Stores are visible by default, with an explicit Store filter. Billing's own date, lifecycle, payment, payment-method, search, sort, and pagination controls are independent of the Platform Reporting Period.
- Read-Only Sale Inspection includes draft, completed, and voided Sales and their historical records. Console must not render or invoke any command that creates, changes, settles, voids, prints, downloads for operational use, or messages a Sale.
- Overview adoption metrics may use the selected Platform Reporting Period and must label it. Inspection Page Filters own detailed data filtering and default to the full accessible Organization dataset; the Platform Reporting Period must not silently constrain detailed Organization sections.
- Platform API contracts will be extended as platform-owned read models guarded by Owner User authentication. They must return only the data required by Console and must not reuse tenant-authorized routes or tenant credentials.
- Platform read models must support Organization-wide collections and individual resource details while preserving Organization and Store scope in every query. Pagination, filtering, ordering, validation, 401 handling, 404 handling, and error responses will follow existing platform API conventions.
- Console-Safe Operational Metadata may be returned for Store Devices and WhatsApp configuration. Responses and UI must exclude Store Device Secrets, WhatsApp/API credentials, passwords, authentication tokens, and any equivalent reusable secret.
- Mutating Ganatri Admin/POS controls will not be shared wholesale with Console. Where visual presentation is shared, it must accept a read-only data contract or use a deliberately read-only variant so it cannot make a tenant write request.
- Existing activity semantics remain unchanged: Active Store and Active Organization use the preceding seven Asia/Kolkata calendar days. Completed Sales Value remains distinct from collected Payments.
- The workspace will use existing Console layout, shared UI primitives, platform service client patterns, platform schemas, and authenticated platform route/service/repository boundaries. Tenant modules may inform domain read-model logic but must not be exposed through their tenant authorization contracts.

## Testing Decisions

- Tests will verify externally observable behavior rather than component implementation details, including visible data, navigation destinations, URL restoration, API responses, and the absence of forbidden actions or data.
- Extend the existing authenticated platform HTTP route and service tests to cover every inspection collection/detail contract, Organization and Store scoping, filtering, sort and pagination validation, reporting-period separation, and 401/404/error behavior.
- Add authorization tests proving that unauthenticated requests, tenant-user credentials, and Store Device credentials cannot access any inspection route, while an active Owner User can.
- Add negative contract tests that inspect serialized responses for all prohibited reusable secrets, including Store Device Secrets, credentials, passwords, and tokens.
- Extend existing Console behavior tests to cover the responsive Organization Directory controls, selection, Inspection URL deep links, refresh/back/forward restoration, overview links, loading/error/empty states, independent filters, and read-only Sale Inspection.
- Console behavior tests must prove that create, edit, delete, collect-payment, void, printing, credential-reveal, and messaging controls are absent and that no user flow invokes a mutation service.
- Reuse existing platform organization route tests and Console organization-page behavior tests as prior art. Add focused tests around the new platform read-model seams rather than end-to-end tests for every individual UI primitive.

## Out of Scope

- Creating, editing, deleting, activating, deactivating, or otherwise mutating an Organization, Store, Catalog item, Customer, Table, Purchase, WhatsApp configuration, or Sale from Ganatri Console.
- Running POS checkout, editing drafts, collecting payments, voiding Sales, printing receipts, sending WhatsApp messages, or other billing operations from Console.
- Revealing, copying, exporting, rotating, or recovering Store Device Secrets, WhatsApp/API credentials, passwords, authentication tokens, or any other reusable secret.
- Changing the business semantics of Sales, Payments, Customers, active-status calculation, catalog ownership, or tenant authorization.
- Replacing the existing Console platform sidebar, rebuilding Ganatri Admin, or rebuilding POS.
- Changing the Dashboard's Platform Reporting Period behavior outside the explicit requirement that it not silently constrain detailed inspection pages.

## Further Notes

- This work implements ADR 0006 (Console is read-only), ADR 0007 (full read-only organization inspection), and ADR 0008 (Console never discloses organization credentials).
- The expected design goal is functional and visual familiarity with Ganatri Admin/POS, adapted to cross-organization inspection rather than copied as a mutating tenant workspace.
- The preferred test seams are the existing platform HTTP read boundary and the Console behavior-test boundary. This preserves the current architecture and avoids a new test harness.
