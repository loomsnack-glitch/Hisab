# 04 — Safe matching and resilient delivery

**What to build:** Google Contacts Synchronization safely handles real-world Contact data and delivery failures: it preserves client-owned Google data, surfaces ambiguous matches, repairs only Ganatri-owned fields, and recovers reliably from transient failure.

**Blocked by:** 02 — Initial Google Contacts catch-up sync; 03 — Automatic Customer change synchronization.

**Status:** ready-for-agent

- [ ] Updating a Google Contact preserves its extra phone numbers and every unrelated Google field while changing only the name and linked/matching phone entry.
- [ ] More than one exact phone match, or a phone collision after a Customer phone change, becomes a visible conflict and modifies no Google Contact.
- [ ] A manually deleted linked Google Contact is recreated by the next eligible synchronization; Google-side edits to Ganatri-owned fields are repaired without importing Google data into Ganatri.
- [ ] The worker uses current Google contact metadata, safely handles concurrent Google edits, applies bounded retry/backoff for transient/rate-limit failures, and recovers expired worker leases.
- [ ] Retryable, permanent, reconnect-required, and conflict outcomes are distinguishable in Google Contacts Sync Status, with focused behavior and no-deletion regression tests.
