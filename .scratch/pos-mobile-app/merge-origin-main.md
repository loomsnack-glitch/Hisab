# POS Mobile App — origin/main Compatibility Sync

This record plans the controlled sync of `origin/main` into
`feat/pos-mobile-app` before Phase 8 hardening. It follows the phase-loop
lifecycle and the validation safety rule in `AGENTS.md`.

## Snapshot reviewed

- Branch: `feat/pos-mobile-app`
- Fetched target: `origin/main` at `18b9ed5`
- Mainline commits ahead: 45
- Merge base: `d9faeb40b8059cd8ad9ddb9ef0ef291903b2159a`
- Worktree was clean before the review.

## Mainline changes relevant to POS

1. Product selling units and custom quantities are now part of Product, Sale
   Item, KOT, and reporting contracts. Product data includes Unit identity,
   Default Selling Quantity, Custom Selling Quantity eligibility, and Unit
   label.
2. Store Product Offerings now own Store-specific price, discount, and
   sellability. POS product discovery and server billing use the authenticated
   Store offering rather than Organization-only Product pricing.
3. Commercial Feature Entitlements now guard billing, KOT, Tables, Reports,
   and other operational capabilities. Client visibility is not the authority.
4. The web `apps/pos` application has a newer printer/settings and selling-unit
   flow. It is a separate web runtime and does not replace the Android native
   printer seam in this mobile branch.
5. Mainline removes the old mobile POS implementation and its planning docs,
   reverting `apps/mobile` to generic user authentication with SecureStore.
   That conflicts with the approved mobile POS Device Session, MMKV-only
   persistence, i18next, Uniwind POS shell, and completed Phase 1–7 work.
6. Mainline removes the draft-request idempotency schema/migration and the
   `CommitSale` request field. The mobile branch currently depends on stable
   Draft-create and Draft-commit retry protection, so this is a shared-contract
   conflict rather than a safe client-only update.
7. Mainline removes the obsolete POS WhatsApp account-connect endpoint. The
   mobile POS branch does not call that endpoint, so the removal should remain.

## Merge policy

- Merge `origin/main` as a controlled history sync, preserving the approved
  mobile POS app and its Phase 0–7 records when mainline presents
  modify/delete conflicts.
- Preserve the current `AGENTS.md` validation-safety rule and local
  `.agents/skills/phase-loop/SKILL.md`; mainline deletes both.
- Accept mainline’s unrelated admin, web POS, commercial licensing, Store
  Offering, selling-unit, vendor, and migration work.
- Reconcile shared backend/type conflicts to keep both mainline selling-unit /
  Store Offering / entitlement behavior and the mobile branch’s approved
  Draft retry/idempotency behavior. Do not silently drop duplicate protection.
- Keep the web printer implementation in `apps/pos`; keep the mobile
  `GanatriBluetoothPrinter` injectable native boundary until a real Android
  module and target printer are selected.
- Do not adopt mainline’s generic mobile auth, SecureStore, or removal of POS
  localization/navigation. MMKV, i18next, and POS Device Session remain the
  mobile decisions.

## Execution subphases

### M.1 — Controlled merge and conflict classification

- Merge `origin/main` without running a build or device command.
- Resolve predictable modify/delete conflicts by preserving the approved
  mobile POS and planning artifacts.
- Keep mainline changes in shared packages and non-mobile applications.
- Record every remaining conflict by boundary before editing it.

Exit condition: the repository has one coherent merged tree, with no unresolved
conflicts and the mobile POS entrypoint still present.

#### M.1 result

- `origin/main` was merged without builds, Android commands, emulator commands,
  device-start commands, live API checks, or hardware checks.
- The only textual conflicts were the admin billing page, web POS billing page,
  shared backend billing service, and `bun.lock`.
- The billing-page conflicts retain mainline's resolved checkout customer ID
  flow and this branch's completion request ID. The backend conflict retains
  both mainline billing entitlement enforcement and this branch's draft and
  completion replay protection.
- The approved native mobile POS entrypoint, MMKV/i18next dependencies, agent
  instructions, phase-loop skill, and Phase 0–7 records remain present.
- Mainline's commercial licensing, Store Product Offering, product selling-unit,
  KOT, reporting, vendor, and WhatsApp retirement changes are present.

M.1 exit review: no unresolved merge entries or conflict markers remain. The
merge checkpoint is committed as `23c377c`; M.2 owns shared-contract
compatibility review.

### M.2 — Shared contract reconciliation

- Reconcile Product/Sale Item/KOT types with selling-unit fields and
  `soldQuantity` while preserving mobile mapping safety.
- Reconcile Store Offering and entitlement-enforced server behavior with the
  mobile capability-gated UI; API denial remains authoritative and retryable.
- Restore or preserve Draft-create and Draft-commit idempotency fields and
  backend persistence alongside mainline billing preparation changes, or
  explicitly document a contract blocker if the merge proves incompatible.
- Keep the removed WhatsApp connect endpoint removed.

Exit condition: shared types/services/backend code typecheck at the changed
boundaries and mobile payloads match the merged server contracts.

#### M.2 result

- The merged `@repo/types` contracts retain `draftRequestId`, completion
  `requestId`, and the new Product/Sale Item/KOT selling-unit fields.
- Backend billing retains mainline Store Product Offering price lookup and
  billing entitlement checks while preserving Draft-create and Draft-commit
  replay protection. Mainline's removed draft migration was not adopted on
  this branch because the approved mobile retry contract still uses it.
- Mainline's KOT, Tables, reporting, and commercial-entitlement behavior is
  retained. The obsolete WhatsApp account-connect endpoint remains removed.
- Mobile catalog denial now has a typed boundary and localized English,
  Gujarati, and Hindi presentation; the server response remains authoritative.

M.2 exit review: focused backend/type tests pass and no client price override
was introduced. M.3 owns the mobile selling-unit/cart compatibility surface.

### M.3 — Mobile POS compatibility update

- Update the mobile Catalog/Cart/KOT/receipt surfaces for the merged Product
  selling-unit contract, including default sold portions and eligible custom
  quantities where the mainline contract requires them.
- Preserve the Phase 7 Table/KOT/payment separation and add clear handling for
  server commercial-access denial.
- Ensure Store Offering prices remain server-authoritative; never add client
  price overrides.

Exit condition: focused mobile tests cover the merged fields and all approved
Phase 1–7 flows remain represented.

#### M.3 result

- Mobile Cart lines retain Unit metadata and a `soldQuantity`; ordinary taps
  use the server Product Default Selling Quantity, while eligible single
  Products can edit a positive amount with at most two decimal places.
- Display totals and the shown portion price scale the Product catalog values
  proportionally for immediate UX feedback; add-ons remain priced per parent
  portion and final totals remain server-confirmed.
- Draft, direct checkout, Table KOT, and Draft recovery payloads carry the
  sold amount. Different sold amounts remain separate Cart lines and equal
  portions merge safely.
- Focused mobile coverage includes custom quantity behavior, payload mapping,
  localized catalog denial, and the existing Phase 1–7 flow boundaries.

M.3 exit review: mobile tests pass with 112 tests and no failures. The only
typecheck report is the pre-existing missing `@repo/assets/services/whatsapp.webp`
module in `apps/mobile/src/screens/login-screen.tsx`.

### M.4 — Final sync review and commit

- Review the full sync on Standards and Spec axes.
- Run only focused tests, targeted TypeScript feedback, and `git diff --check`.
- Do not run build, Expo, Android/emulator, device-start, live API, or hardware
  commands while Phase 8 remains incomplete.
- Update this record and the main status tracker, then commit the sync as one
  focused merge/compatibility checkpoint.

## Internal plan review

The plan preserves the explicit mobile product decisions while accepting
mainline’s server-side Store isolation, selling-unit, and commercial-access
work. The highest-risk item is the removed Draft idempotency contract; it must
be resolved from the shared backend/type boundary rather than hidden in the
mobile client. No new product decision is required for this sync.

### M.4 — Final sync review and closeout

Standards review found the sync remains scoped: shared billing authority stays
on the server, client payloads do not send trusted prices, the web printer and
native Bluetooth seam remain separate, and the approved MMKV/i18next POS
runtime was not replaced by mainline's generic SecureStore app. Spec review
found the mainline selling-unit, Store Offering, entitlement, KOT, Tables, and
reporting behavior retained while the approved Draft retry contract remains
available.

Validation completed:

- Mobile focused suite: 112 passed, 0 failed.
- Merged backend/type boundary suite: 85 passed, 0 failed.
- `git diff --check`: passed.
- Targeted mobile TypeScript feedback reports only the pre-existing missing
  `@repo/assets/services/whatsapp.webp` module in
  `apps/mobile/src/screens/login-screen.tsx`.
- No build, Expo, Android/emulator, device-start, live API, migration-run, or
  printer-hardware command was run.

The merge checkpoint is `23c377c` and the compatibility update is `65de6a5`.
The worktree is clean after the closeout documentation commit. Remaining gates
belong to Phase 8: Android/device verification, native Bluetooth transport and
physical printer validation, live API/database migration verification, and the
existing asset/typecheck baseline fix.

Status: complete; Phase 8 hardening is next.
