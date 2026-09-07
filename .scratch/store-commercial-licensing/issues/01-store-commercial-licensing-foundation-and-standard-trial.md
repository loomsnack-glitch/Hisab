# 01 — Store Commercial Licensing foundation and standard Trial

**What to build:** An Organization administrator can open a Store's commercial status, start the standard Trial Plan exactly once for a newly created Store, and see its resulting current Feature Entitlement. The Store commercial model has a single authoritative Feature Entitlement resolver that represents active commercial access sources without relying on mutable catalog state.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Starting the standard Trial Plan once for a newly created Store creates immediately active, Asia/Kolkata-timed access using the selected Commercial Catalog Revision snapshots.
- [x] A repeat self-service trial for the same Store is rejected, while other newly created Stores remain independently eligible.
- [x] Ganatri Admin presents current commercial status and the server can resolve the Store's current Feature Entitlement with evidence from active access sources.
- [x] Service, route, and Admin behavior tests cover trial eligibility, term timing, authorization, status visibility, and entitlement resolution.

## Answer

Organization administrators can now open a Store License page, start the standard Trial Plan once per Store, and see the resulting Feature Entitlement. Access is snapshotted from the active Trial Plan revision and timed with the Asia/Kolkata Commercial Term Clock. Repeat self-service trials are rejected; other Stores stay independently eligible. Feature Entitlement is resolved from active access-source snapshots rather than live catalog state.
