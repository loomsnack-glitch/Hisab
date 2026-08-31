# 01 — Store Activation and Opening Balances

**What to build:** Add the disabled-by-default Money Account Tracking Store feature and make each Money Account capable of one non-negative Opening Balance. Use the existing Store Features configuration seam, but place availability behind a server-side entitlement seam that allows use today and can be replaced by subscription entitlement later.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Organization administrators can see and change Money Account Tracking for each Store; new and existing Stores default to disabled.
- [x] The backend treats tracking as active only when the Store setting and the current availability seam both permit it; disabled/unavailable Stores continue ordinary POS behavior.
- [x] An administrator can set or change an account's non-negative Opening Balance while it has no Movements; omitted is zero.
- [x] The Money Account list/detail contracts expose Opening Balance and calculated Balance, initially equal; no direct current-balance write exists.
- [x] After its first Movement, a Money Account rejects edits to Type, scope, Store assignment, and Opening Balance, while allowing name, notes, and active status changes.
- [x] Shared contracts, persistence migration, Organization-admin authorization, Store DTO/session propagation, and Admin feature/balance behavior have focused tests.

