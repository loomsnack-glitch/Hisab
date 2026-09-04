# 02 — Legacy Store migration grants

**What to build:** On commercial enforcement launch, every Store that already exists receives a visible, complimentary 30-day Store Access Grant for all current Modules. This preserves operations during the transition without creating a permanent bypass.

**Blocked by:** 01 — Store Commercial Licensing foundation and standard Trial.

**Status:** ready-for-agent

- [ ] The launch migration identifies pre-existing Stores exactly once and gives each one an all-current-Modules Store Access Grant ending 30 days after enforcement launch.
- [ ] New Stores never receive this migration grant and use the standard Trial Plan path instead.
- [ ] Ganatri Admin and Ganatri Console inspection make the grant's source, Features, and expiry understandable.
- [ ] Migration, idempotency, timestamp, Store-isolation, and user-visible status behavior are covered by tests.
