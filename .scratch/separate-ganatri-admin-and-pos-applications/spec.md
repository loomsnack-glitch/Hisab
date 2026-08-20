# Separate Ganatri Admin and Ganatri POS applications

Status: ready-for-agent

## Problem Statement

Ganatri Admin and Ganatri POS are currently delivered from one frontend application. POS is accessed as an Admin `/pos` route even though it has a distinct Store Device authentication model, its own navigation and appearance, and a separate operational purpose. This couples unrelated releases and leaves the application boundary unclear to Organization administrators and Store Device operators.

## Solution

Deliver two independent Turbo applications: Ganatri Admin at `admin.ganatri.in` for Organization-administrator work, and Ganatri POS at `pos.ganatri.in` for the Store-Scoped POS Workflow. Rename the current web application to Admin, create a dedicated POS application, preserve every current POS capability under the equivalent root-based POS route, and remove all Admin `/pos/*` frontend routes without redirecting them.

Both applications use the shared backend through their own same-origin `/api` path. Ganatri Admin retains user-authenticated, read-only inspection of billing-related information; Ganatri POS remains the sole browser application for Device-Authenticated Billing Sessions and billing writes.

## User Stories

1. As an Organization administrator, I want to open Ganatri Admin at `admin.ganatri.in`, so that management work has a clear dedicated home.
2. As a Store Device operator, I want to open Ganatri POS at `pos.ganatri.in`, so that checkout work has a clear dedicated home.
3. As a Store Device operator, I want the POS workspace to open at the POS root URL, so that I no longer need an Admin `/pos` prefix.
4. As a Store Device operator, I want to sign in at `/login` in Ganatri POS, so that device access remains clear and direct.
5. As a Store Device operator, I want the existing Products, Tables, Bills, Reports, Customers, Purchases, WhatsApp, and Appearance POS areas to remain available, so that the split does not remove operational capability.
6. As a Store Device operator, I want the existing POS settings alias to continue taking me to POS Appearance, so that saved or familiar in-app navigation still works within POS.
7. As a Store Device operator, I want a Device-Authenticated Billing Session to stay isolated from Admin authentication, so that access remains limited to the Store Device's Store.
8. As an Organization administrator, I want to continue signing into Admin with my user account, so that Organization administration keeps its established authentication model.
9. As an Organization administrator, I want to inspect billing, customers, purchases, and reports in read-only Admin views, so that I can oversee Store operations without gaining POS write access.
10. As an Organization administrator, I want to create or reveal Store Device credentials from Admin and open the matching POS login, so that device setup remains a straightforward handoff.
11. As an Organization administrator, I want Admin's POS links to prefill only the non-secret organization and device identifiers, so that setup is convenient without exposing a Store Device Secret in a URL.
12. As a Store Device operator, I want an Admin user session in the same browser to neither authenticate nor authorize POS actions, so that the two trust models remain separate.
13. As an Organization administrator, I want a POS session in the same browser to neither authenticate nor authorize Admin actions, so that a shared terminal does not broaden access.
14. As an operator, I want POS and Admin to have their own document title, application shell, and installable-web-app identity, so that browser tabs and installed apps clearly identify the active workspace.
15. As an operator, I want POS-specific browser preferences such as display scale, printer choice, and table view to remain associated with POS, so that moving to the new application does not mix workspace preferences.
16. As an Organization administrator, I want an Admin `/pos/*` URL to provide no POS experience and no redirect to POS, so that the retired route contract stops working immediately.
17. As a developer, I want Admin and POS to build and run as separate Turbo applications, so that either application can evolve and be released independently.
18. As a developer, I want reusable domain UI to live in workspace packages only when both applications need it, so that the applications do not drift through copied code.
19. As a developer, I want the backend's device-scoped POS API to remain unchanged, so that this frontend split does not weaken billing authorization or require a data migration.
20. As a developer, I want Admin and POS to each call a same-origin `/api` endpoint, so that browser cookies remain host-isolated and no cross-origin API session is introduced.

## Implementation Decisions

- The current customer-facing web application becomes the Turbo application named Ganatri Admin. A new Turbo application named Ganatri POS is created alongside it.
- App-owned routing, entry points, layouts, providers, document metadata, public assets, and app-specific state remain within their respective application. Generic primitives continue to use the existing shared UI package; components with a demonstrated Admin-and-POS use case are extracted to an appropriately named workspace package rather than copied.
- Ganatri Admin owns user-authenticated Organization-management routes and user-authorized read-only billing inspection. It must not render the device POS workspace or call the device-authenticated POS experience as part of its route tree.
- Ganatri POS owns the Device-Authenticated Billing Session and the entire Store-Scoped POS Workflow. It retains the current POS navigation destinations at root-based paths: `/`, `/login`, `/tables`, `/bills`, `/reports`, `/customers`, `/purchases`, `/whatsapp`, and `/appearance`. Its existing settings route continues to redirect within POS to `/appearance`.
- POS authentication remains Device Login using a Store Device id and Store Device Secret. Admin authentication remains Organization User authentication. The backend's distinct cookies and device-scoped API authorization remain intact; no backend schema or API-contract change is introduced by this split.
- The existing backend `/pos` API namespace remains a device-scoped API namespace. It is not an Admin frontend route and is not renamed as part of this work.
- Each application uses a same-origin `/api` base URL and development proxy to the shared backend. Production routing/proxy provisioning is intentionally not implemented in this code-only feature.
- Admin's POS entry links become absolute, environment-configured links to the POS application's `/login` route. They retain only the current non-secret organization and device prefill parameters; Store Device Secrets never appear in the query string, fragment, or client-visible configuration.
- The retired Admin `/pos/*` paths are explicitly handled as unavailable and must not redirect to Ganatri POS, Admin home, or another authenticated Admin route.
- POS appearance, display-scale, local-storage, session-storage, printer, manifest, and document-title behavior is moved or re-established under the POS origin. Admin receives its own Admin-specific application identity and does not retain POS-specific manifest or route detection logic.
- Turbo task discovery, package scripts, TypeScript path configuration, Vite configuration, linting, type checking, test commands, version metadata, and workspace dependencies are updated so both applications can be developed and built independently.
- This specification follows ADR 0006. It retains ADR 0002's isolated device-session and device-scoped-route rules while replacing its single shared frontend-workspace assumption.

## Testing Decisions

- The primary test seam is each application's public boundary: its route table, authentication entry behavior, document/application identity, API base URL, and POS handoff link. Tests assert observable destinations and authorization-facing behavior rather than component placement or implementation internals.
- Ganatri Admin tests verify that normal Admin routes continue to require or use user authentication as appropriate; its billing-related views remain read-only; POS launch links use the configured POS origin; no secret reaches the URL; and `/pos/*` does not render or redirect into POS.
- Ganatri POS tests verify device login at `/login`; all migrated root-based paths render the intended POS destination; an unauthenticated device is returned to POS login; authenticated Store Device scope remains locked; and the POS settings alias stays within POS.
- App-identity tests verify Admin and POS produce separate titles, manifests, start URLs, and workspace metadata, with no remaining Admin pathname-based POS detection.
- Service and backend tests preserve the existing device-authentication and device-scoped POS API contract. No new backend behavior is required, but the existing contract remains a regression boundary.
- Existing route-context, POS service-table, printer, scanner, manifest, and Admin page behavior tests are migrated to the application that owns their behavior. Existing package-level service and schema tests continue unchanged.
- Both applications must independently pass their build, lint, type-check, and test commands. The highest-value integration check is a browser run that keeps an Admin session and a POS device session open concurrently on their separate application origins.

## Out of Scope

- Updating deployment guides, DNS records, nginx or other production reverse-proxy configuration, TLS certificates, and production rollout steps.
- Redirecting legacy Admin `/pos/*` URLs or preserving them as a compatibility layer.
- Changing backend billing, Store Device, Organization User, database, or API schemas.
- Changing the Ganatri Console application or Owner User authentication.
- Redesigning Admin or POS workflows beyond the required application split and application-identity updates.
- Adding new billing features, roles, permissions, or cross-store capabilities.

## Further Notes

The existing deployment documentation currently describes a single customer-facing origin. That operational work is deliberately deferred, but the code must be structured so Admin and POS can be built as separate static applications with the same backend. The desired production hosts are `admin.ganatri.in` and `pos.ganatri.in`; the specific operational migration of the current host will be decided and documented separately.
