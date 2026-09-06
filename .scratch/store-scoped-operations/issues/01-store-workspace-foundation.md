# 01 — Store workspace foundation

**What to build:** An administrator can choose a Store and enter a URL-backed Store workspace that is visibly distinct from the Organization workspace. The selected Store becomes explicit context for subsequent Store operations, while the Organization workspace remains available for shared setup and all-Store views.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] An Organization administrator can select any Store belonging to the current Organization and reach a refresh-safe Store workspace URL.
- [ ] The application clearly identifies the selected Store and provides a way to return to the Organization workspace or choose another Store.
- [ ] Store context cannot name a Store from another Organization, and navigation visibility is not used as the only authorization check.
- [ ] Existing Organization-level routes and workflows retain their current behavior.
