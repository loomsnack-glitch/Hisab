# POS Mobile App — Phase 0 Planning and Technical Validation

Status: Completed with follow-ups; Draft commit retry fix implemented
Validated: 2026-09-02
Scope: Android-only Ganatri POS mobile app
Implementation status: Draft commit idempotency fix implemented; Phase 1.1 POS application boundary implemented

This document records the Phase 0 validation work for the POS mobile app. It is the reference for the fixes, decisions, and validation gates that must be carried into later implementation phases.

## 1. Purpose and research questions

Phase 0 was a read-only repository and technical-feasibility audit. It answered these questions:

1. Which existing POS services, types, and backend operations can the mobile app reuse?
2. Are the approved MMKV, `i18next`, Uniwind, and Android camera choices compatible with the current mobile app?
3. Are there API behaviors that could cause duplicate Sales, lost Drafts, or unsafe retry behavior on a phone?
4. What Android environments must be used to validate the app before release?
5. Which items are confirmed, which are planned fixes, and which still require hardware or human confirmation?

The initial Phase 0 audit did not implement the mobile app, install dependencies, or choose a printer model. The approved follow-up from that audit is the scoped Draft commit idempotency fix recorded below.

## 2. Repository baseline

The repository already contains an Expo/React Native mobile app at [`apps/mobile`](../../apps/mobile). Its current baseline is:

| Area | Current finding | Planning impact |
| --- | --- | --- |
| App runtime | Expo SDK `~56.0.12`, React Native `0.85.3`, React `19.2.3` | The approved Android/native direction is compatible with the existing app baseline. |
| Navigation | React Navigation native stack is present | The current generic auth navigation must become a POS-specific session boundary. |
| Data fetching | TanStack Query is present | Reuse it for server Catalog, Customer, Draft, Sale, and supporting workspace queries. |
| Local state | Zustand is present | Use it for POS session, Cart, and local UI state where appropriate; do not make it the server source of truth. |
| Styling | Uniwind and Tailwind v4 are already configured | Extend the existing setup with semantic POS tokens and internal POS components. |
| Current authentication | `apps/mobile/src/hooks/use-auth-bootstrap.ts` restores a generic user token and calls `userAuthenticate` | Replace this flow for POS Device authentication in the POS boundary. |
| Current secure storage | `auth-storage.ts` and `device-storage.ts` use `expo-secure-store` | This is a known implementation mismatch with the approved MMKV-only decision and must be replaced during Phase 1. |
| Mobile tests | `apps/mobile/package.json` has no mobile test script or mobile test dependency | Add a focused mobile test harness before relying on mobile-level verification. |
| Android commands | Native Android run, device, emulator, reverse-proxy, and Expo prebuild scripts already exist | Native dependency work should use a development build/prebuild workflow, not Expo Go assumptions. |

### Confirmed reference files

- [`apps/mobile/package.json`](../../apps/mobile/package.json)
- [`apps/mobile/app.json`](../../apps/mobile/app.json)
- [`apps/mobile/App.tsx`](../../apps/mobile/App.tsx)
- [`apps/mobile/src/navigation/root-navigator.tsx`](../../apps/mobile/src/navigation/root-navigator.tsx)
- [`apps/mobile/src/hooks/use-auth-bootstrap.ts`](../../apps/mobile/src/hooks/use-auth-bootstrap.ts)
- [`apps/mobile/src/lib/auth-storage.ts`](../../apps/mobile/src/lib/auth-storage.ts)
- [`apps/mobile/src/lib/device-storage.ts`](../../apps/mobile/src/lib/device-storage.ts)
- [`apps/mobile/global.css`](../../apps/mobile/global.css)

## 3. Shared API contract audit

### 3.1 Reusable API coverage

The shared service layer already exposes the main operations required by the approved mobile scope. The mobile app should call these service functions through a mobile-facing query/mutation boundary rather than making direct HTTP requests from screens.

| Mobile capability | Existing shared operations | Phase 0 result |
| --- | --- | --- |
| Store Device access | `deviceAuthenticate`, `deviceLogin`, `deviceLogout` | Reusable; the mobile session flow still needs to be built around these operations. |
| Catalog | `getPosCategories`, `getPosProducts`, `getPosSettings`, `getPosAddOns`, `getPosProductAddOnAttachments`, `getPosComboProduct`, `getPosComboProducts` | Reusable for Product selection, Add-ons, Combos, and Store-scoped settings. |
| Customers | `getPosCustomers`, `createPosCustomer`, `updatePosCustomer` | Reusable for Walk-in, Customer search, quick creation, and edit flows. |
| Draft Sales | `createPosDraftSale`, `getPosSale`, `updatePosDraftSale`, `deletePosDraftSale` | Reusable for the approved hybrid local Cart/server Draft model. |
| Sales and Bills | `getPosSales`, `getPosProductSalesSummary`, `getPosSale` | Reusable for Bills, Sale Details, and the approved read-only Reports. |
| Checkout | `completePosSale`, `commitPosSale`, `replacePosSale` | Reusable, but retry semantics must be handled differently for direct completion and Draft commit. |
| Later Payments | `collectPosPayment` | Reusable for due/partial settlement after the initial Sale. |
| Restaurant | Table allocation/order/KOT operations and `checkoutPosTableOrder` | Available for the later capability-gated restaurant phase. |
| Focused WhatsApp invoice | status, queue, and retry operations | Remains optional and configuration-dependent; Conversation Inbox remains excluded. |

Primary references:

- [`packages/services/src/modules/access-control/device-auth.service.ts`](../../packages/services/src/modules/access-control/device-auth.service.ts)
- [`packages/services/src/modules/pos/pos.service.ts`](../../packages/services/src/modules/pos/pos.service.ts)
- [`packages/services/src/api.ts`](../../packages/services/src/api.ts)
- [`packages/types/src/modules/billing/billing.schema.ts`](../../packages/types/src/modules/billing/billing.schema.ts)
- [`apps/backend/src/modules/pos/pos.routes.ts`](../../apps/backend/src/modules/pos/pos.routes.ts)

### 3.2 Confirmed checkout retry behavior

The checkout operations are not equivalent and must not be hidden behind one unqualified mutation:

#### Direct new Sale

- `CompleteSaleSchema` requires a UUID `requestId`.
- The backend stores it as `completion_request_id`.
- The backend looks up an existing Sale by organization, Store, and completion request ID before creating a new Sale.
- A unique-violation recovery path also returns the already-created Sale.
- This is the correct server pattern for retrying a direct checkout after an unknown network result.

#### Existing Draft Sale commit

- `CommitSaleSchema` now requires a UUID completion `requestId`.
- `commitSaleInStore` persists that request ID on the completed Sale using the existing `completion_request_id` column and unique index.
- A second request with the same request ID and Sale ID replays the confirmed Sale, including the race where the first request commits while the second request is waiting for the Draft lock.
- Reusing a request ID for a different Sale returns a conflict and leaves the second Draft unchanged.
- KOT generation has its own request identifier, but that does not make the entire Sale commit idempotent.

The mobile and existing web/Admin callers now pass the same stable checkout request ID used by their mutation retry boundary. A network retry can therefore replay the confirmed Sale without creating duplicate payments, KOT writes, table transitions, or Sale numbers.

### 3.3 Required API hardening item

The selected option was option 1: add a completion request ID/idempotency key to the Draft commit contract and persist/replay the result safely. The implementation is covered by focused billing tests for same-request replay and request-key reuse across different Sales. Real database/concurrent-request verification remains part of the backend release checks.

No new endpoint is required by the Phase 0 audit. The existing API surface is broad enough for the approved scope, subject to the checkout retry decision above.

## 4. Native dependency feasibility

### 4.1 MMKV storage

Confirmed:

- The current mobile app uses React Native `0.85.3`.
- The official `react-native-mmkv` V4 documentation lists React Native `0.76+` as the minimum, so the current React Native version satisfies that version requirement.
- MMKV is a native synchronous JSI/Nitro-backed dependency. It requires native installation and a development build/prebuild workflow.
- MMKV supports encrypted storage with an application-supplied encryption key.

Required Phase 1 work:

- Replace both current SecureStore adapters with a single documented MMKV storage boundary.
- Keep the approved MMKV-only rule: no `expo-secure-store` fallback.
- Store the auth token and Device Session in an encrypted MMKV instance or equivalent encrypted namespace.
- Define how the encryption key is generated, protected with Android Keystore, restored, rotated, and invalidated on logout/device reset.
- Keep preferences and convenience data separate from credentials, with Store/Device scoping where needed.
- Verify behavior in a native Android development build; Expo Go compatibility is not a Phase 1 requirement.
- Remove the unused SecureStore dependency only as part of the authorized implementation slice, not during this planning pass.

Unresolved implementation detail: the exact Android Keystore-backed key bridge/strategy must be selected and tested when the storage slice is implemented. The Phase 0 conclusion is feasibility, not security verification.

Official reference: [react-native-mmkv](https://github.com/margelo/react-native-mmkv), checked 2026-09-02.

### 4.2 Localization

Confirmed:

- `i18next` and `react-i18next` support React and React Native usage, language switching, interpolation, pluralization, fallback language, and namespaces.
- The repository currently has no `i18next` or `react-i18next` dependency in the mobile package.
- The approved approach is bundled English, Gujarati, and Hindi resources with English fallback and MMKV language persistence.

Required Phase 1 work:

- Add the two localization dependencies and a mobile-owned initialization boundary.
- Define namespaces by feature rather than one unstructured translation file.
- Keep business data such as Product names, Customer names, and notes unchanged; only app-owned labels and messages are translated.
- Add missing-key and fallback tests.
- Verify Gujarati and Hindi layout on a small Android screen, including buttons, empty states, validation messages, and the Payment screen.

Official references: [react-i18next](https://react.i18next.com/) and [quick start](https://react.i18next.com/guides/quick-start), checked 2026-09-02.

### 4.3 Uniwind and design tokens

Confirmed:

- Uniwind is already configured through `metro.config.js`, `global.css`, and generated Uniwind type artifacts.
- The current CSS already contains primary, neutral, and brand colors and existing shared mobile components use Uniwind classes.
- Uniwind supports semantic theme tokens and light/dark themes through CSS configuration.

Required Phase 1 work:

- Convert the current colors into the approved semantic POS token vocabulary.
- Define light and dark values without making screen components depend on raw color literals.
- Add POS-specific primitives for buttons, inputs, Product tiles, Cart rows, status badges, bottom actions, dialogs, and loading/error states.
- Validate touch sizes and Gujarati/Hindi text wrapping before screen-by-screen implementation.

Official references: [Uniwind documentation](https://docs.uniwind.dev/) and [global CSS theming](https://docs.uniwind.dev/theming/global-css), checked 2026-09-02.

### 4.4 Android camera barcode scanning

Confirmed:

- The approved V1 approach is phone-camera barcode scanning with manual Product search always available as fallback.
- No camera/barcode dependency is currently present in `apps/mobile/package.json`.
- Camera scanning is therefore feasible as a planned native dependency, but it was not validated on a physical Android device during Phase 0.

Required Phase 2 work:

- Select a maintained Expo-compatible camera/barcode package for the current SDK/RN baseline.
- Validate Android permission flow, app resume behavior, scan throttling, unknown barcode handling, and repeated-scan quantity behavior.
- Test at least one low/mid-range Android device because camera startup and scanning latency affect POS usability.
- Keep manual search available when permission is denied, the camera is unavailable, or a barcode is not found.

## 5. Android verification matrix

The product minimum is Android 8/API 26+, even though the Expo SDK 56 reference supports a broader Android range. The product minimum is therefore a deliberate app requirement and must be tested directly.

| Environment | Required purpose | Selection status |
| --- | --- | --- |
| Android emulator, API 26 or nearest supported image | Minimum-version layout, navigation, network error, localization, and basic billing checks | To select during implementation setup |
| Modern physical Android phone | Current Android behavior, camera, keyboard, performance, and accessibility smoke | To select |
| Representative low/mid-range Store Device | Real counter conditions, small screen, memory/performance, camera, and long-session behavior | To select with the Store/device owner |
| Target Bluetooth printer and Android phone pairing | Discovery, reconnect, English-only print, paper width, and printer failure recovery | Deferred to Phase 6; model not selected |

Minimum checks for every selected Android device:

- POS Unlock, session restore, session expiry, and logout cleanup.
- English, Gujarati, and Hindi interface rendering.
- Product search, Cart, Payment, Sale completion, and Bills recovery.
- App background/foreground transitions during network requests.
- Unknown-result checkout retry without duplicate Sale creation.
- Camera permission and manual-search fallback where camera scanning is enabled.
- Android back behavior and keyboard handling.
- No secret token or Device credential displayed in logs or UI.

Phase 0 cannot complete the physical-device selection because the actual Store Device and printer model have not been provided. This is a named follow-up, not a blocker for continuing documentation.

## 6. Required fixes and follow-ups

These are the items Phase 0 found or confirmed. The Draft commit item was implemented as the scoped follow-up; the remaining rows are planning references.

| Priority | Item | Owner area | Target phase | Status |
| --- | --- | --- | --- | --- |
| Must | Replace generic user-auth bootstrap/navigation with the approved POS Device Session boundary | Mobile | Phase 1 | Planned |
| Must | Replace `expo-secure-store` adapters with encrypted MMKV and a validated Android Keystore-backed key strategy | Mobile/native | Phase 1 | Planned |
| Must | Add `i18next` + `react-i18next`, bundled language resources, fallback, and persistence | Mobile | Phase 1 | Planned |
| Must | Add mobile test script/harness and service-contract tests before core billing screens | Mobile/testing | Phase 1 | Planned |
| Must | Resolve Draft commit retry semantics with a server idempotency key and replay behavior | Backend/API | Completed before Phase 4 | Implemented and focused-tested |
| Must | Select and validate the Android camera/barcode dependency and permission behavior | Mobile/native | Phase 2 | Planned |
| Should | Add Store/Device scoping rules for Catalog, Draft, Cart convenience, and cached data | Mobile/services | Phases 1–3 | Planned |
| Should | Add explicit unknown-result states for checkout and receipt actions | Mobile/API | Phase 4 | Planned |
| Should | Select real Android test devices and record them in the release checklist | Product/release | Phase 0/8 | Pending input |
| Later | Select a Bluetooth printer model, paper width, and protocol | Product/hardware | Phase 6 | Deferred |

## 7. Confirmed decisions carried forward

- Android-only first release; minimum Android 8/API 26+.
- One POS app serves both retail and restaurant Stores.
- Store Device authorization controls access; the app does not invent owner/cashier role assumptions.
- English, Gujarati, and Hindi are interface languages.
- Printed Bluetooth invoices are English-only.
- Online-first billing; offline synchronization is deferred.
- MMKV-only local persistence is approved; SecureStore is not an alternative.
- `i18next` and `react-i18next` are the localization foundation.
- Uniwind semantic tokens and internal POS components are the UI foundation.
- Existing shared services and types are the first API boundary.
- Camera barcode scanning is V1; external Bluetooth scanners are deferred.
- The WhatsApp Conversation Inbox is excluded; focused invoice delivery remains optional.
- Printer hardware validation stays in Phase 6, after the core Sale flow is stable.

## 8. Phase 0 exit assessment

| Subphase | Result | Evidence / remaining work |
| --- | --- | --- |
| 0.1 Scope and decision baseline | Completed | Existing [`spec.md`](./spec.md) records the approved product scope and exclusions. |
| 0.2 Shared API contract audit | Completed with hardening implemented | Existing service coverage is sufficient; Draft commit now persists and replays a completion request ID. |
| 0.3 Native dependency feasibility | Completed with implementation validation required | MMKV, i18next, Uniwind, and camera approach are compatible/plannable; native build, encryption, and camera hardware still require implementation tests. |
| 0.4 Android verification matrix | Partially complete | Test categories are defined; exact physical Android and printer devices remain to be selected. |

Phase 0 is sufficient to begin Phase 1 planning or implementation review. The Draft commit retry fix is complete; Phase 1 must still validate the MMKV migration, POS session boundary, localization setup, and mobile test harness. Backend integration and real-database race verification remain release gates.

## 9. External references

The following official documentation was checked on 2026-09-02:

- [Expo SDK 56 reference](https://docs.expo.dev/versions/v56.0.0/)
- [react-native-mmkv](https://github.com/margelo/react-native-mmkv)
- [react-i18next](https://react.i18next.com/)
- [react-i18next quick start](https://react.i18next.com/guides/quick-start)
- [Uniwind](https://docs.uniwind.dev/)
- [Uniwind global CSS theming](https://docs.uniwind.dev/theming/global-css)
