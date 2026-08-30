# 02 — Initial Google Contacts catch-up sync

**What to build:** After connecting Google, an Admin user can run one initial catch-up sync that sends every eligible Customer to a dedicated Google Contacts worker. The worker creates missing Contacts or updates exactly one phone-number match, without deleting Google Contacts.

**Blocked by:** 01 — Google account connection and status card.

**Status:** ready-for-agent

- [ ] The connected Organization can request an initial sync, which schedules all Customers with valid normalized phone numbers and visibly reports that work as pending/completed.
- [ ] A dedicated persistent Google Contacts Sync Outbox and worker process the work independently of the request and independently of WhatsApp delivery.
- [ ] A no-match Customer creates a Google Contact; exactly one exact normalized phone match updates its name and matching phone entry from Ganatri and records a per-connection linkage.
- [ ] Google lookup results are validated by exact normalized phone equality rather than name or prefix-match search alone.
- [ ] Customers without a phone are skipped, no Google delete operation is ever issued, and focused worker/integration tests prove initial-sync outcomes.
