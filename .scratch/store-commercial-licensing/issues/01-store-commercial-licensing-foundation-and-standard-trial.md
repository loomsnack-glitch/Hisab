# 01 — Store Commercial Licensing foundation and standard Trial

**What to build:** An Organization administrator can open a Store's commercial status, start the standard Trial Plan exactly once for a newly created Store, and see its resulting current Feature Entitlement. The Store commercial model has a single authoritative Feature Entitlement resolver that represents active commercial access sources without relying on mutable catalog state.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Starting the standard Trial Plan once for a newly created Store creates immediately active, Asia/Kolkata-timed access using the selected Commercial Catalog Revision snapshots.
- [ ] A repeat self-service trial for the same Store is rejected, while other newly created Stores remain independently eligible.
- [ ] Ganatri Admin presents current commercial status and the server can resolve the Store's current Feature Entitlement with evidence from active access sources.
- [ ] Service, route, and Admin behavior tests cover trial eligibility, term timing, authorization, status visibility, and entitlement resolution.
