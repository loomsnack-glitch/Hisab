# Platform Operations Console V1

Status: ready-for-agent

## Problem Statement

Ganatri's owners need an internal, trustworthy view of adoption across every Organization. Today, the customer-facing workspace is scoped to the Organization created by the logged-in customer User, so it cannot answer platform questions such as how many Organizations and Stores are using Ganatri, which Stores have recently generated bills, how much Completed Sales Value each business has generated, or which Organizations should receive outreach.

The platform also has no identity boundary for Ganatri owners. Reusing customer Users for cross-Organization access would allow an authorization mistake to expose customer data. The owners need a secure way to seed the first internal account, invite additional owners, and deactivate an owner without leaving that person with a live session.

## Solution

Add a new `apps/platform-admin` web application: the read-only Platform Operations Console for Ganatri's internal Owner Users. It has its own Owner User authentication and a dedicated backend Platform Operations module; neither may be entered with a customer User session.

The console provides a global dashboard, a searchable and filterable Organization adoption list, Organization drill-down pages with Store-level usage, and Owner User management. It shows all-time totals alongside an adjustable Platform Reporting Period. It uses the existing Billing model: bills are completed Sales, and the value of bills generated is Completed Sales Value. It does not call this amount revenue or money collected.

The primary outreach signal is fixed and independent of the selected reporting period: an Active Store has at least one completed Sale in the preceding seven calendar days, and an Active Organization has at least one Active Store. All calendar-day boundaries use Asia/Kolkata.

## User Stories

1. As a Ganatri owner, I want a separate Platform Operations Console login, so that customer administration and platform access remain distinct.
2. As a Ganatri owner, I want to log in with my Owner User phone number and password, so that the internal console uses familiar credentials without relying on a customer User account.
3. As a Ganatri owner, I want to log in with WhatsApp OTP using the same authentication capability as ordinary users, so that I have a secure alternate sign-in method.
4. As a Ganatri owner, I want an invalid phone number, password, or OTP to reveal no account details, so that failed sign-in does not leak internal account information.
5. As a Ganatri owner, I want an inactive Owner User denied at login, so that removed team members cannot enter the console.
6. As a Ganatri owner, I want an inactive Owner User's existing session rejected on its next authenticated request, so that access ends promptly after deactivation.
7. As a Ganatri owner, I want a normal customer User token rejected by every Platform Operations API, so that organization-level administration cannot become cross-tenant access.
8. As a Ganatri owner, I want a dedicated owner session kept separate from customer and Store Device sessions, so that signing into the console does not overwrite or grant either other kind of session.
9. As the initial Ganatri operator, I want to create the first Owner User with a secure CLI command, so that no public owner-registration endpoint exists.
10. As the initial Ganatri operator, I want the seed command to prompt for the password rather than accept it in command-line history, so that the initial credential is not needlessly exposed.
11. As an active Owner User, I want to create another Owner User from the console, so that internal access can grow without database editing.
12. As an active Owner User, I want a new Owner User to have a name, WhatsApp-enabled phone number, and initial password, so that they can authenticate immediately using the owner login flow.
13. As an active Owner User, I want duplicate Owner User phone numbers rejected, so that one phone number cannot ambiguously authenticate multiple internal accounts.
14. As an active Owner User, I want to see all Owner Users and whether they are active, so that I can audit who has platform access.
15. As an active Owner User, I want to deactivate another Owner User, so that I can remove their platform access without deleting their audit history.
16. As an active Owner User, I want to reactivate an Owner User, so that a temporarily removed teammate can regain access deliberately.
17. As an Owner User, I cannot deactivate myself, so that I cannot accidentally lock myself out.
18. As an Owner User, I cannot deactivate the final active Owner User, so that Ganatri always retains a recoverable platform administrator.
19. As a Ganatri owner, I want a dashboard showing all-time Organization count, Store count, Customer Count, and completed-Sale count, so that I can understand platform scale at a glance.
20. As a Ganatri owner, I want the dashboard to show the number of Active Organizations and Active Stores, so that I can assess current adoption instead of only registrations.
21. As a Ganatri owner, I want dashboard cards for completed-Sale count and Completed Sales Value in a selected Platform Reporting Period, so that I can compare recent platform activity with the all-time base.
22. As a Ganatri owner, I want the selected reporting period to show customer records created in that period, so that I can see recent customer-data adoption alongside sales activity.
23. As a Ganatri owner, I want an all-time selection and quick 7-, 30-, and 90-day reporting periods plus a custom date range, so that routine analysis is fast while investigation remains flexible.
24. As a Ganatri owner, I want custom dates interpreted as Asia/Kolkata calendar dates, so that daily results match the business calendar used for V1 reporting.
25. As a Ganatri owner, I want drafts and voided Sales excluded from every bill count and Completed Sales Value, so that dashboard figures represent real completed bills.
26. As a Ganatri owner, I want Completed Sales Value clearly labeled as sales value rather than revenue or collected money, so that pending and partial Sales are not confused with Payments.
27. As a Ganatri owner, I want a searchable Organization list, so that I can quickly locate a business by its name or organization username.
28. As a Ganatri owner, I want to filter the Organization list to active or inactive Organizations, so that I can build a practical outreach queue.
29. As a Ganatri owner, I want the Organization list to show its creator's contact details, so that I know whom to approach without pretending this is a full user-membership directory.
30. As a Ganatri owner, I want each Organization row to show Store count, Active Store count, Customer Count, completed-Sale activity and Completed Sales Value for the selected reporting period, so that I can prioritize businesses from one view.
31. As a Ganatri owner, I want each Organization row to show its most recent completed-Sale time, so that I can distinguish newly registered businesses from formerly active ones.
32. As a Ganatri owner, I want inactive Organizations to include Organizations with no Stores and Organizations whose Stores have not completed a Sale in the last seven days, so that the outreach queue has no silent gaps.
33. As a Ganatri owner, I want the activity status to remain based on the fixed preceding seven calendar days even when I choose a different reporting period, so that active/inactive has one stable meaning.
34. As a Ganatri owner, I want Organization results paginated and consistently ordered, so that the console remains usable as the platform grows.
35. As a Ganatri owner, I want to open an Organization detail view from the list, so that I can inspect its adoption without altering any tenant data.
36. As a Ganatri owner, I want an Organization detail view to show Organization identity and creator contact details, so that I have the context for a support or outreach conversation.
37. As a Ganatri owner, I want the Organization detail view to repeat its aggregate Store count, Active Store count, Customer Count, completed-Sale count, Completed Sales Value, and last completed Sale, so that I can assess the business without reading every Store row.
38. As a Ganatri owner, I want an Organization detail page to list every Store and its activity status, so that I can see whether a multi-Store business is partially adopting Ganatri.
39. As a Ganatri owner, I want each Store row to show Customer Count, completed-Sale count, Completed Sales Value for the selected reporting period, and its most recent completed Sale, so that I can identify the branch needing attention.
40. As a Ganatri owner, I want all Organization and Store analytics to be view-only, so that using the console cannot change customer data, Sales, Payments, Stores, or devices.
41. As a Ganatri owner, I want an empty reporting period to show zero values rather than an error, so that a quiet or new platform remains understandable.
42. As a Ganatri owner, I want a clear no-results state for a search or filter combination, so that I know the query—not the console—caused the empty list.
43. As a Ganatri owner, I want unauthorized and expired console sessions returned to the owner login, so that the UI never shows stale cross-organization data.

## Implementation Decisions

- Add a standalone Vite/React application named `platform-admin` under the Turborepo's `apps` workspace. It is a separate Platform Operations Console route tree and session context, not a new route inside the organization-facing web application.
- Build one dedicated Platform Operations backend module. It owns Owner User authentication, Owner User administration, global dashboard rollups, Organization adoption search, and Organization drill-down reporting. Expose this through a dedicated owner-authenticated `/platform` route tree rather than changing the tenant-scoped `/organizations` routes.
- Add a separate `owner_users` persistence model with a UUID identity, display name fields, a unique normalized phone number, password hash, active state, and audit timestamps. It has no foreign key or role relationship to customer `users`.
- Use a dedicated Owner User JWT, cookie name, Redis OTP namespace, authentication service, and middleware. Owner middleware must load the live Owner User record on every authenticated request and reject inactive accounts, so deactivation revokes an open session on its next request. Customer User and Store Device tokens must not satisfy this middleware.
- Owner login offers the same two authentication modes as normal user login: password and WhatsApp OTP. Passwords are stored only as hashes. The owner authentication contract must not expose password hashes or distinguish unknown from inactive/incorrect credentials beyond the required access-denied outcome.
- Provide no public Owner User registration endpoint. Add an operator-run `owner:create` CLI command that prompts for the first Owner User's required identity and password, hashes the password with the existing password facility, and inserts an active Seed Owner User. It must fail safely when a duplicate phone exists and must not print or accept the password through command-line arguments.
- Owner management has narrowly scoped write commands only: list Owner Users, create an Owner User, and set another Owner User's active state. Platform reporting remains read-only. The service must reject self-deactivation and deactivation when it would leave zero active Owner Users; create/deactivate/reactivate operations retain audit history rather than deleting Owner Users.
- Add typed Owner User, authentication, dashboard, Organization list, Organization detail, Store activity, query-filter, and pagination contracts in the shared types and service layers. Platform APIs return presentation-ready DTOs; the new web app does not directly compose cross-tenant database tables.
- Dashboard all-time totals are: all Organizations, all Stores, Customer Count, and completed-Sale count. Dashboard activity totals are Active Organizations and Active Stores as of the request. Dashboard reporting-period totals are completed-Sale count, Completed Sales Value, and Customer records created during the selected Platform Reporting Period.
- A Customer Count counts every Customer record created by the Organization or Store regardless of the Customer's current `is_active` state. It is a customer-data adoption count, not an engaged-customer count.
- A completed bill is a Sale whose status is `completed`. Draft and voided Sales are excluded from completed-Sale counts, last-completed-Sale timestamps, Active Store evaluation, and Completed Sales Value. Completed Sales Value sums completed Sales' `grand_total`; it does not sum Payments and may include a completed Sale that is pending or partially paid.
- Normalize every selected Platform Reporting Period into an inclusive Asia/Kolkata start date and an exclusive next-day/end boundary before querying timestamped data. Support all-time, 7-day, 30-day, 90-day, and custom date ranges; validate malformed, inverted, and future-invalid custom ranges before database access.
- Determine Active Store from completed-Sale existence during the preceding seven Asia/Kolkata calendar days at the time of the request. Determine Active Organization from the existence of at least one Active Store. This fixed adoption rule is not recalculated from the UI's selected Platform Reporting Period.
- The Organization list supports search by Organization name and username, active/inactive filtering, consistent server-side sort order, and cursor or page-based pagination. Each row returns identity, creator contact details, Store count, Active Store count, Customer Count, selected-period completed-Sale count, selected-period Completed Sales Value, activity status, and last completed Sale timestamp.
- The Organization detail response returns the same Organization-level adoption data plus every Store's identity, activity status, Customer Count, selected-period completed-Sale count, selected-period Completed Sales Value, and last completed Sale timestamp. It does not return bill line items, Payments, device secrets, or customer-level data.
- The UI has three authenticated destinations: Dashboard, Organizations, and Owner Users. Dashboard owns the Platform Reporting Period selector. Organizations retains the selected period through list and detail navigation. Owner Users is the only non-reporting write screen and requires explicit confirmation before activation-state changes.
- Follow the existing response envelope, validation, shared-service, TanStack Query, table, loading, error, and empty-state conventions. Update production CORS configuration to allow the separately deployed Platform Operations Console origin while retaining credential restrictions.
- Record this boundary in ADR 0005: the separate Owner User identity is intentional because Ganatri platform access must remain independent of customer User identity and tenant authorization.

## Testing Decisions

- Treat the owner-authenticated Platform Operations API boundary as the primary test seam. Tests assert observable authorization, returned DTOs, persisted Owner User state, and aggregate values; they do not assert private helper calls, SQL formatting, CSS classes, or component internals.
- Add Owner User contract and service tests for phone normalization/uniqueness, password hashing, password login, WhatsApp OTP login, invalid credentials, expired/invalid tokens, authentication of active users, and rejection of inactive users. Verify a customer User token and Store Device token cannot access `/platform` APIs.
- Test immediate effective revocation by authenticating an Owner User, deactivating it through another active Owner User, and confirming its next owner-authenticated request is denied. Test self-deactivation and final-active-owner deactivation are rejected; test reactivation restores normal login.
- Test the seed CLI through an injectable input/output and persistence boundary: it creates a valid active Seed Owner User, rejects a duplicate phone, hashes but never emits the password, and exposes no public registration path.
- Add reporting repository/service behavior tests with Organizations, Stores, Customers, Sales, and Payments spanning boundaries. Cover completed versus draft/voided Sales; pending, partial, and paid completed Sales; zero-activity Organizations; Organizations without Stores; and an Organization with a mix of active and inactive Stores.
- Add deterministic date-boundary tests for Asia/Kolkata, including a completed Sale exactly at the reporting start, exactly at its exclusive end, and around midnight. Assert that the selected reporting period changes its counts and Completed Sales Value but never changes the fixed seven-day Active Store/Active Organization definition.
- Test Customer Count as every Customer record regardless of `is_active`, and test period customer additions using Customer creation timestamps. Test that Completed Sales Value uses `grand_total` and does not substitute Payment totals.
- Add HTTP/route contract tests for report-query validation, all-time and quick-range selection, malformed or inverted custom dates, Organization search/filtering, stable pagination, Organization detail, unauthorized access, and missing Organization behavior.
- Add web-app user-behavior tests for owner login outcomes, dashboard period controls, dashboard metric states, Organization active/inactive filtering, search, pagination, detail navigation with the retained reporting period, Owner User creation, and safe deactivation controls. Assert visible data and user actions, not component internals.
- Preserve and run the existing billing lifecycle and rollup tests, since Platform Operations reporting reads Sales under the established Basic Billing model and must not change Sale or Payment behavior.

## Out of Scope

- Any ability to create, edit, disable, or delete Organizations, Stores, customers, Products, Sales, Payments, Store Devices, or other tenant data from the Platform Operations Console.
- Normal customer-User activity analytics, user-login tracking, or a multi-user Organization membership model. The current model only reliably identifies the Organization creator, which is shown as the outreach contact.
- Payment-collection, cash-flow, revenue, tax, refund, profitability, inventory, or subscription analytics.
- Customer-level lists, customer contact details, bill details, Sale Items, Payment details, device secrets, or any export of tenant operational data.
- Owner User deletion, owner password reset/recovery, granular Owner User roles, audit-log UI, public owner signup, or invitation email/WhatsApp workflows.
- Per-Organization configurable reporting timezones; V1 uses Asia/Kolkata uniformly.
- Alerts, scheduled inactivity notifications, CRM integration, outreach tasks, automated messaging, charts beyond the basic dashboard, data export, and saved filters.
- Replacing the organization-facing web app, its existing authentication, or Store Device POS authentication.

## Further Notes

- The canonical vocabulary is in `CONTEXT.md`: Platform Administrator, Owner User, Active Owner User, Seed Owner User, Platform Operations Console, Active Store, Active Organization, Platform Reporting Period, Organization Adoption Health, Completed Sales Value, and Customer Count.
- The billing ADRs remain authoritative: Sales and Payments are distinct. A pending or partial completed Sale contributes to Completed Sales Value, while cash actually received remains represented by Payments and is intentionally not a V1 platform metric.
- “Inactive” is an outreach signal, not an account status: an Organization may be registered and valid yet inactive because it has no Active Store.
