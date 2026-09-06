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

Status: planned; M.1 is next.
