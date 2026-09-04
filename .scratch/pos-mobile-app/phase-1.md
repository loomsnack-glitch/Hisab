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
| 1.2 | MMKV storage boundary | 1.1 | Separate storage areas and encrypted session adapter tested | `Pending commit` |
| 1.3 | Localization foundation | 1.2 | Three bundled languages, English fallback, persisted selection | Pending |
| 1.4 | Uniwind design foundation | 1.3 | Semantic tokens and reusable POS primitives | Pending |
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

## Phase-level closeout checklist

- [ ] 1.1–1.8 each have a focused commit and evidence.
- [ ] Phase 1 exit flow reaches New Sale with Cart access.
- [ ] Android native development-build gate is run or explicitly recorded as
      pending external/device validation.
- [ ] English, Gujarati, and Hindi layout checks are recorded.
- [ ] No SecureStore fallback or unrelated feature work remains.
- [ ] Final standards/spec review completed.
- [ ] `status.md` marks Phase 1 accurately, including follow-ups.
