# 06 — Google Contact Name Affix

**What to build:** An authenticated Ganatri Admin user can set an Organization prefix and/or postfix that Google Contacts Synchronization applies to every exported Google Contact display name, without renaming the Customer in Ganatri.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Ganatri Admin shows prefix and postfix fields on the Google Contacts Sync Status card for a connected Organization, including a name preview.
- [x] Saving a Google Contact Name Affix persists it on the Google Contacts Connection and applies it to new and updated Google Contact writes.
- [x] Saving a changed affix schedules background refreshes for already synchronized eligible Customers; Customer names in Ganatri stay unchanged.
- [x] Focused contract, worker, route, service, and Admin behavior tests prove the observable affix behavior.

## Answer

Ganatri Admin's Google Contacts Sync Status card now has prefix and postfix fields. Saving `@ph` as a postfix writes Google Contact names like `Dev Jariwala @ph` while leaving the Customer name in Ganatri unchanged, and a changed affix refreshes already synchronized Contacts in the background.
