# 09 — WhatsApp safe-metadata inspection

**What to build:** Add a read-only WhatsApp section that lets a Platform Administrator inspect each Organization's connection state and Console-Safe Operational Metadata without creating a credential-recovery or messaging path.

**Blocked by:** 01 — Inspection route shell and organization overview.

**Status:** ready-for-agent

- [ ] An active Owner User can inspect Organization WhatsApp connection and safe configuration status from an Inspection URL.
- [ ] The read model excludes WhatsApp/API credentials, tokens, passwords, and every equivalent reusable secret even when the underlying tenant configuration contains them.
- [ ] Authorization and negative serialization tests prove non-owner access is rejected and Console shows no credential reveal, account-management, template, campaign, or message-sending action.

