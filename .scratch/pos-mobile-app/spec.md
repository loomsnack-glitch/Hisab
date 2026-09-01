# POS Mobile App — Product and Implementation Planning Baseline

Status: Approved planning baseline

## Purpose

Record the approved first version of the mobile Ganatri POS app and provide a shared baseline for setup, technology discussion, and implementation planning.

## Product principles

### Simple UX first

The mobile app should make the common Sale path feel obvious and fast:

- Keep one primary task visible at a time.
- Use clear labels and large touch targets.
- Keep the current cart easy to open from anywhere in the billing flow.
- Hide restaurant-specific and advanced actions unless they apply to the Store or current Sale.
- Use progressive disclosure for discounts, Customer details, and other secondary options.
- Avoid asking the user to make the same decision in multiple places.
- Show clear, recoverable errors when a request fails.

### Version 1 languages

The mobile POS interface will support:

- English
- Gujarati
- Hindi

Translations should cover navigation, billing actions, forms, validation messages, errors, empty states, payment states, and receipt actions. Product names, Customer names, and other business-entered values should remain exactly as entered rather than being translated.

### Bluetooth invoice printing

Version 1 must support sending an invoice or receipt to a Bluetooth thermal printer from the mobile app.

- Printer setup should be simple: discover, select, connect, and test the printer.
- Printing should be available from Sale Complete and Sale Details.
- A printer failure must not undo or block a completed Sale; the user should be able to retry.
- The mobile printer transport should reuse the existing receipt content and ESC/POS behavior where practical.
- The current web POS uses an 80mm USB printer through WebUSB. Mobile Bluetooth printing is therefore a separate transport requirement, not an assumption that the current web printer integration will work unchanged.
- Printed invoices will use an English-only receipt template. Gujarati and Hindi remain supported for the mobile interface, but multilingual thermal printing is not required.

## Discussion order

### 1. Users

The primary user is any authorized person who can access Ganatri POS for the Store. The app should not assume that the user is specifically an owner or a cashier.

Access and permissions should follow the existing Store Device and POS authorization model. If different user roles are needed later, they should be defined separately from the basic ability to use POS.

### 2. Main problem

What should the mobile app make easier?

Possible goals include:

- Creating Sales quickly at the counter
- Searching and selecting Catalog Products
- Collecting Payments
- Viewing or sharing receipts
- Operating the store without a computer

### 3. First MVP workflow

The initial candidate workflow is:

1. Authenticate the Store Device and open Ganatri POS.
2. Search or browse Catalog Products.
3. Add products to a Draft Sale.
4. Select a Customer or use Walk-in.
5. Apply supported discounts.
6. Collect one or more Payments.
7. Commit the Sale.
8. Show, share, or print the receipt.

This five-step workflow is the approved product baseline. The final screen sequence should follow the Simple UX First principle and keep secondary actions out of the main path.

## Approved simple screen flow

The first mobile billing experience should use one clear primary path with optional details revealed only when needed.

### 1. POS unlock

The authorized POS user enters or confirms the Store Device access details and opens the Store's Ganatri POS session.

### 2. New Sale

The first screen after unlock is the New Sale screen:

- Product search is immediately available.
- Barcode scanning is available beside search.
- Categories help users browse without requiring a search term.
- Tapping a product adds it to the current cart.
- The cart remains visible as a compact bottom summary showing item count and total.
- Tapping the summary opens the full cart.

### 3. Cart review

The cart is a focused review screen:

- Increase, decrease, or remove an item.
- Configure add-ons or a combo when the selected product supports them.
- Add a Customer, create a Customer quickly, or continue with Walk-in.
- Add a discount only when needed.
- Review the final total.
- Continue to Payment.

Customer and discount actions should be secondary controls so a normal Walk-in Sale can move directly to Payment.

### 4. Payment

The Payment screen should show only the information needed to complete the Sale:

- Final Sale total and amount already collected, if any.
- Cash, UPI, or Card selection.
- Amount received or amount to collect.
- Clear Paid, Partial, or Due outcome.
- One primary Complete Sale action.

### 5. Sale complete

After the Sale is committed, show a simple confirmation:

- Sale number and total.
- Payment status.
- Receipt preview or receipt action.
- Print, share, and WhatsApp actions where available.
- One prominent New Sale action.

The user should be able to start the next Sale without returning through navigation menus.

### UX rules for this flow

- New Sale is the default destination after POS unlock and after completing a Sale.
- Keep the cart available without hiding the product search screen behind unnecessary navigation.
- Use one prominent action per step: Add to cart, Continue to Payment, Complete Sale, or New Sale.
- Keep Customer, discount, receipt delivery, and other optional actions discoverable but out of the critical path.
- Preserve the current Draft Sale when the user opens an optional action or temporarily leaves the cart.

The five-step core UX flow is approved for implementation planning. Application code should still be designed and built in small reviewed slices.

## Current POS capability map

The existing POS already provides these capabilities:

- Store Device login and device-scoped POS access
- Product browsing, search, categories, and barcode scanning
- Product combos and configurable add-ons
- Cart quantity changes and Draft Sale handling
- Customer search, quick Customer creation, and Walk-in billing
- Discounts by amount or percentage
- Cash, UPI, and Card Payments
- Paid, Partial, and Due Sale settlement states
- Bills history, search, date filters, payment filters, sorting, and Sale details
- Receipt display, browser/USB receipt printing, and sending an invoice through WhatsApp
- Store Tables, table orders, table Payments, and Dine-In/Pick-Up service modes
- KOT generation, standalone KOTs, and kitchen KOT completion
- Product-sales Reports with date filters
- POS WhatsApp conversation inbox and Customer linking
- POS appearance settings

Tables and KOT are conditional Store features. They should appear in the mobile app only when enabled for the Store.

## Recommended mobile scope

### Phase 1 — Fast counter billing

The first release should focus on the most frequent POS task: an authorized POS user completing a normal Sale quickly from a phone.

Recommended Phase 1 capabilities:

1. Store Device authentication and session handling.
2. Product search, categories, barcode scan, combos, and add-ons.
3. A mobile-first cart for changing quantities and reviewing the Draft Sale.
4. Customer selection, quick Customer creation, or Walk-in billing.
5. Discount entry.
6. Cash, UPI, and Card Payments with Paid, Partial, or Due settlement.
7. Sale completion with receipt display, sharing, printing, and WhatsApp delivery where configured.
8. Bills history and the ability to reopen Sale details or resume a Draft Sale.

### Phase 2 — Store-specific operations

Add these after the normal counter Sale is reliable:

- Tables and table orders for Stores using table service
- Dine-In and Pick-Up flows
- KOT generation and kitchen KOT completion for Stores with the KOT System enabled

Tables and KOT will follow the shared billing workflow in the release sequence. The product will still be designed as one app for both retail and restaurant Stores, but restaurant operations will be added after core billing is reliable.

### Phase 3 — Supporting workspace features

Consider these after billing is stable:

- Product-sales Reports
- Full Customer directory management
- WhatsApp conversation inbox and Customer linking
- Appearance and other settings

This phased recommendation is the current implementation-planning baseline. Release timing can still be adjusted after technical validation, especially for Bluetooth printing and receipt layout.

## Additional mobile improvements after the core workflow

These are approved candidates for after the core workflow. Each should be judged by whether it reduces taps, search time, or billing mistakes without complicating the normal Sale path.

### Operational improvements

- Reprint or resend a receipt directly from Sale Details.
- Show printer connection status and provide a simple print-test action.
- Retry failed receipt printing without repeating the Sale.
- Show a clear online connection state and retry failed requests without losing the Draft Sale.
- Keep the selected language and printer per Store Device.

### Faster repeat billing

- Recently used products for quick access.
- Optional pinned or favorite products for high-volume Stores.
- Search Customers directly by phone number.
- Remember the last-used payment method without hiding the other methods.

These convenience features should remain optional and should not add extra steps to the normal Product → Cart → Payment path.

## Approved Version 1 feature priority

The Must have, Should have, May have, and Later required for applicable restaurant Stores groups are approved as the current release-priority baseline. Individual feature behavior and implementation details remain to be discussed.

### Must have

The app should not ship without these capabilities:

- Store Device unlock and session handling
- The approved five-step billing flow
- Product search, categories, and adding products to the Draft Sale
- Customer, quick Customer creation, or Walk-in billing
- Discounts and Cash, UPI, and Card Payments
- Paid, Partial, and Due Sale outcomes
- Sale completion with duplicate-submission protection and clear error recovery
- Online-first request handling that does not lose the Draft Sale after a recoverable failure
- English, Gujarati, and Hindi mobile interface
- Bluetooth thermal-printer invoice printing with an English-only receipt template
- Printer discovery, connection, test, and retry after a printing failure
- Digital receipt display and sharing
- Bills history, Sale Details, Draft Sale resume/delete, and receipt reprint

Combos, add-ons, and barcode scanning are Must have whenever the Store's Catalog uses those existing POS capabilities. They should be conditional rather than shown to every user.

### Should have

These should be included if they do not make the core flow harder to use:

- WhatsApp invoice delivery
- Multiple Payment methods within one Sale
- Search Customers directly by phone number
- Recently used or pinned products
- Product-sales summary Reports
- Full Customer directory actions
- Printer connection status in the main POS shell

### May have

These are useful enhancements after the core workflow is proven:

- More advanced Reports and filtering (deferred from the mobile app for now)
- Advanced receipt layout customization (Version 1 uses the approved standard template)
- More appearance and personalization settings
- Custom cashier shortcuts and other Store-specific quick actions (deferred; built-in quick actions remain)

### Explicitly excluded from the mobile POS app

- POS WhatsApp conversation Inbox and Customer linking

WhatsApp invoice delivery remains included as a focused receipt action.

### Later required for applicable restaurant Stores

These are not part of the first shared counter-billing release, but remain required for restaurant support:

- Tables and table orders
- Dine-In and Pick-Up workflows
- KOT generation and kitchen KOT completion

Offline billing is explicitly not part of Version 1 and should be planned separately because it introduces synchronization and conflict handling.

### Later feature areas already present in POS

- Bills workspace and full Sale history
- Customer directory
- Product-sales Reports
- Tables and table orders
- Dine-In, Pick-Up, and KOT workflows
- WhatsApp invoice delivery; the WhatsApp conversation Inbox is excluded from the mobile POS app
- Appearance settings

## Product direction: retail and restaurant Stores

The mobile app should support both general retail Stores and restaurant Stores from the same Ganatri POS application.

The app should have one shared core for every Store:

- Product selection and cart-based billing
- Customer or Walk-in selection
- Discounts and Payments
- Sale completion and receipts
- Bills and Draft Sale recovery

Restaurant-specific capabilities should be modular and Store-configured:

- Tables and table orders
- Dine-In and Pick-Up service modes
- KOT generation and kitchen completion

Retail users should not be forced through restaurant steps, while restaurant users should be able to access the restaurant workflow without a separate app. Store capability settings should control which features appear.

### 4. Existing Hisab capabilities

Decide which existing capabilities the mobile app should reuse:

- Store Device authentication and device-scoped POS access
- Organization and Store scope
- Catalog Product search and selection
- Customer search and selection
- Sales, Draft Sales, Payments, and Payment Status
- Receipt generation and sharing
- Existing Admin and POS API contracts

The Customer directory and the Customer picker used during billing may have different search and pagination behavior. The mobile workflow should define the required Customer-search experience explicitly.

### 5. Connectivity

Version 1 will use an online-first connectivity model:

- Billing requires an active internet connection.
- Offline billing and later synchronization are deferred until after the core workflow is stable.
- Limited local caching may still be considered for improving loading and navigation, but it must not imply that Sale creation works offline.

### 6. Devices and hardware

Decide which devices and accessories are required:

- Android-only for the first release; iPhone support may be considered later
- Barcode scanner support
- Bluetooth or network receipt printers
- Cash drawer support
- Payment terminal or QR-payment integration
- Phone camera scanning

### 7. Security and operations

Define:

- Store Device registration and replacement
- Staff permissions and Store access
- Session expiry and device revocation
- Handling failed Payments and interrupted Sale creation
- Audit information for the Store Device that created a Sale

### 8. Success criteria

Define measurable outcomes for the MVP. For example:

> A cashier can create and complete a normal Sale in under one minute.

Other useful measures may include successful Sale completion rate, search speed, receipt delivery success, and recovery from interrupted connectivity.

## Remaining implementation gates

The product direction is approved. These technical choices still need validation before the related implementation slice begins:

1. Confirm the Bluetooth printer models, connection protocol, paper widths, and ESC/POS capabilities required on day one.
2. Validate the English receipt layout and encoding on the target thermal printers. Gujarati and Hindi thermal output is explicitly out of scope.
3. Confirm whether MMKV-only authentication storage can meet the required security standard. MMKV encryption and Android Keystore-backed key handling must be validated before storing the POS token.
4. Confirm whether the existing Draft Sale, Sale, and Payment service contracts fully cover mobile billing, including duplicate-submission protection and multiple Payments.
5. Decide whether barcode scanning starts with the phone camera only or also includes an external scanner.
6. Define the supported Android test devices and minimum Android version.

The following are already decided: one Android-only app for retail and restaurant Stores; online-first Version 1; the five-step core billing flow; English, Gujarati, and Hindi mobile interface support; English-only Bluetooth thermal invoice printing; later restaurant Tables, Dine-In, Pick-Up, and KOT; and exclusion of the POS WhatsApp Conversation Inbox.

## Initial setup plan

The mobile POS should be built inside the existing `apps/mobile` Expo application. We should not create a second mobile project unless the current application is explicitly rejected.

### Setup sequence

1. Confirm the working branch is `feat/pos-mobile-app` and keep this planning document as the source of truth.
2. Install repository dependencies using the existing Bun workspace setup.
3. Configure the mobile API base URL for local development with `EXPO_PUBLIC_BASE_API_URL`.
4. Start the existing backend API on port `8001`.
5. Start the Expo development server from `apps/mobile`.
6. Run the app on an Android emulator or physical Android device; use the existing Android reverse-proxy or LAN-IP setup to reach the local API.
7. Verify the existing API connection and device identifier behavior before replacing the generic mobile authentication flow.
8. Create a mobile development checklist covering Device unlock, session expiry, New Sale, Payment, Sale completion, and printer testing.

### First setup outcome

Before feature work begins, a developer should be able to open the mobile app, connect it to the local API, authenticate a Store Device using the existing POS credentials, and reach an authenticated mobile POS shell. This is a setup verification goal, not an implementation request in this document.

## Proposed technology stack for discussion

This is a recommendation based on the current repository. It is not yet an approved technical decision.

### Application

- Expo and React Native, using the existing `apps/mobile` project.
- TypeScript with strict type checking.
- React Navigation native stack for authentication, POS, Bills, Customers, Reports, and Settings routes.
- Existing Uniwind/Tailwind styling for the mobile UI.
- Existing React Native safe-area and screen integrations.

### State and data

- Zustand for client-owned state such as the POS session, language preference, cart UI state, printer preference, and recent/pinned Products.
- TanStack Query for server state such as Products, Customers, Bills, Store capabilities, Reports, and Sale details.
- Existing `@repo/services` for API calls and `@repo/types` for shared DTOs and validation types.
- MMKV for all local persistence, including preferences, POS convenience data, Device Session data, and authentication token storage.
- Online-first behavior. Local state may preserve a Draft Sale during navigation or a recoverable request failure, but it must not create an offline Sale.

### Authentication

- Reuse the existing Store Device authentication service and Device Session contract.
- Use a POS-specific session/bootstrap boundary rather than treating the mobile POS as the current generic user Dashboard.
- Store the token and device identifier in MMKV only, using MMKV encryption where required by the security review.
- The encryption key must not be hardcoded or stored unprotected in the same MMKV instance. Android Keystore-backed key handling is an implementation gate even though `expo-secure-store` is not used.
- Return to POS Unlock on logout, expiry, revocation, or an invalid Device Session.

### Storage decision

MMKV-only local storage is approved for the mobile POS. The app will not use `expo-secure-store`. MMKV will own preferences, Recent/Pinned Product data, printer preferences, Device Session data, and the authentication token. Before implementation is accepted, the team must validate encrypted MMKV configuration and a safe Android Keystore-backed encryption-key strategy; plain or hardcoded token storage is not acceptable.

### Hardware

- Use a native Bluetooth printer adapter behind a small application-level printer interface.
- Keep receipt content generation separate from Bluetooth transport so the same Sale receipt can be displayed, shared, or printed.
- Do not assume the browser WebUSB printer integration works on mobile.
- Validate the selected printer protocol and English receipt layout with physical hardware before finalizing the adapter.

### Localization

- Use `i18next` with `react-i18next` for English, Gujarati, and Hindi localization.
- Bundle translation resources with the Android app for Version 1.
- Use English as the fallback language.
- Organize translations by feature namespace, including Common, POS Unlock, New Sale, Cart, Payment, Bills, Customers, Reports, Settings, and restaurant/KOT workflows.
- Translate application-owned labels, validation messages, errors, empty states, payment states, and receipt actions.
- Do not translate Product names, Customer names, or other business-entered values.
- Persist the selected interface language in MMKV and restore it when the app restarts.

### Localization decision

`i18next` and `react-i18next` are approved for mobile localization. The Android app will bundle English, Gujarati, and Hindi translation resources, use English as the fallback, persist the selected interface language in MMKV, and keep business-entered Product and Customer values unchanged. Printed invoices remain English-only.

### Barcode scanning decision

Phone-camera barcode scanning is approved for Version 1. Manual Product search remains available as the fallback and scanning is never required for billing. Repeated scans increase the matching Product quantity. An unknown barcode shows a clear not-found state with a search fallback. External Bluetooth barcode scanners are deferred for later consideration.

### Android platform decision

Android 8/API 26 or newer is approved for the first release. The initial device matrix must include an Android emulator, one modern physical Android phone, and one representative low- or mid-range Store Device. Camera scanning and app performance must be checked across the supported devices. iPhone support remains deferred.

### Cart and Draft Sale decision

The mobile Cart will use a hybrid persistence model. Product additions and quantity changes update the local Cart immediately so the primary billing path remains responsive. A server Draft Sale is created or updated when the user explicitly saves the Draft, pauses or leaves the billing flow, or reaches the server-backed checkout boundary. The local Cart is never treated as a completed Sale. Server Draft Sales remain the authoritative records for resume, delete, and recovery from a recoverable request failure. The app must preserve the current local Cart while a Draft Sale request is loading or retrying and must not create duplicate Draft Sales during repeated taps or network retries.

### Backend API strategy decision

The mobile POS will reuse the existing shared POS service and type contracts first. No new backend contract is approved at this stage. Any API change must be justified by a verified mobile workflow gap, added to the shared service/type boundary, and covered by the relevant backend and contract tests.

#### Authentication and Store context

- Use the existing Store Device authentication operations for session restore, login, and logout.
- Use the existing Device Session response to establish Organization, Store, Device, and Store capability context.
- Use the existing POS settings data where the mobile UI needs Store Device settings or receipt configuration.
- Keep authentication and API calls behind service functions; screens must not construct ad-hoc endpoint requests.
- On invalid, expired, or revoked authentication, clear the mobile session and return to POS Unlock.

#### Catalog and Product selection

- Use the existing POS Product and Category services for the New Sale catalog.
- Use the existing Combo, Add-on, and Product Add-on Attachment services when a Product requires configuration.
- Keep barcode lookup and search presentation in the mobile layer while treating the server Catalog as authoritative for Product identity, price, availability, combo rules, and add-on rules.
- Do not duplicate pricing, discount, combo, or add-on calculations in the mobile UI beyond immediate presentation.

#### Customers and Sales

- Use the existing POS Customer list service for billing Customer selection and the separate Customer Directory.
- Use the existing Customer create and update operations for minimal quick creation and directory editing.
- Use the existing Sales list and Sale detail operations for Bills and Sale Details.
- Preserve the distinction between a Draft Sale and a committed Sale. The mobile app must not present a local Cart as a completed Sale.

#### Draft Sale and checkout

- Verify the existing Draft Sale create, update, detail, and delete operations before implementing Cart persistence.
- Verify the intended relationship between Draft Sale update, Sale replacement, Sale commit, Sale completion, and Payment collection.
- Select one authoritative mobile checkout path after that verification rather than combining operations speculatively.
- Server-returned totals, discounts, Payment status, Sale number, and receipt data are authoritative.
- A successful response must be retained in mobile state before receipt actions begin.
- A failed or uncertain request must not trigger an automatic second Sale submission.

#### Payments

- Reuse the existing Payment operation and shared Payment types.
- Verify how Cash, UPI, Card, Partial, Due, and multiple Payment rows are represented by the current contract.
- The mobile UI may calculate an expected remaining amount for immediate feedback, but the server response determines the recorded Payment and Sale status.
- Payment retry behavior must distinguish a confirmed failure from an unknown network result.
- Duplicate-submit protection must be verified at the service/API boundary, not assumed from button disabling alone.

#### Bills, Reports, and restaurant capabilities

- Use the existing Sales list and detail services for Bills, Draft Sale recovery, and Sale Details.
- Use the existing Product Sales Summary service for the approved simple Reports view.
- Use the existing Table, Table Area, Table Order, and checkout services only when the Device Session exposes the relevant Store capability.
- Use the existing KOT and Kitchen KOT services in the later restaurant phase, keeping KOT operationally separate from Sale and Payment.
- Use the existing WhatsApp invoice status, queue, and retry operations for the focused receipt action; do not bring the WhatsApp Conversation Inbox into the mobile app.

#### API error and cache rules

- Normalize service errors at the mobile boundary into user-readable localized states without exposing raw server details.
- Use TanStack Query for server cache and invalidation after successful mutations.
- Scope cached data by authenticated Store/Device context so a session change cannot display another Store's data.
- Invalidate or refresh Product, Customer, Sale, Table, KOT, and Report data after mutations where the current contract requires it.
- Treat MMKV as local convenience/session storage, never as the authoritative source for Catalog, totals, Payments, Sales, or Store capabilities.

#### API verification acceptance gate

The API strategy is accepted for implementation only after a focused contract review demonstrates that the existing services can support:

1. Store Device session restore and logout.
2. Product/category browsing and optional combo/add-on configuration.
3. Draft Sale creation, update, resume, and delete.
4. Customer search, quick create, and update.
5. One authoritative checkout path with duplicate-submit protection.
6. Cash, UPI, Card, Partial, Due, and optional multiple Payments.
7. Sale Details, receipt data, Bills, and Draft Sale recovery.
8. Store capability-gated Tables, service modes, and later KOT.

If a gap is found, the change must be proposed explicitly before implementation and must preserve the shared web POS behavior.

### Checkout operation decision

The mobile app will use separate existing operations for separate Sale situations rather than hiding all billing behavior behind one ambiguous client operation:

- A normal New Sale that has not been saved as a server Draft Sale uses the direct complete-Sale operation.
- A Sale that already has a server Draft Sale uses the Draft Sale commit operation.
- A later payment against an existing Due or Partial Sale uses the Payment collection operation.
- A Table order uses the restaurant Table checkout operation.
- Editing an existing recorded Sale uses the replacement operation only when that workflow is explicitly available; it is not part of the normal New Sale path.
- Every new checkout request carries a unique request identifier where supported by the contract.
- The UI disables unsafe repeated submission, but server-side request handling remains authoritative for duplicate protection.
- The server response determines the final Sale number, totals, Payment records, Payment status, service mode, Table context, and receipt data.
- Receipt printing, sharing, and WhatsApp delivery begin only after the Sale response is confirmed.
- An unknown network result must not automatically start a second checkout attempt; the app must first recover or verify the Sale state.

### POS session lifecycle decision

The mobile POS session lifecycle is approved as a guarded state flow: Starting, Locked, Unlocking, Active, Session Expired/Revoked, and Logging Out. On startup the app loads encrypted MMKV session data and preferences, verifies the existing Device Session, and shows only the POS shell when verification succeeds. Temporary network failure during session checking shows a retryable state rather than silently logging out. Invalid or revoked sessions clear the token and Store-scoped cached data and return to POS Unlock. Logout performs remote logout when possible, clears local session data, and returns to POS Unlock. One active Store Device session is supported; session data is never passed through navigation parameters.

### Testing strategy decision

The mobile POS testing strategy is approved as layered focused testing plus real Android device smoke testing. The repository's existing Bun test standard will be used for pure business logic and shared service/type contract tests. Mobile component tests will cover POS Unlock, New Sale, Cart Review, Payment, and Sale Complete behavior. Tests will focus on externally visible results such as totals, statuses, navigation outcomes, translated labels, retry states, and preserved Draft Sale data rather than implementation details. The complete Unlock → New Sale → Cart → Payment → Sale Complete → Bills flow must be checked on a real Android device. A large end-to-end framework such as Detox is deferred until focused tests and device smoke testing prove insufficient.

### Visual token and typography decision

The V1 visual direction is approved: Uniwind will provide semantic Light/Dark design tokens, with a Ganatri blue primary color, neutral background/surface/text/border colors, and consistent green, orange, red, and blue operational states for Paid, Partial, Due, Failed, and informational feedback. The spacing scale is 4, 8, 12, 16, 20, 24, and 32; standard controls are 48 high; primary POS actions are 52–56 high; icon actions are at least 44×44; cards use a 16 radius; and inputs/buttons use a 12–16 radius. Typography includes title, heading, body, label, caption, money amount, and large total variants. Android system fonts are preferred first, with Gujarati and Hindi rendering validated on Android 8+ devices; a bundled fallback font is added only if target devices require it. Product and Customer names remain in their original form.

### Testing

- Add focused tests for cart calculations, discounts, Payment status derivation, receipt formatting, localization coverage, and printer failure behavior.
- Add service/API contract tests at the shared `@repo/services` and `@repo/types` boundaries where behavior is shared with the web POS.
- Add mobile smoke tests for Unlock → New Sale → Cart → Payment → Sale Complete → Bills.
- Test English Bluetooth printing on supported physical devices and printers; an emulator-only result is not sufficient.

## Approved UI and design-system direction

The mobile POS will use Uniwind as its styling and design-token foundation. This decision is approved for implementation planning.

### Component approach

The app will use React Native primitives such as `View`, `Text`, `Pressable`, `TextInput`, `FlatList`, and `Modal` underneath a small internal POS component layer. The first reusable components should include:

- `Screen` and scrollable screen layout
- `AppText` with consistent text variants
- `Button` and `IconButton`
- `TextField` and `SearchField`
- `Card`, `Badge`, and `StatusPill`
- `EmptyState` and `ErrorState`
- `BottomSheet` or focused modal actions
- `MoneySummary` and payment method selector
- `ProductCard`, cart summary, and cart line item

The component layer should hide repeated visual and interaction decisions without becoming a second framework. A focused third-party library may be introduced later for a complex control such as a date picker or bottom sheet if the native implementation is insufficient.

### Approved design-token categories

Components should consume semantic tokens rather than raw colors or ad-hoc measurements:

- Colors: `background`, `surface`, `surface-muted`, `foreground`, `foreground-muted`, `border`, `primary`, `success`, `warning`, `danger`, and `info`.
- Spacing: a simple 4-point scale from 4 through 32.
- Radius: small 8, medium 12, large 16, and pill.
- Touch sizes: at least 44 for icon actions, 48 for standard controls, and 52–56 for primary POS actions.
- Typography: page title, section heading, body, label, caption, money amount, and large total.
- Operational states: consistent visual treatment for Paid/completed, Partial/pending, Due/failed, and Draft/inactive.

Light and Dark themes should provide the values for these semantic tokens. The mobile POS should keep the visual language simple, high contrast, touch-friendly, and optimized for the Product → Cart → Payment flow.

### UI rules

- Use one prominent action per screen.
- Keep the cart reachable throughout billing.
- Keep optional Customer, discount, printer, and sharing actions secondary.
- Use large readable totals and clear Payment status colors.
- Keep retail screens free of restaurant-only controls.
- Test the component states in English, Gujarati, and Hindi layouts.

## Approved navigation baseline

The mobile POS will use one shared app shell for retail and restaurant Stores:

- POS Unlock is the unauthenticated entry screen.
- New Sale is the primary authenticated destination.
- Cart remains reachable throughout the billing flow.
- Bills, Customers, Reports, and Settings are supporting destinations.
- Tables and KOT appear only for restaurant Stores where the corresponding Store capabilities are enabled.
- The user should be able to start a New Sale immediately after POS Unlock and after Sale completion.
- Navigation should not force retail users through restaurant workflows.

### POS Unlock decision

POS Unlock is approved as a focused Store Device access screen with Organization username, Device username, Device secret, language selection, one primary Unlock POS action, loading/error states, remembered non-secret identifiers, and no registration or generic user Dashboard. A successful unlock opens directly to New Sale; expired or revoked sessions return to POS Unlock.

### New Sale decision

New Sale is approved as the primary authenticated destination. It will provide Product search, barcode scanning, category shortcuts, direct Product-to-Cart actions, Recent Products when search is empty, optional pinned Products, and a persistent Cart bar showing item count, total, and View Cart. Restaurant-only Table and service-mode actions appear only when enabled for the Store.

### Cart Review decision

Cart Review is approved as a focused Draft Sale review screen. It will show selected Products, quantity controls, removal, combo/add-on details, subtotal, final total, optional Customer selection with Walk-in as the default, optional discount entry, Draft Sale preservation, and Continue to Payment as the single primary action.

### Payment decision

Payment is approved as a focused Sale settlement screen. It will support Cash, UPI, and Card, show the final total and collected amount, derive Paid, Partial, or Due status, allow optional additional Payment rows, validate amounts, prevent duplicate Sale submission, show recoverable errors, and use Complete Sale as the single primary action.

### Sale Complete decision

Sale Complete is approved as a simple confirmation screen showing success, Sale number, final total, Payment status, optional Customer, and receipt access. Print, share, and configured WhatsApp delivery remain secondary retryable actions. New Sale is the primary action, and a failure in printing or sharing must never undo a completed Sale.

### Bills decision

Bills is approved as a supporting workspace defaulting to today's Sales. It will provide Sale/Customer search, simple date/payment filters, Sale cards with settlement status, Sale Details, Draft Sale resume/delete, receipt viewing, reprint, sharing, and configured WhatsApp delivery.

### Customers decision

Customers is approved as a separate supporting workspace with search by name or phone, Customer list and due visibility, simple filters and sorting, add/edit actions, Customer details and Sales history, and the ability to use a Customer for the current Sale. Customer selection remains optional in billing and defaults to Walk-in.

### Reports decision

Reports is approved as a read-only supporting workspace. It will default to Today and provide simple date filtering, Sales count, Sales value, collected amount, due amount, average Sale value, and a Products Sold list with quantity and value. Complex charts and advanced analytics are deferred.

### Settings decision

Settings is approved as a simple supporting workspace with English/Gujarati/Hindi language selection, Light/Dark/System theme, Standard/Large display size, Bluetooth printer settings, Store/Device information, and Logout. Advanced personalization and custom cashier shortcuts are deferred.

### Tables decision

Tables is approved as a restaurant-only workspace. It will appear only when the Store's Table Management capability is enabled, group Tables by area, show clear availability and occupancy states, allow a user to start or reopen a Table order, infer Dine-In for a selected Table, show the current order total, and return the user to Tables after completing the Sale. Retail Stores must not see the Tables workspace or its actions.

## Detailed approved screen specifications

This section is the detailed behavior baseline for the approved mobile POS screens. It is intentionally product- and behavior-focused; implementation may choose different internal components as long as the external behavior remains the same.

### 1. POS Unlock

#### Purpose

Allow any authorized person with Store Device access to open the correct Ganatri POS Store on an Android device.

#### Entry and layout

- POS Unlock is the first screen when there is no valid Device Session.
- It is also the destination after logout, session expiry, Device revocation, or an invalid session response.
- The screen should show the Ganatri POS identity without presenting a generic user login or registration flow.
- The form should be comfortable on a phone, use large touch targets, and keep one primary action visible.

#### Fields and actions

- Organization username.
- Device username.
- Device secret.
- Language selector for English, Gujarati, and Hindi.
- Primary action: Unlock POS.
- Optional remembered values: Organization username and Device username.
- The Device secret must never be remembered or displayed after entry.

#### States and behavior

- Empty state: show required-field validation before submitting.
- Editing state: preserve entered values if a non-destructive validation error occurs.
- Loading state: disable the submit action and show progress while authentication is in progress.
- Invalid credentials: show a clear recoverable error without clearing non-secret identifiers.
- Network failure: explain that the POS could not connect and allow retry without losing the form.
- Successful authentication: create the POS Device Session and open New Sale.
- Expired, revoked, or invalid restored session: clear the invalid session and return to POS Unlock.

#### Security behavior

- Use the existing Store Device authentication model and Device Session contract.
- Store the authentication token securely.
- Send the device identifier required by the API.
- Do not expose the Device secret in logs, local preferences, navigation parameters, or error messages.

### 2. New Sale

#### Purpose

Provide the fastest path for creating a normal counter Sale on a phone.

#### Entry and layout

- New Sale is the default authenticated destination after POS Unlock.
- New Sale is also the default destination after Sale Complete and New Sale actions.
- The header may show Store identity and the selected interface language.
- Product search must be immediately available without opening another screen.
- Barcode scanning must be available beside or within the search area.
- Categories should be available as compact shortcuts or horizontally scrollable chips.
- Products should use large touch targets and readable names/prices.
- The Cart must remain available as a persistent bottom summary.

#### Product behavior

- Tapping an ordinary Product adds it directly to the current Draft Sale.
- Repeated scans or taps increase the existing quantity instead of creating confusing duplicate lines where the Product rules allow quantity merging.
- Product search remains available when the camera or scanner is unavailable.
- Combos and add-ons are shown only when the selected Product requires configuration.
- Recent Products may appear when search is empty.
- Pinned Products may be available through an optional Pinned filter or shortcut.
- Product names, prices, and other Catalog data are shown as stored; interface translation must not translate business-entered Product names.

#### Cart behavior

- The persistent Cart summary shows item count, current total, and View Cart.
- Adding a Product updates the Cart summary immediately.
- Opening Cart must preserve the current Product browsing context and Draft Sale.
- The user must be able to start a fresh Sale after completing or discarding the current Draft Sale.

#### Restaurant behavior

- Tables, Dine-In, Pick-Up, and KOT actions are hidden for retail Stores.
- For applicable restaurant Stores, restaurant actions appear only when their Store capability is enabled.
- Starting from a Table uses the same New Sale flow while carrying the Table and Dine-In context.

### 3. Cart Review

#### Purpose

Allow the user to verify the Draft Sale before collecting money, without forcing unnecessary data entry.

#### Sale line behavior

- Show every selected Product with name, quantity, unit price, line total, and relevant combo/add-on details.
- Provide clear increase and decrease quantity actions.
- Provide a remove action for each line.
- Preserve configured combo and add-on selections when returning to Cart Review.
- Update subtotal and final total immediately after any line change.
- Prevent invalid quantities and show a clear error if a line can no longer be sold.

#### Optional information

- Customer selection is optional.
- Walk-in is the default when no Customer is selected.
- The user may search for a Customer by name or phone.
- The user may create a minimal Customer with name and phone when needed.
- The user may change or remove the selected Customer before Payment.
- Discount entry is optional and supports amount or percentage.
- Quick discount presets may be offered, but the user must be able to enter a custom valid value.
- The discount must not exceed the allowed total and must be editable or removable before Payment.

#### Restaurant information

- A Table-started Sale shows its Table and Dine-In context.
- A direct restaurant Sale may choose Dine-In or Pick-Up.
- Retail Stores do not show service-mode controls.
- The selected service mode remains visible in later Sale Details and receipts.

#### Primary action

- Continue to Payment is the only prominent action.
- Customer, discount, Draft Sale, Table, and service-mode actions remain secondary.
- A recoverable network failure must not silently discard the Draft Sale.

### 4. Payment

#### Purpose

Collect and record money against the Sale with the least possible user effort.

#### Layout

- Show the final Sale total prominently.
- Show the amount already collected and remaining amount when Payments already exist.
- Present Cash, UPI, and Card as the primary Payment methods.
- Start with one Payment row by default.
- Additional Payment rows are optional and must not complicate ordinary one-method billing.
- Show the amount field appropriate to the selected method.
- Use one prominent Complete Sale action.

#### Payment calculation

- Amount collected equal to the Sale total produces Paid.
- Amount collected greater than zero but less than the Sale total produces Partial.
- Amount collected equal to zero leaves the Sale Due/unpaid.
- Multiple Payment rows show total collected and remaining amount.
- The user can edit or remove optional Payment rows before completion.
- The application must not create duplicate Payments or duplicate Sales if Complete Sale is tapped repeatedly.

#### Validation and failure behavior

- Reject negative, malformed, or invalid amounts.
- Show a clear error when the collected amount or Payment combination is not allowed.
- Keep the Draft Sale and entered Payment details available after a recoverable request failure where safe.
- Do not show success until the server confirms the Sale result.
- If the server result is uncertain, prevent an unsafe second submission and provide a controlled recovery path.

### 5. Sale Complete

#### Purpose

Confirm that the Sale was recorded and make the next Sale quick to start.

#### Confirmation content

- Show a clear success state after the server confirms completion.
- Show Sale number.
- Show final total.
- Show Paid, Partial, or Due status.
- Show Customer when one was selected; otherwise show Walk-in where useful.
- Show Table and service mode when applicable.
- Provide receipt access without requiring the user to navigate to Bills.

#### Receipt actions

- Print invoice through the configured Bluetooth thermal printer.
- Share the digital receipt through the available Android sharing mechanism.
- Send the invoice through WhatsApp only when configured and a valid Customer phone is available.
- Use an English-only printed receipt template. The mobile interface language does not change the printed invoice language.
- Printing, sharing, or WhatsApp delivery is retryable and must not change the completed Sale.
- Show sending, sent, failed, and retry states for WhatsApp delivery.

#### Navigation

- New Sale is the primary action.
- Receipt actions remain secondary.
- Returning to Bills or Sale Details must show the same completed Sale rather than creating another one.

### 6. Bills

#### Purpose

Help the user find historical Sales, recover Draft Sales, and repeat receipt actions.

#### List behavior

- Default the list to today's Sales.
- Show Sale number, date/time, Customer or Walk-in, total, and Payment status on each card.
- Support search by Sale number and Customer information.
- Keep filters simple and hidden behind a filter action when they are not needed for everyday use.
- Support date, Payment status, and Payment method filters.
- Use clear loading, empty, and failed-request states.

#### Sale Details

- Show the full Sale summary, line items, quantities, discounts, Customer, service mode, Table when applicable, Payments, total, and Payment status.
- Show receipt preview or receipt access.
- Provide print, reprint, share, and configured WhatsApp actions.
- A receipt action failure must provide retry without changing the Sale.

#### Draft Sales

- Clearly separate Draft Sales from completed or receivable Sales.
- Allow a user to resume a Draft Sale.
- Allow a user to delete/discard a Draft Sale after confirmation.
- Resuming a Draft Sale returns the user to Cart Review with its Product and optional context intact.

### 7. Customers

#### Purpose

Provide Customer management without slowing down the normal billing path.

#### Directory behavior

- Keep the Customer Directory separate from the New Sale and Cart screens.
- Search progressively by Customer name or phone number.
- Show Customer name, phone, and outstanding due when available.
- Provide simple filters and sorting without making the first view complex.
- Show useful loading, empty, and error states.

#### Customer actions

- Add a Customer using the minimum required information: name and phone.
- Edit Customer information.
- Open Customer details.
- Show relevant Sales history and current due information.
- Use the Customer for the current Draft Sale.
- Do not require Customer creation or selection before Payment.
- Keep Walk-in available when no Customer is needed.

### 8. Reports

#### Purpose

Give an authorized POS user a quick operational view without turning the mobile POS into an analytics product.

#### Report behavior

- Reports are read-only.
- Default the reporting period to Today.
- Allow simple date filtering.
- Show Sales count.
- Show total Sales value.
- Show collected amount.
- Show due amount.
- Show average Sale value.
- Show Products Sold with Product name, quantity, and value.
- Use simple lists and summary cards rather than complex charts.
- Clearly show empty, loading, and failed-request states.

### 9. Settings and Appearance

#### Purpose

Expose only the small set of preferences needed for comfortable daily POS use.

#### Language

- Allow switching between English, Gujarati, and Hindi.
- Apply the selected language to navigation, labels, validation, errors, empty states, Payment states, and receipt actions.
- Do not translate Product names, Customer names, or other business-entered values.
- Persist the selected interface language according to the agreed mobile preference storage.

#### Appearance

- Provide Light, Dark, and System theme choices.
- Provide Standard and Large display size choices.
- Keep contrast and touch targets usable in every theme and size.

#### Printer and session

- Provide access to printer selection, connection, disconnection, and test print.
- Show Store and Device information without exposing secrets.
- Provide Logout.
- Do not place advanced receipt customization or custom cashier shortcut configuration in this release.

### 10. Tables

#### Purpose

Support restaurant Stores that manage orders by physical Table without exposing restaurant complexity to retail Stores.

#### Visibility and grouping

- Show Tables only when the Store's Table Management capability is enabled.
- Hide the Tables navigation item and actions for retail Stores or Stores without the capability.
- Group Tables by configured area.
- Show the Table name or number clearly.
- Provide a clear legend or equivalent explanation for Table states.

#### Table states and actions

- Available: allow the user to start a new Table order.
- Occupied or open order: allow the user to open the current order.
- Attention-required states, if supplied by the existing POS contract, must be visually distinct and explain the next action.
- Show the current order total when an order exists.
- Do not create a second active order accidentally when reopening an occupied Table.

#### Table Sale behavior

- Selecting an available Table starts the shared New Sale flow with that Table attached.
- Selecting a Table implies Dine-In.
- The Table and Dine-In context remain visible in Cart Review, Payment context where useful, Sale Complete, Sale Details, and the receipt data.
- Completing a Table Sale returns the user to the Tables workspace when that is the natural next operation.
- Table operations remain separate from KOT operations; KOT is a later restaurant capability and does not replace Sale or Payment completion.

### 11. Bluetooth printer setup and invoice printing

#### Purpose

Allow an Android POS user to print an English receipt from the mobile app without making printing a dependency of Sale completion.

#### Setup behavior

- Printer settings are available from Settings and from a relevant receipt action when no printer is configured.
- The user can discover available Bluetooth printers.
- The user can select one printer and connect to it.
- The user can run a test print before using the printer for a real receipt.
- The user can remember the selected printer for the Android installation or Store Device as agreed during implementation.
- The user can change, disconnect, or reconnect the selected printer.
- The UI must show disconnected, connecting, connected, testing, failed, and retry states.

#### Receipt behavior

- The receipt uses the approved standard receipt template.
- The printed template is English-only regardless of the selected mobile interface language.
- Printing is available from Sale Complete and Sale Details.
- The same receipt content should be reusable for display, sharing, and printing where practical.
- The mobile transport is Bluetooth and must not assume that the existing browser WebUSB transport works on Android.
- The exact printer model, paper width, Bluetooth protocol, and ESC/POS command support are implementation-time hardware decisions.

#### Failure behavior

- A printer failure must not undo, duplicate, or block a completed Sale.
- The user must be able to retry printing from Sale Complete or Sale Details.
- A failed print must explain whether the issue is disconnected printer, unavailable printer, unsupported command, or another recoverable failure when the platform exposes that information.
- Digital receipt display and sharing remain available when printing fails.

### 12. WhatsApp invoice delivery

#### Purpose

Provide an optional receipt-delivery action without turning WhatsApp into a required part of billing.

#### Availability

- Show the action only when the Store's WhatsApp delivery configuration is available.
- Require a valid Customer phone number.
- Do not show the action for a Walk-in Sale without a valid Customer phone.
- Keep WhatsApp invoice delivery separate from the excluded POS WhatsApp Conversation Inbox.

#### States and behavior

- Sending: show progress and prevent confusing duplicate taps.
- Sent: show a clear success state.
- Failed: show the failure and preserve a retry action.
- Retry must resend the receipt action without creating another Sale.
- WhatsApp delivery must never block Sale completion or change the Sale's Payment status.

### 13. Restaurant service modes

#### Availability

- Restaurant service modes are visible only for applicable restaurant Stores.
- Retail Stores must not see Dine-In, Pick-Up, or related service-mode actions.
- A selected Table implies Dine-In and does not require a second service-mode decision.
- A direct restaurant Sale may select Dine-In or Pick-Up.

#### Visibility and persistence

- Show the selected service mode in Cart Review when it affects the Sale.
- Preserve it through Payment and Sale Complete.
- Show it in Sale Details and approved receipt data.
- Allow the user to correct the service mode before the Sale is completed when the existing POS rules allow it.
- Do not expose restaurant service-mode choices in a retail Store's primary Sale path.

### 14. KOT and kitchen completion

#### Scope

KOT is a later restaurant capability for Stores with the KOT System enabled. It is not part of the first shared counter-billing release and is hidden for retail Stores.

#### Workflow

- KOT remains operationally separate from Sale and Payment.
- A restaurant user can create a KOT from the relevant restaurant order context.
- A single Sale may produce multiple KOT batches when items are added or sent at different times.
- The kitchen view shows pending KOT work.
- Kitchen staff can mark a KOT complete.
- The mobile app must distinguish pending, in-progress/available-for-completion, and completed KOT states as supported by the existing contract.
- Completing a KOT does not itself complete or settle the Sale.
- A user can return to the related restaurant order and continue the shared billing flow.

### 15. Faster repeat billing

- Recent Products may appear when Product search is empty.
- Pinned Products may be available through a Pinned filter or shortcut.
- Search and Barcode Scan remain the primary Product-selection tools.
- Recent and pinned data is a local convenience and must not become a second Catalog source of truth.
- Built-in quick actions should keep New Sale, Barcode Scan, Cart, Recent/Pinned Products, contextual Tables/KOT, and post-Sale receipt actions easy to access.
- Custom cashier shortcut configuration is deferred.

### 16. Receipt and data rules

- Version 1 uses the approved standard receipt template.
- Advanced receipt layout customization is deferred.
- The mobile interface can be English, Gujarati, or Hindi.
- The printed invoice template is English-only.
- Product names, Customer names, and other business-entered values remain stored values and are not translated by the interface localization system.
- Receipt actions must use the completed Sale record and must not recreate billing data.

### 17. Connectivity and recovery

- Version 1 is online-first.
- Billing requires an active connection to the backend API.
- Offline Sale creation and later synchronization are explicitly deferred.
- Local state may preserve a Draft Sale while the user navigates or retries a recoverable request.
- A recoverable network error must not silently discard the Draft Sale.
- The app must distinguish a confirmed Sale from an unknown request result and must not encourage unsafe duplicate submission.
- Loading, empty, unauthorized, expired-session, network-failure, and server-error states should be designed for the shared component layer.

### 18. Store capability and access rules

- The app serves both retail and restaurant Stores through one shared mobile POS application.
- Store Device access determines whether the user can enter the POS.
- Store capability flags determine whether Tables, service modes, and KOT appear.
- The app must not infer owner or cashier role names beyond the existing Store Device authorization model.
- Store and Device identity should remain visible where it helps prevent billing in the wrong Store.
- Device secrets, authentication tokens, and other reusable credentials must never be displayed in the UI.

## Multi-phase implementation roadmap

Implementation is divided into multiple capability phases. Each phase contains small vertical subphases. A phase may begin only after its dependencies are satisfied; a subphase must have a clear external behavior, focused tests, a reviewable scope, and a real Android verification point where applicable. These are planning units only; implementation has not started.

| Phase | Capability | Subphases | Phase exit condition |
| --- | --- | --- | --- |
| Phase 0 | Planning and technical validation | 0.1–0.4 | Product baseline, API boundary, native dependencies, and Android test matrix are ready. |
| Phase 1 | POS foundation | 1.1–1.8 | A valid Store Device can unlock the app and reach the New Sale shell. |
| Phase 2 | Catalog and Product selection | 2.1–2.5 | A user can find, scan, configure, and add Products to Cart. |
| Phase 3 | Cart and Draft Sale | 3.1–3.6 | A user can review, customize, save, resume, and discard a Draft Sale. |
| Phase 4 | Payment and Sale completion | 4.1–4.5 | A user can complete a Sale and receive a confirmed digital receipt. |
| Phase 5 | Bills and supporting workspaces | 5.1–5.5 | A user can find Sales, manage Customers, view Reports, and manage Settings. |
| Phase 6 | Bluetooth printing | 6.1–6.3 | A supported Android device can print an English receipt and recover from printer failure. |
| Phase 7 | Restaurant operations | 7.1–7.4 | An enabled restaurant Store can use service modes, Tables, Table orders, and later KOT. |
| Phase 8 | Hardening and release readiness | 8.1–8.4 | The approved Android release passes tests, recovery, security, and release checks. |

The phase order protects the primary Product → Cart → Payment workflow. Printer hardware is intentionally validated in Phase 6, while restaurant operations follow the shared counter-billing path in Phase 7.

### Phase 0 — Planning and technical validation

Goal: remove avoidable uncertainty before application work starts.

Phase exit: approved scope, shared API audit, native dependency feasibility, and Android verification matrix are documented.

#### 0.1 Scope and decision baseline

- Keep this specification as the product baseline.
- Keep approved decisions separate from deferred implementation details.
- Keep the POS WhatsApp Conversation Inbox, offline billing, advanced Reports, custom shortcuts, and iPhone support out of the first release.

#### 0.2 Shared API contract audit

- Verify Store Device authentication and Device Session restore.
- Verify Product, Category, Combo, Add-on, Customer, Draft Sale, Sale, Payment, Bills, Report, Table, KOT, and WhatsApp invoice operations.
- Verify the authoritative checkout path and request-id behavior.
- Record any actual contract gap before application work begins.

#### 0.3 Native dependency feasibility

- Validate MMKV-only encrypted session storage and Android Keystore-backed key handling.
- Validate `i18next` and `react-i18next` with the current Expo/React Native setup.
- Validate the camera barcode-scanning approach on Android 8+.
- Keep printer hardware validation separate and deferred until the printer slice.

#### 0.4 Android verification matrix

- Select one Android emulator.
- Select one modern physical Android phone.
- Select one representative low- or mid-range Store Device.
- Record minimum Android version, available camera behavior, performance expectations, and later printer test targets.

### Phase 1 — POS foundation

Goal: establish the Android POS application boundary, secure session lifecycle, visual foundation, and authenticated navigation shell.

Phase exit: a valid Store Device can unlock the app, restore a valid session, select a language, and reach New Sale with Cart access.

#### 1.1 Mobile POS application boundary

- Define the POS app entry and boot boundary inside the existing mobile application.
- Remove the generic user Dashboard from the POS flow without changing unrelated mobile products.
- Establish the POS-specific navigation and session ownership boundary.

#### 1.2 MMKV storage boundary

- Define separate MMKV keys or instances for session data, preferences, and convenience data.
- Validate encrypted storage for the authentication token and Device Session.
- Validate Android Keystore-backed encryption-key handling.
- Define logout and session-expiry cleanup behavior.

#### 1.3 Localization foundation

- Configure `i18next` and `react-i18next`.
- Bundle English, Gujarati, and Hindi resources.
- Define typed translation keys and feature namespaces.
- Add English fallback and MMKV language persistence.

#### 1.4 Uniwind design foundation

- Define semantic Light/Dark tokens.
- Create the approved base components and variants.
- Apply approved spacing, radius, typography, and touch-size rules.
- Validate English, Gujarati, and Hindi text layout.

#### 1.5 POS session state

- Implement the planned Starting, Locked, Unlocking, Active, Session Expired/Revoked, and Logging Out states.
- Load and verify the Device Session before showing POS data.
- Handle retryable boot network failure without silently logging out.

#### 1.6 POS Unlock screen

- Add Organization username, Device username, and Device secret.
- Add language selection and Unlock POS action.
- Add validation, loading, invalid-credential, and network-failure states.
- Remember only non-secret identifiers.

#### 1.7 POS navigation shell

- Add New Sale, Bills, Customers, Reports, and Settings destinations.
- Keep Cart reachable from the billing flow.
- Gate restaurant destinations by Store capabilities.
- Add Logout and invalid-session routing.

#### 1.8 New Sale shell

- Open New Sale after successful Unlock.
- Add the initial Product search area and Cart entry point.
- Keep the screen ready for the Catalog slices without implementing the full Catalog yet.

### Phase 2 — Catalog and Product selection

Goal: make the Catalog usable from a phone and make Product selection fast.

Phase exit: a user can search, browse categories, scan a barcode, configure supported Products, and add them to Cart.

#### 2.1 Catalog query and cache

- Load Products and Categories through shared services.
- Scope cached data to the active Store/Device Session.
- Define loading, empty, error, and retry states.

#### 2.2 Product search and Categories

- Add Product search.
- Add Category browsing.
- Add direct Product-to-Cart action.
- Preserve search fallback when other selection methods are unavailable.

#### 2.3 Camera barcode scanning

- Add Android phone-camera scanning.
- Add success, cancel, permission, unknown barcode, and scan-error states.
- Repeated matching scans increase quantity.
- Keep manual search available at all times.

#### 2.4 Recent and Pinned Products

- Show Recent Products when search is empty.
- Support optional Pinned Products and a Pinned filter.
- Keep this local convenience data separate from the server Catalog.

#### 2.5 Combos and Add-ons

- Detect Products that require configuration.
- Show only the relevant combo or add-on choices.
- Preserve configuration in Cart Review and Draft Sale payloads.
- Keep ordinary Products as one-tap additions.

### Phase 3 — Cart and Draft Sale

Goal: make the Cart reliable and allow safe Draft Sale recovery without slowing down normal billing.

Phase exit: a user can review and modify a Cart, choose optional Customer/discount details, save a Draft Sale, resume it, and discard it safely.

#### 3.1 Local Cart state

- Add, remove, and change Product quantities locally.
- Calculate immediate display totals without replacing server authority.
- Preserve Cart state across the billing screens.

#### 3.2 Cart Review screen

- Show line items, quantities, prices, configurations, subtotal, and total.
- Add Continue to Payment as the primary action.
- Add secondary Customer, discount, and Draft Sale actions.

#### 3.3 Customer picker and Walk-in

- Default to Walk-in.
- Search by Customer name or phone.
- Select, change, or remove a Customer without blocking Payment.

#### 3.4 Quick Customer creation

- Create a minimal Customer with name and phone.
- Return the new Customer to the current Cart.
- Preserve the Cart if creation fails.

#### 3.5 Discounts

- Support amount and percentage discounts.
- Provide optional quick presets.
- Validate maximums and show the updated total.
- Allow editing or removal before Payment.

#### 3.6 Server Draft Sale persistence

- Create/update a server Draft Sale at the approved hybrid persistence boundaries.
- Resume and delete Draft Sales from Bills.
- Preserve local Cart during loading, retry, and recoverable network failure.
- Prevent duplicate Draft Sale creation.

### Phase 4 — Payment and Sale completion

Goal: convert a reviewed Cart into one confirmed Sale with clear settlement and receipt access.

Phase exit: a user can complete a normal, Partial, Due, or multiple-Payment Sale without duplicate submission and reach Sale Complete.

#### 4.1 Payment entry

- Support Cash, UPI, and Card.
- Default to one Payment row.
- Add optional additional Payment rows.
- Validate amounts and show collected/remaining values.

#### 4.2 Payment status

- Derive the expected Paid, Partial, or Due display.
- Treat the server response as authoritative.
- Handle zero, partial, full, invalid, and overpayment states.

#### 4.3 Checkout adapter

- Use direct complete Sale for a new unsaved Sale.
- Use commit for an existing Draft Sale.
- Use Payment collection for later Due/Partial settlement.
- Use separate Table checkout for restaurant Table orders.
- Use request identifiers and controlled retry behavior.

#### 4.4 Sale Complete screen

- Show confirmed Sale number, total, Payment status, Customer, Table, and service mode where relevant.
- Make New Sale the primary action.
- Keep receipt actions secondary and retryable.

#### 4.5 Digital receipts and sharing

- Show receipt data from the confirmed Sale response.
- Support Android sharing.
- Ensure receipt action failures never change the Sale.

### Phase 5 — Bills and supporting workspaces

Goal: provide the operational screens needed after core billing is dependable.

Phase exit: a user can find and inspect Sales, recover Draft Sales, manage Customers, view simple Reports, and adjust approved Settings.

#### 5.1 Bills list and filters

- Default to today's Sales.
- Add Sale/Customer search and simple date, Payment status, and Payment method filters.
- Show Sale cards with totals and settlement status.

#### 5.2 Sale Details and Draft recovery

- Show full Sale details and receipt access.
- Resume/delete Draft Sales.
- Add reprint, share, and configured WhatsApp actions.

#### 5.3 Customer Directory

- Add Customer list, search, filters, sorting, details, add, edit, and Sales history.
- Keep it separate from the fast billing path.

#### 5.4 Reports

- Add Today default, simple date filter, Sales summary, and Products Sold.
- Keep Reports read-only and avoid complex charts.

#### 5.5 Settings and Appearance

- Add language, theme, display size, printer entry point, Store/Device information, and Logout.
- Keep advanced customization deferred.

### Phase 6 — Bluetooth printing

Goal: add reliable English-only thermal invoice printing on the selected Android hardware.

Phase exit: a user can connect and test a supported printer, print from Sale Complete or Sale Details, and retry a failed print without affecting the Sale.

#### 6.1 Hardware validation

- Choose the target Android printer model during implementation.
- Validate Bluetooth connection, paper width, ESC/POS support, and English receipt output.
- Validate on a physical Android device, not only an emulator.

#### 6.2 Printer adapter

- Define the application-level printer interface.
- Implement discovery, selection, connection, test, reconnect, disconnect, and failure states.
- Keep Bluetooth transport separate from receipt content generation.

#### 6.3 Print actions

- Add printing from Sale Complete and Sale Details.
- Make English-only invoice printing retryable.
- Ensure printer failure never blocks or reverses a completed Sale.

### Phase 7 — Restaurant operations

Goal: extend the shared billing flow for restaurant Stores without exposing restaurant complexity to retail Stores.

Phase exit: an enabled restaurant Store can use service modes and Tables, and the later KOT workflow has its own operational completion path.

#### 7.1 Service modes

- Add Dine-In and Pick-Up for applicable restaurant Stores.
- Infer Dine-In from a selected Table.
- Hide service modes for retail Stores.

#### 7.2 Tables

- Add area grouping, states, current totals, start order, and reopen order.
- Return to Tables after the relevant completed Table Sale.

#### 7.3 Table orders

- Connect Table context to the shared New Sale and Cart flow.
- Prevent duplicate active orders.
- Preserve Table and service-mode data through completion.

#### 7.4 KOT and kitchen completion

- Add multiple KOT batches for enabled restaurant Stores.
- Add pending kitchen list and completion.
- Keep KOT separate from Sale and Payment completion.

### Phase 8 — Hardening and release readiness

Goal: prove that the approved Android POS is safe, understandable, recoverable, and releasable.

Phase exit: focused tests, real-device workflows, security/recovery review, and release checks all pass.

#### 8.1 Focused tests

- Complete logic, component, service-contract, and localization tests.
- Verify every approved screen's loading, empty, error, and retry states.

#### 8.2 Real-device workflow

- Run the complete retail flow on the Android device matrix.
- Run camera scanning and performance checks.
- Run restaurant capability-gating checks where applicable.

#### 8.3 Security and recovery review

- Review MMKV encryption and Android Keystore key handling.
- Review token/session cleanup and Store-scoped cache isolation.
- Verify duplicate-submit and uncertain-network behavior.

#### 8.4 Release checklist

- Confirm Android 8+ support.
- Confirm English/Gujarati/Hindi interface coverage.
- Confirm English-only invoice behavior.
- Confirm printer validation results.
- Confirm excluded features remain out of the mobile app.

## Recommended first implementation ticket

**POS Device Unlock + Session Bootstrap + New Sale Shell**

Acceptance conditions:

- The app opens into POS Device Unlock rather than the generic mobile Dashboard.
- The user can authenticate with Organization username, Device username, and Device secret using the existing service contract.
- The session is stored securely and restored when valid.
- Logout, expiry, and invalid sessions return to Unlock.
- The user can select English, Gujarati, or Hindi.
- An authenticated user reaches a mobile POS shell with New Sale and Cart entry points.
- No backend contract changes are made unless the service review proves a required gap.

## Verification gates

Every phase should pass its focused tests and a real-device smoke check before the next phase starts. The final release gate must cover:

- Authorized Device Unlock and session recovery.
- Retail Sale from Product selection through Payment and receipt.
- Customer, discount, Partial, and Due behavior.
- Draft Sale recovery after a recoverable network failure.
- Duplicate-submit protection.
- English, Gujarati, and Hindi interface coverage.
- English Bluetooth printing success, retry, reconnect, and printer failure without Sale rollback.
- Restaurant feature visibility for Stores with and without Tables/KOT enabled.

## Comments

- Product direction agreed: support both general retail and restaurant Stores in one mobile POS app.
- Tables and KOT follow the shared counter-billing workflow in the release sequence.
- Version 1 is online-first; offline billing and synchronization are deferred.
- Simple UX is a Version 1 product requirement.
- Version 1 supports English, Gujarati, and Hindi.
- Bluetooth thermal-printer invoice printing is a Version 1 mobile requirement; the printed receipt template is English-only. Gujarati and Hindi remain mobile interface languages and are not required on thermal output.
- POS Unlock step approved: use Store Device access, remember non-secret identifiers, open New Sale after successful unlock, and keep the session active until logout or expiry.
- New Sale step approved: use product search, barcode scanning, categories, direct product-to-cart actions, optional product customization, and a persistent cart summary.
- Cart Review step approved: show selected items with quantity controls, keep Customer, Walk-in, discount, and Draft Sale actions secondary, and use Continue to Payment as the primary action.
- Payment step approved: support Cash, UPI, and Card; derive Paid, Partial, or Due from the amount; keep multiple payments secondary; prevent duplicate Sale creation; and show clear save errors.
- Sale Complete step approved: show Sale confirmation, number, total, and Payment status; make New Sale primary; and keep receipt actions retryable and secondary.
- Core billing UX approved: POS Unlock, New Sale, Cart Review, Payment, and Sale Complete.
- English-only Bluetooth invoice printing approved; printer layout and encoding validation remains required.
- Version 1 feature-priority groups approved: Must have, Should have, May have, and later restaurant requirements.
- Bills behavior approved: default to today's Sales, support simple search and hidden filters, show Sale status, open Sale Details, recover Draft Sales, and provide receipt actions.
- Customer Selection approved: default to Walk-in, support optional name or phone search, minimal Customer creation, changing or removing the selected Customer, and no forced Customer selection before Payment.
- Discounts approved: keep discount entry optional, support amount or percentage with quick presets, show the updated total, validate the maximum, and allow editing or removal before Payment.
- Barcode, combo, and add-on behavior approved: scan or tap to add ordinary Products directly, configure only Products that need options, increase quantity for repeated scans, and keep search available when scanning is unavailable.
- WhatsApp Invoice Delivery approved: show it only when configured and a valid Customer phone is available, never block Sale completion, and expose sending, sent, failed, and retry states.
- POS Reports approved: keep Reports read-only, default to Today, show key sales totals and Products Sold, and provide simple date filters without complex charts.
- Full Customer Directory approved: keep it separate from the billing path, support progressive search by name or phone, simple filters and sorting, Customer details, add/edit actions, and optional use for the current Sale.
- Printer Setup and Connection approved: discover, select, connect, test, remember, change, and disconnect a Bluetooth thermal printer without blocking Sale creation or digital receipts.
- Multiple Payment Methods approved: keep one payment as the default, make additional payment rows optional, show total collected and remaining due, and allow editing or removal without complicating normal billing.
- Recently Used and Pinned Products approved: show Recent Products when search is empty, allow optional pinned Products, provide a Pinned filter, and keep Search and Barcode Scan as the primary tools.
- POS WhatsApp Inbox excluded from the mobile POS app; WhatsApp invoice delivery remains included as a focused receipt action.
- Standard receipt template approved for Version 1; advanced receipt customization is deferred.
- Appearance approved: provide language selection, Light/Dark theme, display size, and separate printer settings without complex personalization controls.
- Advanced Reports deferred from the mobile app; the approved simple Reports remain available.
- Tables and Table Orders approved for restaurant Stores: show only when enabled, group tables by area, show clear table states, support starting/opening orders, and return to Tables after completion.
- Dine-In and Pick-Up approved for restaurant Stores: infer Dine-In from a selected Table, show the choice for direct restaurant orders, hide it for retail Stores, and keep the service mode visible in Cart, Sale Details, and receipts.
- KOT and Kitchen Completion approved for enabled restaurant Stores: keep KOT separate from Sale and Payment, support multiple KOT batches, show pending kitchen orders, allow completion, and keep KOT hidden for retail Stores.
- Built-in cashier quick actions approved: keep New Sale, Barcode Scan, Cart, Recent/Pinned Products, contextual Tables/KOT, and post-Sale receipt actions easy to access; custom shortcut configuration is deferred.
- Feature coverage review approved; this document is the baseline for mobile implementation planning.
- Android-only first release approved; iPhone support is deferred for later consideration.
- Bluetooth printer model, paper width, and protocol selection are deferred to implementation-time hardware validation.
