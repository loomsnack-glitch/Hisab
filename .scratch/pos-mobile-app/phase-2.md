# POS Mobile App — Phase 2 Execution Plan and Review Log

Status: Phase 2 in progress; subphase 2.4 in progress
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
| 2.1 | Catalog query and cache | Phase 1 | Product/Category queries have scoped cache and recoverable states | `08e5d5b` |
| 2.2 | Product search and Categories | 2.1 | Products can be searched, browsed, and added to Cart | `ea26878`, `c4d4607` |
| 2.3 | Camera barcode scanning | 2.1, 2.2 | Android scan states work and manual search remains available | `2ed696e` |
| 2.4 | Recent and Pinned Products | 2.1, 2.2 | Local convenience actions remain separate from server Catalog | in progress |
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

2.1 status: Completed with native/API follow-up. Focused commit: `08e5d5b`.

## 2.2 — Product search and Categories

### Plan

User-facing outcome: the New Sale screen makes ordinary Product selection fast
without opening another screen. A user can search by Product name/code, switch
between compact Category filters, tap an ordinary Product to add it, and open
Cart while keeping the current browsing context.

Implementation scope:

- Filter the already-loaded server Product list by case-insensitive name or
  Product code.
- Add an All Categories option and horizontally scrollable Category chips.
- Render touch-friendly Product cards with stored Product name and current
  server price/discount data.
- Add ordinary `single` Products directly to a small in-memory Cart handoff and
  merge repeated taps by Product ID.
- Show the Cart item count and keep the Cart action available from New Sale.
- Keep bundle/combo Products visible but disabled with a clear configuration
  message until 2.5 owns their configuration flow.
- Scope the in-memory Cart handoff to the active Organization/Store/Device
  session so a session change cannot reuse another Store's items.

Acceptance criteria:

1. Product search is immediately available on New Sale and matches Product
   names or Product codes without translating business data.
2. Category chips filter the loaded Products and All Categories restores the
   full list.
3. Tapping an ordinary Product adds it to Cart immediately.
4. Repeated taps merge quantity for the same ordinary Product.
5. Cart item count updates immediately and opens the existing Cart route.
6. Products requiring configuration are not added before 2.5.
7. Focused pure tests cover search/category filtering and quantity merging.

Non-goals:

- Camera barcode scanning.
- Combo or Add-on configuration.
- Removing/editing Cart lines, totals, Draft Sale persistence, or checkout.
- Recent/Pinned Product persistence.

Public seams and effects:

- New Sale consumes the 2.1 catalog query boundary and a mobile-owned Cart
  handoff boundary.
- Product identity, name, price, discount, status, and type remain server data.
- No Product or Cart data is written to MMKV in this subphase.

Test and verification plan:

- Pure tests for search/category filtering and ordinary Product quantity merge.
- Mobile focused test suite.
- Mobile TypeScript check, separating the known WhatsApp asset baseline.
- `git diff --check` and staged-scope review.
- No Android build or device command in this environment.

Risks and rollback:

- Cart behavior must not become a second server Catalog source of truth; only
  the minimal Product handoff is introduced here.
- A session-scoped Cart prevents stale Store data but must be extended by Phase
  3 before persistence or Draft Sale recovery is added.
- The subphase can be rolled back without affecting the query/cache boundary.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, the completed 2.1 boundary, the
existing POS billing Product behavior, and ADRs 0002, 0004, and 0006.

- The plan satisfies 2.2's direct ordinary-Product action while leaving
  configuration-required Products to 2.5.
- Product and Category values come only from the active device-scoped query.
- Search and Category filtering stay local presentation concerns and do not
  change server authority.
- No new API or product decision is required.

### Implementation and review result

Completed on 2026-09-05.

- Added case-insensitive Product name/code filtering and Category selection to
  New Sale.
- Added horizontally scrollable All Categories and Category actions.
- Added touch-friendly Product cards showing the server Product name and
  current INR price after the server discount.
- Added direct add-to-Cart behavior for ordinary `single` Products, merging
  repeated taps by Product ID.
- Kept bundle/combo Products visible but disabled until the 2.5 configuration
  slice is implemented.
- Added a session-scoped in-memory Cart handoff and immediate item count.
- Updated the Cart shell to show handed-off Product lines while reserving
  editing, totals, and Draft Sale behavior for Phase 3.
- Added focused tests for Product filtering and Cart quantity merging.

Standards/spec review:

- Search and Category filtering consume only the active server Catalog query.
- Product names remain untouched business data and are not localized.
- Cart scope includes Organization, Store, and Device context.
- The initial review found and fixed the contradictory empty-Cart display after
  a Product was added.
- The final review found and fixed Cart retention across logout/session expiry;
  the mobile Cart store now clears at the session boundary.
- Added a regression test for clearing the Cart store at that boundary.
- No actionable standards or spec findings remain within 2.2.

Verification:

- `bun run --cwd apps/mobile test` — 24 passed.
- Mobile TypeScript check — no new errors; the known WhatsApp asset import
  remains the only baseline error.
- `git diff --check` — passed.
- Android build/device/API validation — intentionally not run; native and live
  environment validation remains a follow-up.

2.2 status: Completed with native/API follow-up. Focused commits: `ea26878`, `c4d4607`.

## 2.3 — Camera barcode scanning

### Plan

User-facing outcome: a POS user can open the Android phone camera beside the
Product search, scan a Product Code from the active server Catalog, and add an
ordinary Product to Cart without losing the always-available manual search
fallback.

Implementation scope:

- Add the Expo SDK 56-compatible `expo-camera` dependency and its Android
  camera configuration plugin without enabling audio recording.
- Use `CameraView` with an explicit set of common retail barcode formats and
  keep the scanner embedded in New Sale so the search field remains available.
- Request camera permission only when the user opens the scanner. A denied
  permission, camera mount error, or user cancellation closes/keeps the
  scanner usable without blocking manual Product search.
- Resolve scanned data against the already-loaded active POS Product list by
  exact Product Code. The server Catalog remains the authority; the camera
  never supplies Product identity, price, discount, status, or configuration.
- Add an exact ordinary `single` Product to the existing session-scoped Cart
  handoff. Repeated scans merge quantity through the same Cart boundary as
  manual Product taps.
- Throttle the camera callback briefly after each accepted scan so one barcode
  held in front of the camera does not create accidental duplicate lines.
- For unknown or ambiguous codes, place the scanned value into the manual
  search field and show a translated outcome. For configuration-required
  Products, show the existing configuration-pending outcome and defer actual
  configuration to 2.5.

Acceptance criteria:

1. New Sale exposes a scan action beside the search flow on Android.
2. Camera permission is requested only after the user opens the scanner.
3. Permission denial, camera mount failure, and cancellation preserve manual
   Product search and leave the screen recoverable.
4. An exact active Product Code resolves from the loaded server Product list;
   an ordinary Product is added to Cart immediately.
5. Repeated intentional scans merge quantity, while callbacks during the
   short scan lock are ignored.
6. Unknown and duplicate/ambiguous codes do not enter Cart and populate the
   manual search fallback with a translated message.
7. Configuration-required Products do not bypass the 2.5 configuration flow.
8. Pure boundary tests cover exact resolution, duplicate-code ambiguity,
   whitespace normalization, and scan throttling without Android hardware.

Non-goals:

- External Bluetooth or USB barcode scanners.
- A new server barcode-lookup endpoint or Catalog persistence in MMKV.
- Offline barcode resolution or billing.
- Combo/Add-on selection, Cart editing, totals, or Draft Sale persistence.

Public seams and effects:

- New Sale consumes the existing `usePosCatalog` and `usePosCart` mobile
  boundaries.
- A small pure barcode boundary owns normalization, exact Product resolution,
  and scan-throttle decisions so the screen does not contain business rules.
- `expo-camera` is the only native capability added in this subphase; no
  shared service or backend route changes are expected.
- Product names and other Product fields remain server data and are not sent
  through localization.

Test and verification plan:

- Pure mobile tests for normalization, exact resolution, ambiguous codes,
  unknown-code fallback data, and cooldown acceptance.
- Mobile focused test suite.
- Mobile TypeScript check, separating the known WhatsApp asset baseline.
- `git diff --check` and staged-scope review.
- No Android build, Gradle, emulator, or device command in this environment.

Risks and rollback:

- Camera callbacks can fire repeatedly for one physical barcode; the pure
  cooldown rule and callback lock must protect Cart quantity.
- Permission and mount failures must never make manual search unavailable.
- Duplicate Product Codes must not silently choose a billable Product.
- The subphase can be rolled back as one focused commit plus its dependency
  and app configuration without changing the POS API contract.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, the completed 2.1/2.2 boundaries,
the existing web POS barcode-resolution semantics, ADRs 0002, 0004, and 0006,
and the Expo SDK 56 camera documentation.

- `expo-camera` is the maintained Expo-native camera boundary compatible with
  this SDK family and exposes `CameraView` barcode callbacks without requiring
  a new scanner service.
- Exact resolution against the loaded POS Product list preserves server
  Catalog authority and avoids inventing a mobile barcode contract.
- The screen-level permission/cancel/error states preserve the approved
  simple-UX manual fallback.
- The pure boundary will reuse the existing POS meanings for exact,
  ambiguous, and unknown codes while excluding inactive-code administration
  data that the mobile POS does not load.
- No new product, API, security, or release decision is required.

Plan review result: approved for implementation.

### Implementation and review result

Completed on 2026-09-05.

- Added the Expo SDK 56-compatible `expo-camera` package and configured the
  Android camera permission without requesting audio recording permission.
- Added a camera-scanning action beside the Product search and kept the manual
  search field visible while the scanner is open.
- Added an explicit common retail barcode-format allowlist to `CameraView`.
- Requests camera permission only after the user opens the scanner. Denied
  permission, camera mount failure, and close/cancel all preserve a recoverable
  manual-search path.
- Added a pure mobile barcode boundary that trims scanner data, resolves only
  exact Product Codes from the active server Product list, rejects ambiguous
  duplicate codes, and applies a short repeated-callback cooldown.
- Added ordinary `single` Products to the existing session-scoped Cart handoff
  and left configuration-required Products for 2.5.
- Unknown and ambiguous scan results populate the manual search field and show
  translated feedback in English, Gujarati, and Hindi.
- Added focused pure tests for whitespace normalization, exact resolution,
  ambiguous codes, unknown results, and cooldown behavior.

Standards/spec review:

- The camera is only a presentation/input capability; Product identity, price,
  discount, availability, and type still come from the active server Catalog.
- No backend route, shared service, Catalog persistence, external scanner, or
  offline billing behavior was introduced.
- The short callback lock and pure cooldown prevent a held barcode from
  creating accidental duplicate Cart quantities.
- Manual search remains available after permission, mount, unknown-code, and
  configuration outcomes.
- Review found and fixed the stale pre-Catalog New Sale subtitle so the screen
  now describes the implemented search/scan/select flow in all supported
  interface languages.
- No actionable standards or spec findings remain within 2.3.

Verification:

- `bun run --cwd apps/mobile test` — 29 passed.
- Mobile TypeScript check — no new errors; the known WhatsApp asset import
  remains the only baseline error.
- `git diff --check` — passed.
- Android build/device/camera validation — intentionally not run; the user will
  validate the native permission, camera mount, barcode formats, and physical
  device behavior.

2.3 status: Completed with native follow-up. Focused commit: `2ed696e`.

## 2.4 — Recent and Pinned Products

### Plan

User-facing outcome: a cashier can quickly repeat recently sold Products and
optionally keep high-volume Products pinned, without adding another Catalog
source or extra steps to the normal Product → Cart flow.

Implementation scope:

- Add a small pure convenience-data boundary that stores only Product IDs,
  with bounded Recent ordering and toggleable Pinned IDs.
- Persist the convenience state in the existing MMKV convenience storage, not
  the encrypted session storage and not the server Catalog cache.
- Scope the MMKV key by Organization, Store, and Device so a Device never
  presents another Store's convenience choices.
- Recover safely from missing or malformed local data by starting with empty
  Recent/Pinned collections.
- Record a Product as Recent after a successful ordinary Product add from a
  card or barcode scan. Repeated use moves it to the front rather than
  creating duplicate IDs.
- Show Recent Products when search is empty and expose compact Recent and
  Pinned filters without hiding the existing All, Category, or manual search
  paths.
- Resolve stored IDs back to the current server Product list before rendering;
  missing, inactive, or no-longer-loaded Products are silently omitted.
- Add a small pin/unpin action to Product cards. Pinning changes only local
  convenience state and does not modify Catalog data.

Acceptance criteria:

1. A successful ordinary Product add records that Product ID as Recent.
2. Recent IDs are bounded, deduplicated, ordered newest first, and survive
   app restarts through MMKV convenience storage.
3. Search-empty New Sale exposes the Recent Products shortcut/content.
4. A cashier can pin/unpin a Product and use a Pinned filter.
5. Recent and Pinned rendering uses only Products in the current server Catalog.
6. Convenience data is isolated by Organization/Store/Device scope and does
   not contain Product names, prices, or other Catalog snapshots.
7. Missing, malformed, or unavailable local convenience data leaves New Sale
   usable with the normal Catalog list and search.
8. Pure tests cover ordering, deduplication, pin toggling, bounded storage,
   scope keys, and filtering against the current Product list.

Non-goals:

- Server synchronization, cross-device Recent/Pinned state, or analytics.
- Persisting prices, names, images, availability, or full Product objects.
- Replacing search, Categories, barcode scanning, or the server Catalog.
- Cart persistence, Draft Sale recovery, Product editing, or checkout.

Public seams and effects:

- A mobile-owned convenience hook reads/writes the existing MMKV convenience
  value API and exposes IDs resolved against `usePosCatalog` Products.
- Product add actions call the convenience hook only after the existing Cart
  handoff accepts an ordinary Product.
- The server Catalog query remains the sole authority for Product display and
  billing fields.

Test and verification plan:

- Pure tests for local-state parsing, bounded Recent ordering, pin toggling,
  scoped keys, and current-Catalog resolution.
- Mobile focused test suite.
- Mobile TypeScript check, separating the known WhatsApp asset baseline.
- `git diff --check` and staged-scope review.
- No Android build, emulator, or device command in this environment.

Risks and rollback:

- Persisting full Product objects would create stale pricing/availability and
  violate Catalog authority; only IDs are allowed in the local boundary.
- An unscoped key could show another Store's shortcuts; scope-key tests must
  include Organization, Store, and Device.
- A malformed local value must not prevent New Sale from rendering.
- The subphase can be rolled back without changing shared services or the
  server Catalog contract.

### Internal plan review

Reviewed on 2026-09-05 against `spec.md`, the completed 2.1–2.3 boundaries,
the approved MMKV-only storage decision, and the New Sale UX rules.

- The plan implements the approved local convenience behavior while keeping
  Search and Barcode Scan as the primary tools.
- Storing IDs only and resolving them through the active Catalog avoids stale
  local Product values and keeps Catalog authority on the server.
- Organization/Store/Device scoping matches the existing query and Cart
  boundaries and prevents convenience leakage after a session change.
- The bounded state and graceful parse fallback keep the normal billing path
  simple and recoverable.
- No new product, API, security, or release decision is required.

Plan review result: approved for implementation.
