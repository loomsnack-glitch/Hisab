# POS Mobile App — Phase 2 Execution Plan and Review Log

Status: Phase 2 in progress; subphase 2.1 completed with follow-up
Phase: 2 — Catalog and Product selection
Scope: Android-only Ganatri POS mobile application
Started: 2026-09-05

This document is the execution record for Phase 2. Each subphase follows the
approved phase-loop lifecycle: plan, internal review, implementation,
verification, standards/spec review, status update, and focused commit.

## Phase outcome

Make the Catalog usable from a phone and make Product selection fast while
keeping the server Catalog authoritative for Product identity, price,
availability, category membership, and configuration rules.

Phase 2 exit condition: a POS user can search, browse categories, scan a
barcode, configure supported Products, and add Products to Cart.

## Scope guardrails

Included in this phase:

- Device-scoped Product and Category queries through the existing POS services.
- Store/Device-scoped TanStack Query cache keys and cache lifecycle.
- Product search, category browsing, and direct ordinary-Product-to-Cart flow.
- Android phone-camera barcode scanning with manual-search fallback.
- Optional Recent and Pinned Product convenience actions in separate MMKV data.
- Conditional Combo and Add-on configuration for Products that require it.

Not included in this phase:

- Draft Sale persistence, Cart recovery, Customer selection, discounts, or
  Payment (Phases 3–4).
- Bluetooth printer integration (Phase 6).
- Offline Catalog authority or offline billing.
- External Bluetooth barcode scanners.
- New backend endpoints unless the existing POS contracts prove insufficient.

## Approved phase map

| Subphase | Outcome | Depends on | Exit evidence | Commit |
| --- | --- | --- | --- | --- |
| 2.1 | Catalog query and cache | Phase 1 | Product/Category queries have scoped cache and recoverable states | pending |
| 2.2 | Product search and Categories | 2.1 | Products can be searched, browsed, and added to Cart | pending |
| 2.3 | Camera barcode scanning | 2.1, 2.2 | Android scan states work and manual search remains available | pending |
| 2.4 | Recent and Pinned Products | 2.1, 2.2 | Local convenience actions remain separate from server Catalog | pending |
| 2.5 | Combos and Add-ons | 2.1, 2.2 | Required configuration is preserved for later Cart/Draft Sale use | pending |

## Shared Phase 2 decisions

- Use `getPosProducts()` and `getPosCategories()` from `@repo/services` for the
  authenticated POS flow.
- Do not use organization-admin Catalog endpoints from the mobile POS.
- Include Organization ID, Store ID, and Device ID in mobile query keys even
  though the POS API derives authorization scope from the Device Session. This
  prevents a new session from showing an old Store's cached data.
- Treat `ProductsListResponse.products` and `CategoriesListResponse.categories`
  as server data. MMKV is reserved for later Recent/Pinned convenience data.
- Keep the New Sale screen simple: search first, category shortcuts next, and
  direct Product actions without forcing a separate Product detail screen.
- Keep manual Product search available whenever camera permission, hardware,
  or barcode lookup is unavailable.

## 2.1 — Catalog query and cache

### Plan

User-facing outcome: after POS unlock, New Sale can load the active Store's
Products and Categories with clear loading, empty, error, and retry states.

Implementation scope:

- Add a mobile-facing catalog query boundary under `apps/mobile/src`.
- Read the active Organization, Store, and Device IDs from the verified POS
  Device Session rather than navigation parameters or user-auth state.
- Call the existing `getPosProducts()` and `getPosCategories()` services.
- Define query keys containing the active Organization/Store/Device context.
- Keep queries disabled until a verified active session is available.
- Expose normalized Product and Category arrays plus loading, empty, error, and
  retryable states to New Sale.
- Keep the initial New Sale UI limited to query-state feedback; full search,
  category filtering, Product cards, and Cart additions belong to 2.2.

Acceptance criteria:

1. Active POS New Sale loads Products and Categories through existing POS
   services.
2. Queries do not run without a verified Device Session.
3. Query keys change when Organization, Store, or Device context changes.
4. Loading, empty, error, and retry states are observable and recoverable.
5. A failed query never replaces previously authoritative data with fabricated
   or locally persisted Catalog data.
6. Focused tests cover query-key scoping and response normalization/state
   helpers without requiring Android or a live API.

Non-goals:

- Product text filtering or category navigation.
- Barcode scanning.
- Cart mutation or quantity state.
- MMKV Catalog persistence.
- Changes to shared services or backend routes.

Public seams and effects:

- New Sale consumes a mobile-owned query hook/boundary.
- Shared service functions remain unchanged.
- TanStack Query remains the server-state owner.
- No session or Product data is passed through navigation parameters.

Test and verification plan:

- Focused pure tests for query-key context and response-state normalization.
- Mobile focused test suite.
- Mobile TypeScript check, separating the known WhatsApp asset baseline.
- `git diff --check` and staged-scope review.
- No Android build or device command in this environment, per user request.

Risks and rollback:

- A query key that omits Store or Device context can leak stale Catalog data
  after session changes; tests must assert all three scope identifiers.
- Existing POS service responses may report an error as data instead of a
  rejected promise; the mobile boundary must handle both forms consistently.
- The subphase can be rolled back as one focused commit without changing the
  shared API contract.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, `status.md`, Phase 1's committed
mobile boundaries, the POS service exports, and ADRs 0002, 0004, and 0006.

- Existing `/pos/products` and `/pos/categories` services satisfy the required
  API boundary; no new endpoint is needed.
- The plan preserves Store Device authorization and server Catalog authority.
- Organization/Store/Device query-key scope closes the cache-isolation risk
  identified in the approved API/cache rules.
- Search, barcode, Recent/Pinned, and configuration behavior remain in their
  assigned later subphases.
- No new product, public API, security, or release decision is required.

### Implementation and review result

Completed on 2026-09-05.

- Added a mobile-owned `usePosCatalog` query boundary for the existing
  `getPosProducts()` and `getPosCategories()` services.
- Added Product and Category query keys containing Organization, Store, and
  Device identifiers so a session change cannot reuse another Store's cache.
- Kept Catalog queries disabled until an active verified POS session exists.
- Converted service-level error responses into query errors and exposed
  recoverable loading, error, empty, and retry states in New Sale.
- Added English, Gujarati, and Hindi labels for all new Catalog states.
- Added focused boundary tests for cache scoping, response normalization, and
  service-error handling.

Standards/spec review:

- The implementation uses the existing device-scoped POS API and does not
  introduce a new backend or organization-admin Catalog contract.
- TanStack Query remains the server-state owner; no Catalog data is persisted
  to MMKV.
- The New Sale screen only exposes query-state feedback. Search filtering,
  category browsing, Product cards, and Cart mutation remain in 2.2.
- No actionable standards or spec findings remain within 2.1.

Verification:

- `bun run --cwd apps/mobile test` — 21 passed.
- Mobile TypeScript check — no new errors; the known WhatsApp asset import
  remains the only baseline error.
- `git diff --check` — passed.
- Android build/device/API validation — intentionally not run; native and live
  environment validation remains a follow-up.

2.1 status: Completed with native/API follow-up. Focused commit: pending.
