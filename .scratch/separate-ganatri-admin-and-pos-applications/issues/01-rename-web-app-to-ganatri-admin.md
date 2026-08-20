# 01 — Rename the customer web app to Ganatri Admin

**What to build:** Move the existing customer-facing application into its Ganatri Admin identity without changing the behavior available to Organization administrators. This is the safe mechanical foundation for the later POS extraction: Admin continues to build, run, authenticate Organization Users, and expose its current routes while the current embedded POS behavior remains temporarily intact.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Ganatri Admin is a first-class Turbo application with independent development, build, lint, type-check, and test commands.
- [ ] Existing Organization User authentication, Organization-management workflows, and read-only billing inspection continue to work unchanged.
- [ ] Existing embedded POS behavior remains available only as a temporary migration state, so this refactor lands with a green application.
- [ ] Application identity and version metadata identify the application as Ganatri Admin without changing Ganatri Console.

