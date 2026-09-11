# 06 — Ship audited central multi-store catalog operations

**What to build:** Organization administrators can preview and confirm selected-Store commercial changes for Products and Add-Ons, including setting, replacing, or clearing Store Commercial Overrides and Store-local statuses, with durable audit history and no silent destruction of local decisions.

**Blocked by:** 02 — Ship central Product defaults and Store override workflow; 04 — Ship Store Add-On Offerings.

**Status:** ready-for-agent

- [ ] An Organization administrator can select catalog entries and Stores, choose a supported local commercial operation, and view exact before/after effective values and inheritance/override states before saving.
- [ ] Operations that replace or clear Store Commercial Overrides require explicit confirmation and affect only the selected Organization-scoped Stores and catalog entries.
- [ ] Normal Organization default edits remain distinct from multi-store local operations and never write or replace overrides.
- [ ] Each completed multi-store operation retains actor, timestamp, operation type, scope, and before/after values; corrections are new audited operations rather than hidden rollback.
- [ ] End-to-end tests cover previews, confirmation, invalid price/discount rejection, cross-Organization rejection, audit records, and protected overrides.

