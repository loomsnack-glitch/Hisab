# POS Mobile App — Planning Status

Status: Phase 0 completed with follow-ups

Last updated: 2026-09-05

This file is the single status tracker for the POS mobile app effort. The detailed product and implementation baseline is in [spec.md](./spec.md), the Phase 0 audit is in [phase-0.md](./phase-0.md), and the Phase 1 execution record is in [phase-1.md](./phase-1.md). Phase 1 implementation is in progress.

## Current scope

- Product: one Ganatri POS mobile app for retail and restaurant Stores.
- First platform: Android only.
- Minimum platform: Android 8/API 26+.
- Interface languages: English, Gujarati, and Hindi.
- Printed invoice language: English only.
- Connectivity: online-first; offline billing is deferred.
- Styling: Uniwind with semantic design tokens.
- Localization: `i18next` and `react-i18next`.
- Local persistence: MMKV only, with encrypted session storage and Android Keystore-backed key handling to be validated during implementation.
- API approach: reuse existing shared POS services and types before proposing backend changes.

## Status meanings

- `Completed`: planning or review work is finished.
- `Completed with follow-up`: the planned audit is complete, but named implementation or human-validation items remain.
- `Approved`: the product direction is accepted; implementation has not started.
- `In progress`: the current planning or implementation work is active.
- `Not started`: planned but not begun.
- `Deferred`: intentionally moved to a later phase or implementation-time validation.
- `Blocked`: cannot proceed until a named dependency changes.

## Overall status

| Area | Status | Notes |
| --- | --- | --- |
| Product scope | Approved | Shared retail/restaurant app and feature boundaries are agreed. |
| Core UX flow | Approved | POS Unlock → New Sale → Cart Review → Payment → Sale Complete. |
| Supporting screens | Approved | Bills, Customers, Reports, Settings, and conditional Tables. |
| UI system | Approved | Uniwind, internal POS components, semantic tokens, and approved touch/typography rules. |
| Storage | Approved | MMKV-only; encryption and key handling require implementation validation. |
| Localization | Approved | `i18next` + `react-i18next`; English, Gujarati, Hindi interface. |
| Barcode scanning | Approved | Android phone camera for V1; external scanners deferred. |
| Platform | Approved | Android 8/API 26+; iPhone deferred. |
| API reuse strategy | Approved | Existing shared services/types first; Draft-commit idempotency is now implemented and focused-tested. |
| Mobile POS implementation | In progress | Phase 1.1 POS application boundary is implemented; session, storage, localization, and feature screens remain. |
| Printer hardware | Deferred | Model, paper width, and protocol are selected during printer implementation. |

## Phase roadmap

| Phase | Goal | Subphases | Status | Exit condition |
| --- | --- | --- | --- | --- |
| 0. Planning and validation | Remove product, API, dependency, and device uncertainty. | 0.1–0.4 | Completed with follow-up | Scope and API/dependency findings are documented; exact physical devices and integration/release verification remain follow-ups. |
| 1. POS foundation | Establish the Android POS shell, session lifecycle, storage, localization, and UI system. | 1.1–1.8 | In progress | Store Device unlock reaches New Sale with Cart access. |
| 2. Catalog and Product selection | Make Products searchable, scannable, configurable, and easy to add. | 2.1–2.5 | Not started | Product selection reliably adds the intended Product to Cart. |
| 3. Cart and Draft Sale | Make Cart review and Draft Sale recovery safe and responsive. | 3.1–3.6 | Not started | Cart can be reviewed, saved, resumed, and discarded safely. |
| 4. Payment and Sale completion | Complete Sales with clear Payment status and receipt access. | 4.1–4.5 | Not started | Confirmed Sale reaches Sale Complete without duplicate submission. |
| 5. Bills and supporting workspaces | Add post-Sale operations and simple management screens. | 5.1–5.5 | Not started | Bills, Customers, Reports, and Settings work for the active Store. |
| 6. Bluetooth printing | Validate hardware and print English-only receipts reliably. | 6.1–6.3 | Deferred until implementation | Supported Android device can print and retry without Sale rollback. |
| 7. Restaurant operations | Add capability-gated service modes, Tables, and KOT. | 7.1–7.4 | Later phase | Enabled restaurant Store can use its approved operational workflow. |
| 8. Hardening and release | Complete tests, recovery, security, device, and release checks. | 8.1–8.4 | Not started | Android release passes the complete release checklist. |

## Small-slice progress

### Phase 0 — Planning and technical validation

| Slice | Status | Dependency / exit condition |
| --- | --- | --- |
| 0.1 Scope and decision baseline | Completed | Detailed spec records approved product behavior and exclusions. |
| 0.2 Shared API contract audit | Completed | Existing coverage is sufficient; Draft commit now persists and replays a completion request ID. |
| 0.3 Native dependency feasibility | Completed with follow-up | MMKV, i18next, Uniwind, and camera approach are compatible/plannable; native encryption and physical camera validation remain implementation gates. |
| 0.4 Android verification matrix | Partially complete | Test categories and minimum checks are documented; exact physical Android and printer devices remain to be selected. |

## Phase 0 findings and required fixes

The detailed evidence is recorded in [phase-0.md](./phase-0.md). The key outcomes are:

- Existing shared POS services and types cover Device authentication, Catalog, Customers, Draft Sales, Sales, Payments, Bills, Reports, restaurant operations, and focused WhatsApp invoice actions.
- Direct new-Sale checkout already supports server replay by `requestId`.
- Draft Sale commit now requires a completion request key, persists it on the completed Sale, replays the same Sale on retry, and rejects reuse for another Sale. Focused billing tests cover these behaviors.
- The current mobile app still uses generic user authentication and `expo-secure-store`; Phase 1 must replace that with the approved POS Device Session boundary and encrypted MMKV storage.
- `i18next`/`react-i18next`, mobile tests, and camera scanning are planned dependencies/workstreams that are not installed or validated yet.
- The exact physical Android Store Device and Bluetooth printer remain pending selection. Printer hardware remains deferred to Phase 6.

### Required fixes before later phases

| Fix / decision | Target | Status |
| --- | --- | --- |
| POS-specific Device Session boot, unlock, expiry, and logout boundary | Phase 1 | Planned |
| MMKV-only encrypted storage with Android Keystore-backed key strategy | Phase 1 | Planned |
| `i18next` + `react-i18next` resources, fallback, and persistence | Phase 1 | Planned |
| Focused mobile test harness and service-contract tests | Phase 1 | Planned |
| Draft commit retry/idempotency behavior | Before Phase 4 | Implemented and focused-tested |
| Camera dependency, permissions, and physical-device scan validation | Phase 2 | Planned |
| Exact emulator, modern phone, and Store Device selection | Phase 0/8 | Pending input |

Mobile POS implementation has started with the Phase 1.1 application boundary. The Draft commit idempotency follow-up remains complete, while the POS session, storage, localization, visual foundation, and feature screens are still pending.

### Phase 1 — POS foundation

| Slice | Status | Dependency / exit condition |
| --- | --- | --- |
| 1.1 Mobile POS application boundary | Completed | Authenticated mobile flow now enters a POS-owned nested navigator and POS shell instead of the generic Dashboard. |
| 1.2 MMKV storage boundary | Completed with follow-up | MMKV-only session, preference, and convenience boundaries are implemented and focused-tested; native Android/device validation remains pending. |
| 1.3 Localization foundation | Completed | English, Gujarati, and Hindi bundles, namespaces, English fallback, persistence, and focused tests are in place; device layout remains a follow-up. |
| 1.4 Uniwind design foundation | Completed | Semantic light/dark tokens and small POS primitives are implemented and focused-tested; device visual validation remains a follow-up. |
| 1.5 POS session state | Not started | Starting, Locked, Unlocking, Active, Expired/Revoked, and Logging Out states are covered. |
| 1.6 POS Unlock screen | Not started | Store Device authentication works with validation and recovery states. |
| 1.7 POS navigation shell | Not started | Shared and capability-gated destinations are reachable. |
| 1.8 New Sale shell | Not started | Successful Unlock opens New Sale with Cart entry. |

### Phase 2 — Catalog and Product selection

| Slice | Status | Dependency / exit condition |
| --- | --- | --- |
| 2.1 Catalog query and cache | Not started | Store-scoped Product and Category data loads with retry states. |
| 2.2 Product search and Categories | Not started | Products can be browsed and added directly to Cart. |
| 2.3 Camera barcode scanning | Not started | Android camera scan, permission, unknown-barcode, and fallback states work. |
| 2.4 Recent and Pinned Products | Not started | Local convenience actions do not replace server Catalog authority. |
| 2.5 Combos and Add-ons | Not started | Required Product configuration is preserved in Cart and Draft Sale data. |

### Phase 3 — Cart and Draft Sale

| Slice | Status | Dependency / exit condition |
| --- | --- | --- |
| 3.1 Local Cart state | Not started | Add, remove, quantity, and immediate display totals work locally. |
| 3.2 Cart Review screen | Not started | Product lines, totals, and Continue to Payment work. |
| 3.3 Customer picker and Walk-in | Not started | Walk-in default and optional name/phone selection work. |
| 3.4 Quick Customer creation | Not started | Name/phone creation returns to the active Cart safely. |
| 3.5 Discounts | Not started | Amount/percentage discounts validate and update totals. |
| 3.6 Server Draft Sale persistence | Not started | Hybrid local/server Draft behavior, resume, delete, and retry are verified. |

### Phase 4 — Payment and Sale completion

| Slice | Status | Dependency / exit condition |
| --- | --- | --- |
| 4.1 Payment entry | Not started | Cash, UPI, Card, and optional multiple Payment rows work. |
| 4.2 Payment status | Not started | Paid, Partial, and Due display follows server authority. |
| 4.3 Checkout adapter | Not started | Direct, Draft commit, later collection, Table checkout, and controlled retry paths are separated. |
| 4.4 Sale Complete screen | Not started | Confirmed Sale result and New Sale action work. |
| 4.5 Digital receipts and sharing | Not started | Receipt display/share failures do not affect the Sale. |

### Phase 5 — Bills and supporting workspaces

| Slice | Status | Dependency / exit condition |
| --- | --- | --- |
| 5.1 Bills list and filters | Not started | Today's Sales, search, and simple filters work. |
| 5.2 Sale Details and Draft recovery | Not started | Details, resume/delete, and receipt actions work. |
| 5.3 Customer Directory | Not started | Search, filters, details, add, edit, and Sales history work. |
| 5.4 Reports | Not started | Read-only Today summary and Products Sold work. |
| 5.5 Settings and Appearance | Not started | Language, theme, display size, printer entry, and Logout work. |

### Phase 6 — Bluetooth printing

| Slice | Status | Dependency / exit condition |
| --- | --- | --- |
| 6.1 Hardware validation | Deferred | Select and validate target Android printer during implementation. |
| 6.2 Printer adapter | Not started | Discovery, connection, test, reconnect, disconnect, and error states work. |
| 6.3 Print actions | Not started | English-only invoice printing works from Sale Complete and Sale Details without Sale rollback. |

### Phase 7 — Restaurant operations

| Slice | Status | Dependency / exit condition |
| --- | --- | --- |
| 7.1 Service modes | Not started | Dine-In/Pick-Up are capability-gated and preserved through billing. |
| 7.2 Tables | Approved for planning | Implementation follows the shared Sale flow and Store capability. |
| 7.3 Table orders | Not started | Start/reopen/checkout behavior avoids duplicate active orders. |
| 7.4 KOT and kitchen completion | Deferred | Later restaurant phase; KOT remains separate from Sale and Payment. |

### Phase 8 — Hardening and release readiness

| Slice | Status | Dependency / exit condition |
| --- | --- | --- |
| 8.1 Focused tests | Not started | Logic, component, service-contract, and localization tests pass. |
| 8.2 Real-device workflow | Not started | Complete retail flow passes on the Android device matrix. |
| 8.3 Security and recovery review | Not started | MMKV encryption, key handling, session cleanup, cache isolation, and duplicate protection pass review. |
| 8.4 Release checklist | Not started | Android 8+, languages, English print, printer validation, and exclusions are verified. |

## Approved decisions log

- One mobile POS app supports both retail and restaurant Stores.
- Any authorized person with Store Device access may use the POS; owner/cashier role assumptions are not added.
- Simple UX is the primary product rule.
- Android-only first release, minimum Android 8/API 26+.
- Mobile interface supports English, Gujarati, and Hindi.
- Printed Bluetooth invoices use an English-only template.
- Offline billing and synchronization are excluded from Version 1.
- POS WhatsApp Conversation Inbox is excluded; focused WhatsApp invoice delivery remains available when configured.
- Uniwind is the approved styling and design-token foundation.
- Internal POS components are preferred over a large UI component framework.
- MMKV-only local persistence is approved; encrypted session storage and Android Keystore key handling require validation.
- `i18next` and `react-i18next` are approved for localization.
- Phone-camera barcode scanning is approved; external Bluetooth scanners are deferred.
- Existing shared POS services and types are the first API boundary.
- Hybrid local Cart/server Draft Sale persistence is approved.
- Checkout operations are separated by Sale situation.
- POS session lifecycle is approved.
- Bun tests, focused mobile tests, and real Android smoke tests are approved.
- Tables are approved as a capability-gated restaurant workspace.

## Current next step

Execute Phase 1 subphase 1.5 using the lifecycle recorded in [phase-1.md](./phase-1.md). Backend integration and real-database concurrency verification remain release checks. Native Android and physical-device validation must be reported separately from static checks.
