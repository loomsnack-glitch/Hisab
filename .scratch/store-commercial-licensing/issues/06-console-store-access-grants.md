# 06 — Console Store Access Grants

**What to build:** A Platform Administrator can inspect an Organization's Store commercial state and provide a time-bounded seven-day, extended, complimentary, or custom-range Plan or Module Store Access Grant without changing the Commercial Catalog or paid history.

**Blocked by:** 01 — Store Commercial Licensing foundation and standard Trial.

**Status:** resolved

- [x] Ganatri Console lets an authorized Platform Administrator inspect Store access sources and create an appropriately snapshotted Plan or Module Store Access Grant.
- [x] An active grant adds its Features to the Store's Feature Entitlement and independently ends at its selected Asia/Kolkata timestamp.
- [x] Console remains unable to expose payment credentials or mutate Organization business data while providing this commercial support action.
- [x] Tests cover Console authorization, custom terms, snapshot retention, additive entitlement behavior, expiry, and read-only Organization inspection boundaries.

## Answer

Owner-authenticated Console Store inspection can now read commercial access sources and create administrator Store Access Grants for an active Plan or Module: seven-day, extended, complimentary, or custom-range. Grants snapshot catalog memberships, add Features independently of paid/trial access, and end at the selected Asia/Kolkata timestamp. They stay distinct from the 30-day legacy migration grant and do not expose credentials or mutate Organization business data.
