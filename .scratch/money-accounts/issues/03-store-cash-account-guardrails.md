# 03 — Manage the Store Cash Account

**What to build:** Organization administrators can configure the one active Store Cash Account that represents all physical cash held at a Store. Cash configuration uses the same Money Accounts experience while enforcing the Store-level rule needed for future POS cash collection and daily closing work.

**Blocked by:** 02 — Manage Store-Scoped Money Accounts

**Status:** ready-for-agent

- [x] An Organization administrator can create and edit a Cash Money Account only as a Store-scoped account, with a valid Store from their Organization.
- [x] The Money Accounts experience clearly identifies a Store Cash Account as Cash and shows its Store alongside the existing descriptive fields and status.
- [x] The system permits at most one active Cash Money Account for each Store, including under concurrent or repeated create/update requests.
- [x] The administrator can deactivate a Store's active Cash Money Account and then activate or create its replacement; inactive Cash accounts remain visible through status filtering and cannot be permanently deleted.
- [x] Organization-Wide Cash accounts, Cash accounts without a Store, cross-Organization Store assignment, and a second active Cash account for the same Store are rejected with clear validation behaviour.
- [x] End-to-end tests cover the Cash-specific contracts, authorization and isolation, persistence constraints, Admin validation and status transitions, while verifying that existing POS Payment Methods and billing flows remain unchanged.

