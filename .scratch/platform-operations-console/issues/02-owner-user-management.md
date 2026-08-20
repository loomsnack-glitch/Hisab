# 02 — Owner User management

**What to build:** Let active Owner Users safely manage the small internal Ganatri access roster from Ganatri Console. They can view Console Users, create additional active Owner Users, and activate or deactivate another Owner User without gaining any tenant-data write authority.

**Blocked by:** 01 — Platform Owner authentication and console entry.

**Status:** ready-for-agent

- [ ] An authenticated Owner User can open a Console Users destination and see each Owner User's identity and active status.
- [ ] An active Owner User can create another Owner User with the required name, WhatsApp-enabled phone number, and initial password; duplicates are rejected safely.
- [ ] An active Owner User can activate or deactivate another Owner User, and the status change affects that person's existing session on its next request.
- [ ] The service rejects self-deactivation and any action that would leave no active Owner User.
- [ ] Owner management remains limited to Owner Users and never exposes tenant mutation controls.
- [ ] Tests demonstrate all allowed and forbidden management behaviors through the owner-authenticated boundary and visible console controls.
