# 03 — Paid Plan checkout and verified fulfilment

**What to build:** An Organization administrator can choose an eligible paid Plan for a Store, review an immutable 30-minute Commercial Quote, pay a server-created Razorpay Order, and receive access only when a verified `order.paid` webhook fulfils that exact Quote. A payment during a trial becomes a Scheduled Store License that begins at trial end.

**Blocked by:** 01 — Store Commercial Licensing foundation and standard Trial.

**Status:** ready-for-agent

- [ ] Ganatri Admin displays an exact final GST-inclusive Plan quote, creates a server-approved Razorpay Order, and shows pending confirmation rather than trusting browser success.
- [ ] Raw-body signature verification, Razorpay event-id idempotency, amount/currency/order matching, and `order.paid`-only fulfilment create one correct active or scheduled Store License.
- [ ] Failed, duplicate, late, tampered, or expired-Quote payment attempts never create duplicate or premature access and remain auditable.
- [ ] Tests cover Quote expiry, webhook retries and reordering, trial-to-paid scheduling, payment history, and the Admin checkout experience with the Razorpay adapter isolated.
