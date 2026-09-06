# 02 — Legacy Store migration grants

**What to build:** On commercial enforcement launch, every Store that already exists receives a visible, complimentary 30-day Store Access Grant for all current Modules. This preserves operations during the transition without creating a permanent bypass.

**Blocked by:** 01 — Store Commercial Licensing foundation and standard Trial.

**Status:** resolved

- [x] The launch migration identifies pre-existing Stores exactly once and gives each one an all-current-Modules Store Access Grant ending 30 days after enforcement launch.
- [x] New Stores never receive this migration grant and use the standard Trial Plan path instead.
- [x] Ganatri Admin and Ganatri Console inspection make the grant's source, Features, and expiry understandable.
- [x] Migration, idempotency, timestamp, Store-isolation, and user-visible status behavior are covered by tests.

## Answer

Enforcement launch records one Asia/Kolkata timestamp and grants every Store that already existed a complimentary 30-day `legacy_migration` Store Access Grant covering all currently active Modules. The grant is unique per Store, retries are idempotent, and Stores created after launch stay on the standard Trial Plan path. Admin and Console status show the distinct "Legacy migration grant" label, Features, and expiry through Feature Entitlement rather than a permanent bypass.
