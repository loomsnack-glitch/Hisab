# POS Mobile App — Phase 1 Execution Plan and Review Log

Status: In progress — 1.2 completed with native-device follow-up
Phase: 1 — POS foundation
Scope: Android-only Ganatri POS mobile application
Started: 2026-09-04

This document is the execution record for Phase 1. It follows the approved
phase-loop lifecycle: plan, internal review, implement, verify, review/fix,
status update, and focused commit for every subphase.

## Phase outcome

Establish the POS application boundary, encrypted MMKV persistence,
English/Gujarati/Hindi localization, Uniwind visual foundation, POS Device
Session lifecycle, unlock flow, capability-aware navigation, and the first New
Sale shell.

The Phase 1 exit condition is: a valid Store Device can unlock the app, restore
a valid session, select a language, and reach New Sale with Cart access.

## Scope guardrails

Included in this phase:

- POS-specific Android app boot and navigation boundaries.
- MMKV-only local persistence, with encrypted credential/session storage.
- Android Keystore-backed protection of the MMKV encryption key.
- Bundled English, Gujarati, and Hindi interface resources.
- Uniwind semantic design tokens and small internal POS primitives.
- Device Session states, unlock, expiry/revocation, logout, and recovery.
- Shared POS navigation destinations and the New Sale shell.

Not included in this phase:

- Full Product Catalog, search, category browsing, barcode scanning, Combos,
  or Add-ons (Phase 2).
- Cart calculations, Draft Sale persistence, Customers, discounts, Payment,
  receipt sharing, or Sale completion (Phases 3–4).
- Bluetooth printer integration (Phase 6); printed invoices remain
  English-only.
- Offline billing or synchronization.
- iOS implementation.
- New backend endpoints unless an existing contract is proven insufficient.

## Approved phase map

| Subphase | Outcome | Depends on | Exit evidence | Commit |
| --- | --- | --- | --- | --- |
| 1.1 | POS app boundary | Phase 0 | Authenticated flow enters POS-owned navigator | `81a754c` |
| 1.2 | MMKV storage boundary | 1.1 | Separate storage areas and encrypted session adapter tested | `7a040cd` |
| 1.3 | Localization foundation | 1.2 | Three bundled languages, English fallback, persisted selection | `2cb9d87` |
| 1.4 | Uniwind design foundation | 1.3 | Semantic tokens and reusable POS primitives | `Pending commit` |
| 1.5 | POS session state | 1.2, 1.3 | Device Session lifecycle states and recovery covered | Pending |
| 1.6 | POS Unlock screen | 1.5, 1.4 | Valid Device credentials unlock; validation/recovery are clear | Pending |
| 1.7 | POS navigation shell | 1.5, 1.6 | Shared and capability-gated destinations are reachable | Pending |
| 1.8 | New Sale shell | 1.7, 1.4 | Unlock opens New Sale with Cart entry | Pending |

## Cross-phase verification baseline

The existing mobile TypeScript check has one known baseline error unrelated to
Phase 1 work: `apps/mobile/src/screens/login-screen.tsx` imports the existing
`@repo/assets/services/whatsapp.webp` path, while the asset currently lives at
`packages/assets/src/services/whatsapp.webp`. Each subphase must report that
baseline separately and must not add new errors.

The mobile package has no native Android directory yet. Native dependency
checks must therefore distinguish static TypeScript/configuration validation
from a later Expo prebuild and physical Android development-build check.

## 1.2 — MMKV storage boundary

### Plan

User-facing outcome: the POS app has one mobile-owned persistence boundary. The
shared services continue to receive their existing async token/device adapters,
but those adapters are backed by MMKV and no longer by Expo SecureStore.

Implementation scope:

- Add `react-native-mmkv` and its Nitro module dependency to `apps/mobile`.
- Add the smallest native key-protection dependency needed to keep the MMKV
  encryption key in Android Keystore. This dependency protects only the MMKV
  key; POS values remain in MMKV. It is not a second app-data persistence
  system and is not a SecureStore fallback.
- Create a mobile storage module with explicit session, preference, and
  convenience instances/namespaces.
- Keep the authentication token and Device Session in an encrypted session
  boundary. Keep language/theme/display preferences separate. Keep future
  recent/pinned Catalog convenience data separate and Store/Device scoped.
- Preserve the existing `configureAuthTokenStorage` and
  `configureDeviceIdProvider` public seam by adapting synchronous MMKV calls
  to the shared async interfaces.
- Define deterministic key creation, retrieval, and invalidation behavior. Do
  not hard-code an encryption key or commit secrets.
- Remove `expo-secure-store` from the mobile package and lockfile references.

Acceptance criteria:

1. Auth token reads, writes, and removal use encrypted MMKV storage.
2. Device ID is generated once, survives app restarts, and is isolated from
   preferences and convenience data.
3. Session, preference, and convenience storage cannot accidentally clear one
   another through their public helpers.
4. Logout/session cleanup removes credential/session data while preserving
   non-sensitive language preference unless the session reset explicitly asks
   for a full device reset.
5. Unit tests cover the storage boundary without requiring a live Android
   device; native encryption/key behavior is recorded as a development-build
   gate.
6. No `expo-secure-store` import, dependency, or fallback remains in the POS
   mobile app.

Non-goals:

- Migrating Cart, React Query, or future Catalog caches in this slice.
- Adding a generic persistence abstraction to shared packages.
- Implementing the Device Session state machine or unlock UI yet.
- Claiming Android Keystore behavior verified before a native build runs.

Public seams and effects:

- `configureAuthTokenStorage` remains the token seam consumed by shared API
  code.
- `configureDeviceIdProvider` remains the stable device identity seam.
- New mobile-owned storage helpers are internal to `apps/mobile` and expose
  typed operations rather than raw storage instances to screens.
- The native build gains MMKV/Nitro and the key-protection module; Expo Go is
  not a supported validation target for this slice.

Test and verification plan:

- Focused pure adapter tests for token, device ID, namespace isolation, and
  cleanup behavior.
- Dependency/lockfile audit for SecureStore removal and MMKV presence.
- `bunx expo config --json` for app configuration.
- Mobile TypeScript check, with the known asset-import baseline separated.
- `git diff --check` and staged-scope review.
- Native Android development-build validation remains an explicit follow-up
  if the current environment cannot build/run the generated native project.

Risks and rollback:

- MMKV V4 is a native JSI/Nitro module, so a JS-only Expo run cannot prove
  native storage behavior. Keep the adapter testable and record the native gate.
- Losing the MMKV encryption key makes the encrypted session unreadable. Key
  retrieval must fail closed and force unlock rather than silently creating a
  second key and corrupting the session boundary.
- The slice can be rolled back as one focused commit before localization and
  session work depend on it.

### Internal plan review

Reviewed against `spec.md`, `phase-0.md`, the repository domain guidance, and
the current mobile boundary on 2026-09-04.

- Scope matches approved Phase 1.2 and does not pull in Catalog or billing.
- MMKV-only is preserved; SecureStore is explicitly removed.
- Android Keystore is used only for protecting the MMKV encryption key, which
  preserves the approved local-persistence decision.
- Existing shared service seams are preserved instead of changing shared API
  contracts.
- Native validation is clearly separated from unit/static checks.
- No unresolved product decision was found. The exact package-level native
  implementation is an engineering detail within the approved security
  requirement and will be documented with its verification result.

### Implementation and review result

Completed on 2026-09-05.

- Added `react-native-mmkv` V4 and `react-native-nitro-modules`.
- Added `react-native-keychain` only for Android Keystore-backed protection of
  the MMKV encryption key. App credentials and POS session values are stored
  through the encrypted MMKV session instance.
- Added separate session, preferences, and convenience MMKV instances.
- Added typed helpers for auth token, Device ID, Device Session JSON,
  preferences, convenience values, and credential cleanup.
- Preserved the shared `configureAuthTokenStorage` and
  `configureDeviceIdProvider` seams.
- Removed `expo-secure-store` from `apps/mobile` and `bun.lock`.
- Added four focused boundary tests covering async adaptation, one-time Device
  ID generation, storage isolation, and selective session cleanup.
- Correctly scoped Expo Android prebuild completed in `apps/mobile`; the
  generated native directory remains ignored as expected.

Standards/spec review findings and fixes:

- An initial prebuild was accidentally run from the repository root. The
  generated root `android/` and `app.json` artifacts and root package metadata
  were removed immediately; the root package is clean again.
- The mobile package had duplicate dependency entries after the first edit;
  they were removed and the lockfile was regenerated.
- No remaining SecureStore import, package, or lockfile entry exists.
- No new TypeScript errors were introduced. The existing WhatsApp asset import
  error remains the only mobile TypeScript failure.

Verification:

- `bun test apps/mobile/src/lib/storage-boundary.test.ts` — 4 passed.
- `git diff --check` — passed.
- Dependency audit — MMKV, Nitro Modules, and Keychain present; SecureStore
  absent.
- `expo prebuild --platform android --no-install` from `apps/mobile` — passed.
- Android Gradle/device build — intentionally not run per the user’s request;
  this is a required external validation follow-up.

1.2 status: Completed with follow-up. The native Android build and device test
must be run by the user before Phase 1 is release-ready, but this does not block
the remaining JS-boundary subphases.

## 1.3–1.8 execution notes

These subphases are approved in the existing spec and will receive their own
plan/review, implementation, verification, status update, and commit section
before each implementation begins. The order is intentional: localization and
visual primitives are established before session/unlock screens, and the
navigation/New Sale shell comes last so it can consume the final session and
design seams.

## 1.3 — Localization foundation

### Plan

User-facing outcome: every Phase 1 POS-owned label can be rendered in English,
Gujarati, or Hindi. The app starts in the last selected supported language,
falls back to English for missing resources, and keeps business data untouched.

Implementation scope:

- Add `i18next` and `react-i18next` to the mobile app.
- Create a mobile-owned initialization module with bundled `en`, `gu`, and
  `hi` resources.
- Use feature-oriented namespaces, starting with `common` and `pos` labels
  needed by the foundation screens.
- Persist only the selected language code through the MMKV preferences boundary
  from 1.2.
- Define a supported-language type and reject unsupported persisted values by
  falling back to English.
- Add typed translation-resource declarations and a React provider.
- Keep Product names, Customer names, notes, Store names, and other server
  business data exactly as supplied by the API.

Acceptance criteria:

1. English, Gujarati, and Hindi resources are bundled and selectable.
2. A missing/unsupported stored language resolves to English.
3. Changing language updates the i18next instance and persists the supported
   language code through MMKV preferences.
4. Translation keys are grouped by namespace and typed at the app boundary.
5. Foundation UI can consume `useTranslation` without manually selecting a
   locale in each screen.
6. Focused tests cover supported-language resolution and the English fallback.

Non-goals:

- Translating server-provided business data.
- Translating the full future Catalog, Cart, Payment, Reports, or printer
  surface in this slice.
- Adding remote translation downloads or a runtime locale service.
- Changing the approved English-only printed invoice template.

Public seams and effects:

- `i18n` is the single app localization instance initialized by the mobile
  entrypoint.
- `setAppLanguage` is the typed language-change seam used by Settings and the
  Unlock screen later in Phase 1.
- Language persistence uses `posStorage` preferences and never session data.

Test and verification plan:

- Focused pure localization-boundary tests for supported codes, invalid values,
  and fallback behavior.
- Static scan for all three resource bundles and the provider wiring.
- Mobile TypeScript check, reporting only the known WhatsApp asset baseline if
  it remains.
- `git diff --check`; no Android build command will be run.

Risks and rollback:

- Gujarati/Hindi strings can expand beyond English and expose layout defects;
  keep strings short in foundation UI and leave full layout validation to the
  real Android check.
- If a resource key is missing, i18next must show the English fallback rather
  than an empty foundation action.
- The slice can be reverted independently before the session and Unlock
  screens depend on its language seam.

### Internal plan review

Reviewed against the approved language decision, Phase 0 localization findings,
the MMKV preference API from 1.2, and the current Provider entrypoint on
2026-09-05.

- The plan adds only localization foundation behavior; no feature workflow is
  pulled forward.
- It uses the already-approved i18next/react-i18next choice.
- It keeps sensitive data out of the preferences instance and keeps business
  values out of translation resources.
- It has a testable pure seam and does not require an Android build.

## 1.4 — Uniwind design foundation

### Plan

User-facing outcome: POS screens use a consistent, touch-friendly visual
language with semantic light/dark tokens. Repeated controls have one internal
implementation so future billing screens remain simple and predictable.

Implementation scope:

- Extend `apps/mobile/global.css` with semantic POS surface, text, border,
  action, success, warning, and destructive tokens for light and dark themes.
- Keep component class names semantic; screen code must not introduce new raw
  color literals for POS-owned UI.
- Add small internal primitives: `PosButton`, `PosTextField`, `PosCard`, and
  `PosStatusBadge`.
- Support primary, secondary, and destructive button variants, disabled/loading
  behavior, error field state, and status tone variants.
- Apply minimum 48dp control height, readable text hierarchy, visible error
  state, and rounded surfaces to the existing POS shell controls.
- Keep component props technology-light enough for later screen composition and
  do not expose a large design-system dependency.

Acceptance criteria:

1. Light and dark semantic token sets exist for all foundation control states.
2. Reusable primitives cover button, text input, card, and status badge needs.
3. Buttons have a minimum 48dp target and expose loading/disabled behavior.
4. Text fields expose label, placeholder, required, and error states.
5. Existing POS shell controls consume the new primitives/tokens.
6. A pure token/variant test verifies the approved variant vocabulary.

Non-goals:

- Rebuilding every legacy auth component in this slice.
- Introducing icons, animations, charts, or a third-party component library.
- Adding theme settings persistence; that belongs to the later Settings slice.
- Implementing feature-specific Product, Cart, Payment, or printer components.

Public seams and effects:

- `apps/mobile/src/components/pos-ui.tsx` is the internal POS component seam.
- POS screens depend on semantic class names and variant props, not raw palette
  values.
- Existing `PrimaryButton` and `TextField` remain compatibility wrappers while
  their styles move to the POS vocabulary.

Test and verification plan:

- Pure test for semantic token names and supported component variants.
- Mobile TypeScript check and focused Bun tests only; no Android build command.
- Static review of raw color usage in the changed POS components.
- `git diff --check`.

Risks and rollback:

- Token changes can affect contrast; use strong foreground/background pairs and
  leave final device contrast/layout verification to the Android check.
- Uniwind class generation is native/runtime configuration, so this slice
  records static token validation and leaves visual device validation pending.
- The slice can be reverted before session screens adopt the primitives.

### Internal plan review

Reviewed against the approved Uniwind/internal-components decision, current
mobile CSS, existing component APIs, and the simple-UX rule on 2026-09-05.

- The component set is intentionally minimal and supports the current and
  immediately following Phase 1 screens.
- It does not change server behavior or pull later feature scope forward.
- Semantic light/dark classes preserve the approved design-token direction.
- Existing wrapper names are kept to reduce unrelated migration risk.

### Implementation and review result

Completed on 2026-09-05.

- Added semantic POS light/dark tokens for surfaces, text, borders, primary
  actions, success, warning, and destructive states.
- Added the small internal `PosButton`, `PosTextField`, `PosCard`, and
  `PosStatusBadge` primitives with typed variant vocabularies.
- Enforced a minimum 48dp button target and shared loading/disabled behavior.
- Migrated the existing mobile `PrimaryButton` and `TextField` compatibility
  wrappers to the POS primitives.
- Migrated the POS shell surface and text styles to semantic tokens.
- Added focused tests for the intentionally small button and status variant
  sets.

Standards/spec review findings and fixes:

- Initial status badge classes used raw palette names; they were replaced with
  semantic POS tokens and theme variants.
- Initial POS shell classes still used legacy stone/amber literals; they were
  migrated to semantic tokens.
- Initial test comparison passed a readonly tuple to Bun's mutable array type;
  the assertion now compares a copied array.
- No feature-specific Catalog, Cart, Payment, or printer UI was added.
- No Android build command was run, as requested by the user.

Verification:

- Focused mobile tests — 9 passed across storage, localization, and UI-boundary
  suites.
- Mobile TypeScript check — only the known WhatsApp asset import baseline
  remains.
- Raw palette scan of changed POS primitives/shell — no screen-level palette
  literals remain.
- `git diff --check` — passed.

1.4 status: Completed. Native theme and text-layout validation remains a
physical-device follow-up.

### Implementation and review result

Completed on 2026-09-05.

- Added `i18next` and `react-i18next` to the mobile package.
- Added typed bundled `common` and `pos` namespaces for English, Gujarati,
  and Hindi.
- Added supported-language resolution with English fallback for invalid or
  missing persisted values.
- Persisted language selection through the MMKV preferences boundary from 1.2.
- Wrapped the app with `I18nextProvider` and changed the POS shell labels and
  logout/recovery alerts to use translations.
- Added pure tests for the approved language list, resource bundle coverage,
  supported persisted values, and fallback behavior.

Standards/spec review findings and fixes:

- The first i18next configuration used the removed `initImmediate` option from
  older i18next versions; it was removed after the TypeScript check identified
  the mismatch.
- Server-provided business data remains outside translation resources.
- Printed invoice language behavior remains unchanged and English-only.
- No Android build command was run, as requested by the user.

Verification:

- `bun test apps/mobile/src/lib/localization-boundary.test.ts apps/mobile/src/lib/storage-boundary.test.ts` — 8 passed.
- Mobile TypeScript check — only the known WhatsApp asset import baseline
  remains.
- `git diff --check` — passed.

1.3 status: Completed. The real Android Gujarati/Hindi layout check remains a
device-validation follow-up.

## Phase-level closeout checklist

- [ ] 1.1–1.8 each have a focused commit and evidence.
- [ ] Phase 1 exit flow reaches New Sale with Cart access.
- [ ] Android native development-build gate is run or explicitly recorded as
      pending external/device validation.
- [ ] English, Gujarati, and Hindi layout checks are recorded.
- [ ] No SecureStore fallback or unrelated feature work remains.
- [ ] Final standards/spec review completed.
- [ ] `status.md` marks Phase 1 accurately, including follow-ups.
